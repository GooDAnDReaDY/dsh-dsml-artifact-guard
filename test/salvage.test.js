// Zero-dependency tests (node:test) for salvageReasoningChannel.
//
// The package declares @deepseek-ai/schemastery as a peer dependency and ships no
// node_modules, so this process resolves that bare specifier to an in-memory stub
// of the surface lib/index.js touches (its Config schema). Nothing else about the
// module graph changes, and no dependency is installed or needed.
//
// test/fixtures/recorded-leak.json is the real leaked stream of an assistant turn
// (session-c375062a-289f-41fa-9c75-e14e72e127ab, event assistant/message step 4,
// data.stream) expanded into plain StreamChunks:
//   zstd -dc <session.v4.jsonl.zstd> | python3 -  (chunk → chunk,
//   text-chunks → text-delta, reasoning-chunks → reasoning-delta,
//   tool-call-chunks → tool-call-delta per args entry)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const SCHEMA_STUB_URL = 'dsh-test-stub:schemastery';
const SCHEMA_STUB = `
function field(fallback) {
  const api = {
    fallback,
    default(value) { api.fallback = value; return api; },
    volatile() { return api; },
    description() { return api; },
    required() { return api; },
    hidden() { return api; },
  };
  return api;
}
function object(shape) {
  const entries = Object.entries(shape ?? {});
  return (value) => {
    const input = value && typeof value === 'object' ? value : {};
    const out = { ...input };
    for (const [key, def] of entries) {
      if (out[key] === undefined && def && def.fallback !== undefined) out[key] = def.fallback;
    }
    return out;
  };
}
export default { object, string: () => field(), boolean: () => field(false), number: () => field(), array: () => field([]) };
`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@deepseek-ai/schemastery') {
      return { url: SCHEMA_STUB_URL, format: 'module', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === SCHEMA_STUB_URL) {
      return { format: 'module', source: SCHEMA_STUB, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const { salvageReasoningChannel, apply } = await import('../lib/index.js');

const recorded = JSON.parse(readFileSync(new URL('./fixtures/recorded-leak.json', import.meta.url), 'utf8'));

async function* replay(chunks) {
  for (const chunk of chunks) yield chunk;
}

async function collect(stream) {
  const out = [];
  for await (const chunk of stream) out.push(chunk);
  return out;
}

// Minimal stand-in for the host assembler: deltas accumulate per index and a
// block-end replaces whatever was accumulated for that index.
function assemble(chunks) {
  const order = [];
  const partials = new Map();
  let finish;
  let usage;
  const ensure = (index, blockType) => {
    let partial = partials.get(index);
    if (!partial) {
      partial = { blockType, text: '', toolCallArguments: '' };
      partials.set(index, partial);
      order.push(index);
    }
    return partial;
  };
  for (const chunk of chunks) {
    switch (chunk.type) {
      case 'block-start':
        ensure(chunk.index, chunk.blockType);
        break;
      case 'text-delta':
      case 'reasoning-delta': {
        const partial = ensure(chunk.index, chunk.type === 'text-delta' ? 'text' : 'reasoning');
        if (!partial.block) partial.text += chunk.text;
        break;
      }
      case 'tool-call-delta': {
        const partial = ensure(chunk.index, 'tool-call');
        if (!partial.block) {
          partial.toolCallId = chunk.id;
          if (chunk.name) partial.toolCallName = chunk.name;
          partial.toolCallArguments += chunk.argumentsDelta;
        }
        break;
      }
      case 'block-end': {
        const partial = ensure(chunk.index, chunk.block.type);
        if (!partial.block) partial.block = chunk.block;
        break;
      }
      case 'usage':
        usage = chunk.usage;
        break;
      case 'finish':
        finish = chunk;
        break;
      default:
        throw new Error(`unexpected chunk type ${chunk.type}`);
    }
  }
  const blocks = order.map((index) => {
    const partial = partials.get(index);
    if (partial.block) return partial.block;
    if (partial.blockType === 'text') return { type: 'text', text: partial.text };
    if (partial.blockType === 'reasoning') return { type: 'reasoning', text: partial.text };
    return { type: 'tool-call', id: partial.toolCallId, name: partial.toolCallName, arguments: partial.toolCallArguments };
  });
  return { blocks, finish, usage };
}

const types = (blocks) => blocks.map((block) => block.type);

test('真实录制流: 3036 字符的 <thinking> 泄漏块迁成 3026 字符 reasoning 块 + tool-call', async () => {
  const before = assemble(recorded);
  assert.deepEqual(types(before.blocks), ['text', 'tool-call']);
  assert.equal(before.blocks[0].text.length, 3036);
  assert.ok(before.blocks[0].text.startsWith('<thinking>'));
  assert.ok('replayState' in before.finish, 'fixture should carry replayState');
  assert.equal(before.blocks[1].id, 'call_470f96a213044f04a5eca2c8');

  const artifacts = [];
  const out = await collect(salvageReasoningChannel(replay(recorded), {
    provider: 'agent2api',
    model: 'deepseek-v4.1-flash',
    onArtifact: (event) => artifacts.push(event),
  }));

  const after = assemble(out);
  assert.deepEqual(types(after.blocks), ['reasoning', 'tool-call'], 'one reasoning block then the tool call, order preserved');
  assert.equal(after.blocks[0].text.length, 3026);
  assert.equal(after.blocks[0].text.length, 3036 - '<thinking>'.length);
  assert.ok(!after.blocks[0].text.includes('<thinking>'), 'open tag stripped from the reasoning text');
  assert.ok(after.blocks[0].text.startsWith('So gpt-5.5'));
  assert.equal(after.blocks[1].id, 'call_470f96a213044f04a5eca2c8');
  assert.equal(after.blocks[1].arguments, before.blocks[1].arguments);

  assert.equal('replayState' in after.finish, false, 'finish must no longer carry replayState');
  assert.deepEqual(after.finish.reason, before.finish.reason);
  assert.equal(after.usage?.outputTokens, before.usage?.outputTokens);

  // The leaked text block is gone rather than left behind empty or closed twice.
  assert.equal(types(after.blocks).includes('text'), false);
  assert.equal(out.some((chunk) => chunk.type === 'block-end' && chunk.index === 0), false);
  assert.equal(out.filter((chunk) => chunk.type === 'tool-call-delta').length, 20);

  assert.equal(artifacts.length, 1);
  assert.deepEqual(artifacts[0], {
    mode: 'sanitize',
    detected: 1,
    removed: 0,
    sample: '<thinking>',
    provider: 'agent2api',
    model: 'deepseek-v4.1-flash',
    type: 'think-salvage',
  });
});

test('干净流逐 chunk 不变: 未命中标签时输出与输入逐 chunk 完全一致且 replayState 保留', async () => {
  const clean = [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: 'A clean answer with no leaked span. ' },
    { type: 'text-delta', index: 0, text: 'It ends on a plain sentence.' },
    { type: 'block-end', index: 0, block: { type: 'text', text: 'A clean answer with no leaked span. It ends on a plain sentence.' } },
    { type: 'usage', usage: { inputTokens: 11, outputTokens: 22, totalTokens: 33 } },
    { type: 'finish', reason: { kind: 'stop' }, replayState: { blocks: [{ kind: 'text' }], response: { kind: 'pi-ai' } } },
  ];
  const artifacts = [];
  const out = await collect(salvageReasoningChannel(replay(clean), { onArtifact: (event) => artifacts.push(event) }));

  assert.equal(out.length, clean.length);
  assert.deepEqual(out, clean);
  assert.deepEqual(out[3].block, clean[3].block, 'original block-end is passed through, not synthesised');
  assert.deepEqual(out[5].replayState, clean[5].replayState);
  assert.equal(artifacts.length, 0);
});

test('跨 chunk: 开标签被切在两个 delta 之间也能切到 reasoning 通道', async () => {
  const chunks = [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: 'Answer first. <thi' },
    { type: 'text-delta', index: 0, text: 'nking>hidden reasoning</thinking>' },
    { type: 'text-delta', index: 0, text: ' then the rest of the answer.' },
    { type: 'block-end', index: 0, block: { type: 'text', text: 'Answer first. <thinking>hidden reasoning</thinking> then the rest of the answer.' } },
    { type: 'finish', reason: { kind: 'stop' }, replayState: { blocks: [] } },
  ];
  const out = await collect(salvageReasoningChannel(replay(chunks)));
  const { blocks } = assemble(out);

  assert.deepEqual(types(blocks), ['text', 'reasoning', 'text']);
  assert.equal(blocks[0].text, 'Answer first. ');
  assert.equal(blocks[1].text, 'hidden reasoning');
  assert.equal(blocks[2].text, ' then the rest of the answer.');
  assert.equal('replayState' in assemble(out).finish, false);
});

test('正文中间夹一段思考: text, reasoning, text 三段按原顺序各自成块', async () => {
  const chunks = [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: 'Opening line. ' },
    { type: 'text-delta', index: 0, text: '<reasoning>' },
    { type: 'text-delta', index: 0, text: 'step one, ' },
    { type: 'text-delta', index: 0, text: 'step two' },
    { type: 'text-delta', index: 0, text: '</reasoning>' },
    { type: 'text-delta', index: 0, text: 'Closing line.' },
    { type: 'block-end', index: 0, block: { type: 'text', text: 'Opening line. <reasoning>step one, step two</reasoning>Closing line.' } },
    { type: 'finish', reason: { kind: 'stop' } },
  ];
  const out = await collect(salvageReasoningChannel(replay(chunks)));
  const { blocks } = assemble(out);

  assert.deepEqual(types(blocks), ['text', 'reasoning', 'text']);
  assert.deepEqual(blocks.map((block) => block.text), ['Opening line. ', 'step one, step two', 'Closing line.']);
  // Every character of the source survives, only the tags are gone.
  const joined = blocks.map((block) => block.text).join('');
  const source = chunks.filter((chunk) => chunk.type === 'text-delta').map((chunk) => chunk.text).join('');
  assert.equal(joined, source.replace('<reasoning>', '').replace('</reasoning>', ''));
  // Synthetic indices stay negative so late adapter indices cannot collide.
  const starts = out.filter((chunk) => chunk.type === 'block-start').map((chunk) => chunk.index);
  assert.deepEqual(starts, [0, -1, -2]);
});

test('未闭合开标签: 只有开标签时整块以 reasoning 块结束', async () => {
  const chunks = [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: '<thinking>Let me check the config first.' },
    { type: 'text-delta', index: 0, text: ' Then answer.' },
    { type: 'block-end', index: 0, block: { type: 'text', text: '<thinking>Let me check the config first. Then answer.' } },
    { type: 'block-start', index: 1, blockType: 'text' },
    { type: 'text-delta', index: 1, text: 'A later block is untouched.' },
    { type: 'block-end', index: 1, block: { type: 'text', text: 'A later block is untouched.' } },
    { type: 'finish', reason: { kind: 'stop' }, replayState: { blocks: [{ kind: 'text' }, { kind: 'text' }] } },
  ];
  const out = await collect(salvageReasoningChannel(replay(chunks)));
  const { blocks, finish } = assemble(out);

  assert.deepEqual(types(blocks), ['reasoning', 'text'], 'no empty text block is left in front of the reasoning block');
  assert.equal(blocks[0].text, 'Let me check the config first. Then answer.');
  assert.equal(blocks[1].text, 'A later block is untouched.');
  assert.deepEqual(out.at(-2), chunks.at(-2), 'the untouched block keeps its own block-end');
  assert.equal('replayState' in finish, false);
});

test('正文杂散尖括号: if a <b and b > c 不误判也不丢字符', async () => {
  const chunks = [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: 'if a <b' },
    { type: 'text-delta', index: 0, text: ' and b > c' },
    { type: 'text-delta', index: 0, text: (', then <notatag> is plain text') },
    { type: 'block-end', index: 0, block: { type: 'text', text: 'if a <b and b > c, then <notatag> is plain text' } },
    { type: 'finish', reason: { kind: 'stop' }, replayState: { blocks: [{ kind: 'text' }] } },
  ];
  const artifacts = [];
  const out = await collect(salvageReasoningChannel(replay(chunks), { onArtifact: (event) => artifacts.push(event) }));
  const { blocks, finish } = assemble(out);

  assert.deepEqual(types(blocks), ['text']);
  assert.equal(blocks[0].text, 'if a <b and b > c, then <notatag> is plain text');
  // A '<' can sit on a delta boundary, so the tail of that delta is held back and
  // the chunks are re-split; no character may be lost or reordered by it.
  const emitted = out.filter((chunk) => chunk.type === 'text-delta').map((chunk) => chunk.text).join('');
  assert.equal(emitted, 'if a <b and b > c, then <notatag> is plain text');
  assert.equal(out.filter((chunk) => chunk.type === 'block-start').length, 1);
  assert.deepEqual(finish.replayState, { blocks: [{ kind: 'text' }] });
  assert.equal(artifacts.length, 0);
});

test('代码围栏: 围栏内的 <thinking> 原样保留，围栏标记被切开也不误判', async () => {
  const fenced = [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: 'Here is the snippet:\n' },
    { type: 'text-delta', index: 0, text: '``' },
    { type: 'text-delta', index: 0, text: '`md\n<thinking>documented tag\n' },
    { type: 'text-delta', index: 0, text: '``' },
    { type: 'text-delta', index: 0, text: '`\nThat is all.' },
    { type: 'block-end', index: 0, block: { type: 'text', text: 'Here is the snippet:\n```md\n<thinking>documented tag\n```\nThat is all.' } },
    { type: 'finish', reason: { kind: 'stop' }, replayState: { blocks: [{ kind: 'text' }] } },
  ];
  const artifacts = [];
  const out = await collect(salvageReasoningChannel(replay(fenced), { onArtifact: (event) => artifacts.push(event) }));
  const { blocks, finish } = assemble(out);
  const source = fenced.filter((chunk) => chunk.type === 'text-delta').map((chunk) => chunk.text).join('');

  assert.deepEqual(types(blocks), ['text'], 'a tag inside a fence is content, not a channel switch');
  assert.equal(blocks[0].text, source);
  assert.equal(artifacts.length, 0);
  assert.deepEqual(finish.replayState, { blocks: [{ kind: 'text' }] });

  const afterFence = [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: '```\n<thinking>still code\n```\n' },
    { type: 'text-delta', index: 0, text: '<thinking>real leak' },
    { type: 'block-end', index: 0, block: { type: 'text', text: '```\n<thinking>still code\n```\n<thinking>real leak' } },
    { type: 'finish', reason: { kind: 'stop' } },
  ];
  const reopened = assemble(await collect(salvageReasoningChannel(replay(afterFence))));
  assert.deepEqual(types(reopened.blocks), ['text', 'reasoning']);
  assert.equal(reopened.blocks[0].text, '```\n<thinking>still code\n```\n');
  assert.equal(reopened.blocks[1].text, 'real leak');
});

test('audit 模式只上报不改写', async () => {
  const chunks = [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: '<thinking>leak' },
    { type: 'block-end', index: 0, block: { type: 'text', text: '<thinking>leak' } },
    { type: 'finish', reason: { kind: 'stop' }, replayState: { blocks: [{ kind: 'text' }] } },
  ];
  const artifacts = [];
  const out = await collect(salvageReasoningChannel(replay(chunks), { mode: 'audit', onArtifact: (event) => artifacts.push(event) }));

  assert.deepEqual(out, chunks);
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].mode, 'audit');
  assert.equal(artifacts[0].removed, 0);
  assert.equal(artifacts[0].type, 'think-salvage');
});

test('流式: 每个上游 chunk 处理完即产出，不整段缓冲', async () => {
  const chunks = [{ type: 'block-start', index: 0, blockType: 'text' }];
  for (let i = 0; i < 40; i += 1) chunks.push({ type: 'text-delta', index: 0, text: `sentence ${i}. ` });
  chunks.push({ type: 'block-end', index: 0, block: { type: 'text', text: '' } });
  let pulled = 0;
  async function* counted() {
    for (const chunk of chunks) {
      pulled += 1;
      yield chunk;
    }
  }
  const stream = salvageReasoningChannel(counted())[Symbol.asyncIterator]();
  const first = await stream.next();
  const second = await stream.next();
  assert.equal(first.done, false);
  assert.deepEqual(first.value, chunks[0], 'the withheld block-start is released with the first content');
  assert.equal(second.value.text, 'sentence 0. ');
  assert.ok(pulled <= 2, `first output needs at most the block-start and one delta, pulled ${pulled}`);
});

test('apply 接线: salvageReasoning 开时先迁移再清洗，关时保持原样', async () => {
  const hookOf = (config) => {
    const hooks = [];
    const ctx = {
      on(event, handler) {
        if (event === 'llm/stream') hooks.push(handler);
        return () => {};
      },
      logger: { info() {} },
    };
    apply(ctx, config);
    assert.equal(hooks.length, 1, 'llm/stream hook registered');
    return hooks[0];
  };
  const request = { providerId: 'agent2api', modelId: 'deepseek-v4.1-flash' };
  const run = async (hook) => assemble(await collect(hook(request, () => replay(recorded))));

  const on = await run(hookOf({ mode: 'sanitize', salvageReasoning: true, customTokens: [] }));
  assert.deepEqual(types(on.blocks), ['reasoning', 'tool-call']);
  assert.equal(on.blocks[0].text.length, 3026);
  assert.equal('replayState' in on.finish, false);

  const off = await run(hookOf({ mode: 'sanitize', salvageReasoning: false, customTokens: [] }));
  assert.deepEqual(types(off.blocks), ['text', 'tool-call']);
  assert.equal(off.blocks[0].text.length, 3036);
  assert.equal('replayState' in off.finish, true);
});
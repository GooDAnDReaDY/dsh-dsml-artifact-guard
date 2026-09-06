import Schema from '@deepseek-ai/schemastery';

const TAIL = /(?:<\/｜DSML｜parameter>\s*)?(?:<\/｜DSML｜invoke>\s*)?<\/｜DSML｜tool_calls>\s*$/u;
const OPEN = /<｜DSML｜(?:tool_calls|invoke|parameter)>/u;
const KEEP = 96;

export const name = '@goodandready/dsh-dsml-artifact-guard';
export const inject = ['llm'];

export const Config = Schema.object({
  mode: Schema.string().default('audit'),
  providerId: Schema.string().default('opencode-go'),
  modelId: Schema.string().default('deepseek-v4-flash'),
});

export function matchesScope(o, c) {
  return (o?.providerId ?? o?.provider?.id ?? o?.provider) == c.providerId
    && (o?.modelId ?? o?.model?.id ?? o?.model?.name ?? o?.model) == c.modelId;
}

export async function* sanitizeDsmlArtifacts(s, { mode, onArtifact } = {}) {
  let p = '';
  let i;
  let open = false;
  const flush = async function* (end) {
    if (!p) return;
    let text = p;
    if (end && !open && TAIL.test(text)) {
      onArtifact?.({ mode, removed: 1 });
      if (mode === 'sanitize') text = text.replace(TAIL, '');
    }
    if (text) yield { type: 'text-delta', index: i, text };
    p = '';
    i = undefined;
  };
  for await (const c of s) {
    if (c?.type === 'text-delta' && typeof c.text === 'string') {
      if (p && i !== c.index) yield* flush(false);
      i = c.index;
      p += c.text;
      open ||= OPEN.test(c.text);
      if (p.length > KEEP) {
        const n = p.length - KEEP;
        yield { type: 'text-delta', index: i, text: p.slice(0, n) };
        p = p.slice(n);
      }
      continue;
    }
    if (c?.type === 'finish') {
      yield* flush(true);
      yield c;
      continue;
    }
    yield* flush(false);
    yield c;
  }
  yield* flush(true);
}

export function apply(ctx, c = {}) {
  const e = Config(c) ?? {};
  // #8: dispose with ctx.effect so unload unsubscribes llm/stream
  ctx.effect(() => ctx.on('llm/stream', (o, next) => {
    const s = next(o);
    return e.mode === 'disabled' || !matchesScope(o, e)
      ? s
      : sanitizeDsmlArtifacts(s, {
        mode: e.mode,
        onArtifact: (x) => ctx.logger?.info?.('DSML closing-tag artifact detected', x),
      });
  }));
}

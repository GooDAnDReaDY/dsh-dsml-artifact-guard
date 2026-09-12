import Schema from '@deepseek-ai/schemastery';

const TAIL = /(?:<\/｜DSML｜parameter>\s*)?(?:<\/｜DSML｜invoke>\s*)?<\/｜DSML｜tool_calls>\s*$/u;
const OPEN_TAG = /<｜DSML｜(?:tool_calls|invoke|parameter)[^>]*>/gu;
const CLOSE_TAG = /<\/｜DSML｜(?:tool_calls|invoke|parameter)>/gu;
const KEEP = 96;
const SCAN_BUFFER_SAFE = 64;

export const name = '@goodandready/dsh-dsml-artifact-guard';
export const inject = ['llm'];

export const Config = Schema.object({
  mode: Schema.string().default('sanitize'),
  providerId: Schema.string().default('opencode-go'),
  modelId: Schema.string().default('deepseek-v4-flash'),
});

export function matchesScope(o, c) {
  return (o?.providerId ?? o?.provider?.id ?? o?.provider) == c.providerId
    && (o?.modelId ?? o?.model?.id ?? o?.model?.name ?? o?.model) == c.modelId;
}

export async function* sanitizeDsmlArtifacts(s, { mode = 'sanitize', onArtifact } = {}) {
  let p = '';
  let i;
  let scanBuffer = '';
  let totalOpen = 0;
  let totalClose = 0;

  const countTags = (str) => {
    if (!str) return;
    const opens = str.match(OPEN_TAG);
    if (opens) totalOpen += opens.length;
    const closes = str.match(CLOSE_TAG);
    if (closes) totalClose += closes.length;
  };

  const flush = async function* (end) {
    if (!p) return;
    let text = p;
    if (end) {
      if (scanBuffer) {
        countTags(scanBuffer);
        scanBuffer = '';
      }
      if (TAIL.test(text)) {
        const tailMatch = text.match(TAIL);
        const tailCloseCount = tailMatch ? (tailMatch[0].match(CLOSE_TAG) || []).length : 0;
        const closedBeforeTail = totalClose - tailCloseCount;
        const unclosedBeforeTail = totalOpen - closedBeforeTail;
        if (unclosedBeforeTail <= 0) {
          onArtifact?.({ mode, removed: 1 });
          if (mode === 'sanitize') text = text.replace(TAIL, '');
        }
      }
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

      scanBuffer += c.text;
      if (scanBuffer.length > SCAN_BUFFER_SAFE) {
        const safe = scanBuffer.slice(0, scanBuffer.length - SCAN_BUFFER_SAFE);
        scanBuffer = scanBuffer.slice(scanBuffer.length - SCAN_BUFFER_SAFE);
        countTags(safe);
      }

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

import Schema from '@deepseek-ai/schemastery';
import { registerPluginUpdater } from './updater.js';

const TAIL = /(?:<\/｜DSML｜parameter>\s*)?(?:<\/｜DSML｜invoke>\s*)?<\/｜DSML｜tool_calls>\s*$/u;
const OPEN_TAG = /<｜DSML｜(?:tool_calls|invoke|parameter)[^>]*>/gu;
const CLOSE_TAG = /<\/｜DSML｜(?:tool_calls|invoke|parameter)>/gu;
const KEEP = 96;

export const name = '@goodandready/dsh-dsml-artifact-guard';
export const inject = ['llm', 'settings', 'webServer'];

export const Config = Schema.object({
  mode: Schema.string().default('sanitize'),
  providerId: Schema.string().default('opencode-go'),
  modelId: Schema.string().default('deepseek-v4-flash'),
});

export function matchesScope(o, c) {
  const provider = o?.providerId ?? o?.provider?.id ?? o?.provider;
  const model = o?.modelId ?? o?.model?.id ?? o?.model?.name ?? o?.model;
  return provider == c.providerId && model == c.modelId;
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
      const lastOpen = scanBuffer.lastIndexOf('<');
      const lastClose = scanBuffer.lastIndexOf('>');
      if (lastOpen > lastClose) {
        if (lastOpen > 0) {
          const safe = scanBuffer.slice(0, lastOpen);
          scanBuffer = scanBuffer.slice(lastOpen);
          countTags(safe);
        }
        if (scanBuffer.length > 2048) {
          const cut = scanBuffer.length - 1024;
          countTags(scanBuffer.slice(0, cut));
          scanBuffer = scanBuffer.slice(cut);
        }
      } else if (scanBuffer.length > 0) {
        countTags(scanBuffer);
        scanBuffer = '';
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

export function apply(ctx, initialConfig = {}) {
  const NS = '@goodandready/dsh-dsml-artifact-guard';
  let activeConfig = Config(initialConfig) ?? {};

  let getConfig = () => activeConfig;

  // Register settings scope inside ctx.effect
  if (typeof ctx.inject === 'function') {
    ctx.inject(['settings'], (sctx) => {
      try {
        const scope = sctx.settings.register(NS, Config, { base: initialConfig });
        getConfig = () => Config(scope?.get() ?? initialConfig) ?? {};
        if (typeof scope?.watch === 'function') {
          sctx.effect(() => scope.watch(() => {
            activeConfig = getConfig();
          }));
        }
      } catch (err) {
        ctx.logger?.warn?.(`[dsh-dsml-artifact-guard] settings registration skipped: ${String(err)}`);
      }
    });
  }

  // Register one-click updater endpoint
  if (ctx.webServer && typeof ctx.webServer.register === 'function') {
    const mountUpdater = () => registerPluginUpdater(ctx, {
      endpoint: '/api/dsh-dsml-artifact-guard/update',
      packageName: '@goodandready/dsh-dsml-artifact-guard',
      manifestUrl: new URL('../package.json', import.meta.url),
    });
    if (typeof ctx.effect === 'function') {
      ctx.effect(mountUpdater, 'dsh-dsml-artifact-guard: plugin updater');
    } else {
      mountUpdater();
    }
  }

  // Hook into llm/stream with ctx.effect lifecycle cleanup
  ctx.effect(() => ctx.on('llm/stream', (o, next) => {
    const current = getConfig();
    const s = next(o);
    return current.mode === 'disabled' || !matchesScope(o, current)
      ? s
      : sanitizeDsmlArtifacts(s, {
        mode: current.mode,
        onArtifact: (x) => ctx.logger?.info?.('DSML closing-tag artifact detected', x),
      });
  }));
}

// Preflight helper: verify request method
export function checkRequestMethod(req, expected = 'POST') {
  return req && req.method === expected;
}

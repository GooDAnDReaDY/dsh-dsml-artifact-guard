import Schema from '@deepseek-ai/schemastery';
import { registerPluginUpdater } from './updater.js';

const TAIL = /(?:<\/｜DSML｜parameter>\s*)?(?:<\/｜DSML｜invoke>\s*)?<\/｜DSML｜tool_calls>\s*$/u;
const OPEN_TAG = /<｜DSML｜(?:tool_calls|invoke|parameter)[^>]*>/gu;
const CLOSE_TAG = /<\/｜DSML｜(?:tool_calls|invoke|parameter)>/gu;
const KEEP = 96;

export const name = '@goodandready/dsh-dsml-artifact-guard';
export const inject = ['llm', 'settings', 'webServer'];

const rawConfig = Schema.object({
  mode: Schema.string().default('sanitize'),
  modelPattern: Schema.string().default('deepseek'),
  providers: Schema.array(Schema.string()).default([]),
  providerId: Schema.string(),
  modelId: Schema.string(),
});

export const Config = typeof rawConfig.volatile === 'function'
  ? rawConfig.volatile()
  : rawConfig.extra('volatile', true);

export function matchesScope(o, c) {
  if (!c || c.mode === 'disabled') return false;
  const provider = String(o?.providerId ?? o?.provider?.id ?? o?.provider ?? '').trim();
  const model = String(o?.modelId ?? o?.model?.id ?? o?.model?.name ?? o?.model ?? '').trim();
  if (!model && !provider) return false;

  // 1. Backward compatibility: if legacy exact providerId/modelId were specified and match
  if (c.providerId && c.modelId && provider === c.providerId && model === c.modelId) {
    return true;
  }

  // 2. Provider check: if c.providers is non-empty, provider must be included
  const providersList = Array.isArray(c.providers)
    ? c.providers.map(p => String(p).trim()).filter(Boolean)
    : (typeof c.providers === 'string' && c.providers.trim() ? c.providers.split(',').map(p => p.trim()).filter(Boolean) : []);

  if (providersList.length > 0) {
    if (!providersList.includes(provider)) return false;
  }

  // 3. Model pattern check (case-insensitive regex)
  const pattern = (c.modelPattern !== undefined && c.modelPattern !== null && String(c.modelPattern).trim() !== '')
    ? String(c.modelPattern).trim()
    : 'deepseek';

  try {
    const rx = new RegExp(pattern, 'i');
    return rx.test(model);
  } catch (err) {
    /* Fallback to substring matching if regex syntax is invalid */
    return model.toLowerCase().includes(pattern.toLowerCase());
  }
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

export function unwrapConfig(conf) {
  if (!conf) return {};
  if (typeof conf.get === 'function') {
    try {
      const val = conf.get();
      return (val && typeof val === 'object') ? val : {};
    } catch (err) {
      /* Volatile getter failed */
      return {};
    }
  }
  try {
    const res = Config(conf);
    if (res && typeof res.get === 'function') {
      const val = res.get();
      return (val && typeof val === 'object') ? val : {};
    }
    return (res && typeof res === 'object') ? res : {};
  } catch (err) {
    /* Config validation fallback to object */
    return (conf && typeof conf === 'object') ? conf : {};
  }
}

export function apply(ctx, initialConfig = {}) {
  const NS = '@goodandready/dsh-dsml-artifact-guard';
  let activeConfig = unwrapConfig(initialConfig);

  let getConfig = () => (typeof initialConfig?.get === 'function' ? unwrapConfig(initialConfig) : activeConfig);

  // Live config subscription from the plugin fiber
  if (typeof ctx.on === 'function') {
    ctx.effect(() => ctx.on('config', (nextConfig) => {
      activeConfig = unwrapConfig(nextConfig);
    }), 'dsh-dsml-artifact-guard: live config');
  }

  // DSH 0.1.7 SettingsForms: suppress generic duplicate form, custom card mounts in plugins seat
  if (ctx.settings && typeof ctx.settings.configure === 'function') {
    ctx.effect(() => ctx.settings.configure({ auto: false }), 'dsh-dsml-artifact-guard: settings policy');
  } else if (typeof ctx.inject === 'function') {
    // Legacy settings service fallback
    ctx.inject(['settings'], (sctx) => {
      if (typeof sctx.settings?.register === 'function') {
        try {
          const scope = sctx.settings.register(NS, Config, { base: initialConfig });
          getConfig = () => Config(scope?.get() ?? initialConfig) ?? {};
          if (typeof scope?.watch === 'function') {
            sctx.effect(() => scope.watch(() => {
              activeConfig = getConfig();
            }));
          }
        } catch (err) {
          /* Legacy settings service registration unavailable */
        }
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

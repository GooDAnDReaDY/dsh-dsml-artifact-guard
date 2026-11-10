import Schema from '@deepseek-ai/schemastery';
import { registerPluginUpdater } from './updater.js';
import { registerPluginTelemetry, recordArtifact } from './telemetry.js';

const TAIL = /(?:<\/｜DSML｜parameter>\s*)?(?:<\/｜DSML｜invoke>\s*)?<\/｜DSML｜tool_calls>\s*$/u;
const INCOMPLETE_TAIL = /(?:<\/｜DSML｜(?:parameter|invoke|tool_calls)>\s*)*(?:<\/｜DSML(?:｜(?:tool_calls|invoke|parameter)?)?>?)\s*$/u;
const OPEN_TAG = /<｜DSML｜(?:tool_calls|invoke|parameter)[^>]*>/gu;
const CLOSE_TAG = /<\/｜DSML｜(?:tool_calls|invoke|parameter)>/gu;
const OPEN_THINK = /<think(?:>|\s[^>]*>)/gi;
const CLOSE_THINK = /<\/think>/gi;
const TRAILING_THINK_MARKERS = /(?:<\/think>|<｜end of sentence｜>|<｜thought｜>|<\/｜thought｜>)\s*$/u;
const KEEP = 96;

export const name = '@goodandready/dsh-dsml-artifact-guard';
export const inject = ['llm', 'settings', 'webServer'];

// DSH builds a namespace's settings form from the PER-FIELD volatile markers of the
// entry schema. Wrapping the object in .volatile() produced none of them, so no form was
// ever generated. Mark each user-editable field instead.
export const Config = Schema.object({
  mode: Schema.string().default('sanitize').volatile().description('How to handle detected artifact markup'),
  modelPattern: Schema.string().default('deepseek').volatile().description('Model name substring this plugin guards'),
  providers: Schema.array(Schema.string()).default([]).volatile().description('Restrict guarding to these providers; empty means all'),
  cleanThinkArtifacts: Schema.boolean().default(false).volatile().description('Clean leaked reasoning closing tags (</think>) and trailing incomplete tokens'),
  providerId: Schema.string().volatile().description('Legacy exact provider id match'),
  modelId: Schema.string().volatile().description('Legacy exact model id match'),
});

// Unwrap Volatile boxes before any caller reads a value.
export function plainConfig(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(plainConfig);
  if (typeof value.get === 'function') return plainConfig(value.get());
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plainConfig(v)]));
}

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

export function sanitizeStandaloneText(text, {
  mode = 'sanitize',
  cleanThinkArtifacts = false,
  onArtifact,
  provider = '',
  model = '',
} = {}) {
  if (!text || typeof text !== 'string') return text;
  let result = text;

  // 1. Complete DSML closing tags tail
  if (TAIL.test(result)) {
    const opens = result.match(OPEN_TAG);
    const closes = result.match(CLOSE_TAG);
    const totalOpen = opens ? opens.length : 0;
    const totalClose = closes ? closes.length : 0;
    const tailMatch = result.match(TAIL);
    const tailCloseCount = tailMatch ? (tailMatch[0].match(CLOSE_TAG) || []).length : 0;
    const closedBeforeTail = totalClose - tailCloseCount;
    const unclosedBeforeTail = totalOpen - closedBeforeTail;
    if (unclosedBeforeTail <= 0) {
      onArtifact?.({
        mode,
        removed: tailCloseCount || 1,
        sample: tailMatch ? tailMatch[0] : '',
        provider,
        model,
        type: 'dsml',
      });
      if (mode === 'sanitize') result = result.replace(TAIL, '');
    }
  } else if (INCOMPLETE_TAIL.test(result)) {
    const opens = result.match(OPEN_TAG);
    const closes = result.match(CLOSE_TAG);
    const totalOpen = opens ? opens.length : 0;
    const totalClose = closes ? closes.length : 0;
    const incompMatch = result.match(INCOMPLETE_TAIL);
    const incompCloses = incompMatch ? (incompMatch[0].match(CLOSE_TAG) || []).length : 0;
    const closedBefore = totalClose - incompCloses;
    const unclosedBefore = totalOpen - closedBefore;
    if (unclosedBefore <= 0) {
      onArtifact?.({
        mode,
        removed: Math.max(incompCloses, 1),
        sample: incompMatch ? incompMatch[0] : '',
        provider,
        model,
        type: 'incomplete-dsml',
      });
      if (mode === 'sanitize') result = result.replace(INCOMPLETE_TAIL, '');
    }
  }

  // 2. Reasoning think artifacts (when cleanThinkArtifacts is enabled)
  if (cleanThinkArtifacts) {
    if (TRAILING_THINK_MARKERS.test(result)) {
      const markerMatch = result.match(TRAILING_THINK_MARKERS);
      onArtifact?.({
        mode,
        removed: 1,
        sample: markerMatch ? markerMatch[0] : '',
        provider,
        model,
        type: 'think-marker',
      });
      if (mode === 'sanitize') result = result.replace(TRAILING_THINK_MARKERS, '');
    }
    const thinkOpens = result.match(OPEN_THINK) || [];
    const thinkCloses = result.match(CLOSE_THINK) || [];
    if (thinkOpens.length === 0 && thinkCloses.length > 0) {
      onArtifact?.({
        mode,
        removed: thinkCloses.length,
        sample: '</think>',
        provider,
        model,
        type: 'think-orphan',
      });
      if (mode === 'sanitize') result = result.replace(/<\/think>\s*/gi, '');
    }
    if (thinkOpens.length > thinkCloses.length) {
      onArtifact?.({
        mode,
        removed: 0,
        sample: 'auto-closed unclosed <think>',
        provider,
        model,
        type: 'think-repair',
      });
      if (mode === 'sanitize') result += '\n</think>\n';
    }
  }

  return result;
}

export async function* sanitizeDsmlArtifacts(s, {
  mode = 'sanitize',
  cleanThinkArtifacts = false,
  onArtifact,
  provider = '',
  model = '',
} = {}) {
  let p = '';
  let i;
  let scanBuffer = '';
  let totalOpen = 0;
  let totalClose = 0;
  let totalOpenThink = 0;
  let totalCloseThink = 0;

  const countTags = (str) => {
    if (!str) return;
    const opens = str.match(OPEN_TAG);
    if (opens) totalOpen += opens.length;
    const closes = str.match(CLOSE_TAG);
    if (closes) totalClose += closes.length;
    if (cleanThinkArtifacts) {
      const thinkOpens = str.match(OPEN_THINK);
      if (thinkOpens) totalOpenThink += thinkOpens.length;
      const thinkCloses = str.match(CLOSE_THINK);
      if (thinkCloses) totalCloseThink += thinkCloses.length;
    }
  };

  const flush = async function* (end) {
    if (!p) return;
    let text = p;
    if (end) {
      if (scanBuffer) {
        countTags(scanBuffer);
        scanBuffer = '';
      }

      // 1. Complete DSML closing tags tail
      if (TAIL.test(text)) {
        const tailMatch = text.match(TAIL);
        const tailCloseCount = tailMatch ? (tailMatch[0].match(CLOSE_TAG) || []).length : 0;
        const closedBeforeTail = totalClose - tailCloseCount;
        const unclosedBeforeTail = totalOpen - closedBeforeTail;
        if (unclosedBeforeTail <= 0) {
          const removedSample = tailMatch ? tailMatch[0] : '';
          onArtifact?.({
            mode,
            removed: tailCloseCount || 1,
            sample: removedSample,
            provider,
            model,
            type: 'dsml',
          });
          if (mode === 'sanitize') text = text.replace(TAIL, '');
        }
      } else if (INCOMPLETE_TAIL.test(text)) {
        // 2. Trailing incomplete DSML closing tags at finish / block-end
        const incompMatch = text.match(INCOMPLETE_TAIL);
        const incompCloses = incompMatch ? (incompMatch[0].match(CLOSE_TAG) || []).length : 0;
        const closedBefore = totalClose - incompCloses;
        const unclosedBefore = totalOpen - closedBefore;
        if (unclosedBefore <= 0) {
          const removedSample = incompMatch ? incompMatch[0] : '';
          onArtifact?.({
            mode,
            removed: Math.max(incompCloses, 1),
            sample: removedSample,
            provider,
            model,
            type: 'incomplete-dsml',
          });
          if (mode === 'sanitize') text = text.replace(INCOMPLETE_TAIL, '');
        }
      }

      // 3. Reasoning think artifacts (when cleanThinkArtifacts is enabled)
      if (cleanThinkArtifacts) {
        // A. Trailing think markers at end of stream / block
        if (TRAILING_THINK_MARKERS.test(text)) {
          const markerMatch = text.match(TRAILING_THINK_MARKERS);
          const sample = markerMatch ? markerMatch[0] : '';
          onArtifact?.({
            mode,
            removed: 1,
            sample,
            provider,
            model,
            type: 'think-marker',
          });
          if (mode === 'sanitize') text = text.replace(TRAILING_THINK_MARKERS, '');
        }
        // B. Orphan </think> when no <think> was opened in the stream
        if (totalOpenThink === 0 && CLOSE_THINK.test(text)) {
          const thinkMatches = text.match(CLOSE_THINK) || [];
          onArtifact?.({
            mode,
            removed: thinkMatches.length,
            sample: '</think>',
            provider,
            model,
            type: 'think-orphan',
          });
          if (mode === 'sanitize') text = text.replace(/<\/think>\s*/gi, '');
        }
        // C. Unclosed <think> block: auto-close to heal Markdown
        if (totalOpenThink > totalCloseThink) {
          onArtifact?.({
            mode,
            removed: 0,
            sample: 'auto-closed unclosed <think>',
            provider,
            model,
            type: 'think-repair',
          });
          if (mode === 'sanitize') text += '\n</think>\n';
          totalCloseThink += (totalOpenThink - totalCloseThink);
        }
      }
    }
    if (text) yield { type: 'text-delta', index: i, text };
    p = '';
    i = undefined;
  };

  for await (const c of s) {
    if (c?.type === 'text-delta' && typeof c.text === 'string') {
      if (p && i !== c.index) yield* flush(true);
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

    if (c?.type === 'block-end') {
      const rawP = p;
      let flushedText = '';
      if (p) {
        for await (const chunk of flush(true)) {
          yield chunk;
          if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') {
            flushedText += chunk.text;
          }
        }
      }

      let block = c.block;
      if (block && typeof block.text === 'string') {
        if (rawP) {
          if (block.text.endsWith(rawP)) {
            const prefix = block.text.slice(0, block.text.length - rawP.length);
            block = { ...block, text: prefix + flushedText };
          } else {
            block = {
              ...block,
              text: sanitizeStandaloneText(block.text, {
                mode,
                cleanThinkArtifacts,
                provider,
                model,
              }),
            };
          }
        } else {
          // No deltas were buffered in p (e.g. non-streaming block)
          block = {
            ...block,
            text: sanitizeStandaloneText(block.text, {
              mode,
              cleanThinkArtifacts,
              onArtifact,
              provider,
              model,
            }),
          };
        }
      }
      yield { ...c, ...(block ? { block } : {}) };
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
  // A Volatile reference (any field is now volatile) resolves through .get().
  if (typeof conf.get === 'function') {
    try {
      const inner = conf.get();
      const plain = plainConfig(inner);
      return plain && typeof plain === 'object' ? plain : {};
    } catch (err) {
      /* Getter threw; return safe empty object fallback */
      return {};
    }
  }
  try {
    // Config() returns volatile boxes now, so unwrap them; a plain input stays plain.
    return plainConfig(Config(conf));
  } catch (err) {
    /* Schema validation threw; fallback to single-pass unwrapped raw config */
    const plain = plainConfig(conf);
    return plain && typeof plain === 'object' ? plain : {};
  }
}

export function apply(ctx, initialConfig = {}) {
  let activeConfig = unwrapConfig(initialConfig);

  let getConfig = () => (typeof initialConfig?.get === 'function' ? unwrapConfig(initialConfig) : activeConfig);

  // Live config subscription from the plugin fiber (re-read volatile entries on loader/volatile-update)
  if (typeof ctx.on === 'function') {
    const syncConfig = (nextConfig) => {
      activeConfig = unwrapConfig(nextConfig || initialConfig);
    };
    ctx.effect(() => {
      const unsubVolatile = ctx.on('loader/volatile-update', () => syncConfig());
      const unsubConfig = ctx.on('config', (nextConfig) => syncConfig(nextConfig));
      return () => {
        if (typeof unsubVolatile === 'function') unsubVolatile();
        if (typeof unsubConfig === 'function') unsubConfig();
      };
    }, 'dsh-dsml-artifact-guard: live config');
  }

  // DSH 0.1.7 SettingsForms: suppress generic duplicate form, custom card mounts in plugins seat
  if (ctx.settings && typeof ctx.settings.configure === 'function') {
    ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber), 'dsh-dsml-artifact-guard: settings policy');
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

    const mountTelemetry = () => registerPluginTelemetry(ctx, {
      endpoint: '/api/dsh-dsml-artifact-guard/stats',
    });
    if (typeof ctx.effect === 'function') {
      ctx.effect(mountTelemetry, 'dsh-dsml-artifact-guard: plugin telemetry');
    } else {
      mountTelemetry();
    }
  }

  // Hook into llm/stream with ctx.effect lifecycle cleanup
  ctx.effect(() => ctx.on('llm/stream', (o, next) => {
    const current = getConfig();
    const s = next(o);
    if (current.mode === 'disabled' || !matchesScope(o, current)) {
      return s;
    }
    const provider = String(o?.providerId ?? o?.provider?.id ?? o?.provider ?? '').trim();
    const model = String(o?.modelId ?? o?.model?.id ?? o?.model?.name ?? o?.model ?? '').trim();
    return sanitizeDsmlArtifacts(s, {
      mode: current.mode,
      cleanThinkArtifacts: Boolean(current.cleanThinkArtifacts),
      provider,
      model,
      onArtifact: (x) => {
        recordArtifact(x);
        ctx.logger?.info?.('DSML closing-tag artifact detected', x);
      },
    });
  }));
}

// Preflight helper: verify request method
export function checkRequestMethod(req, expected = 'POST') {
  return req && req.method === expected;
}

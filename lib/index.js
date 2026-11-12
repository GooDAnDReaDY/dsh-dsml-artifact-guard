import Schema from '@deepseek-ai/schemastery';
import { registerPluginUpdater } from './updater.js';
import { registerPluginTelemetry, recordArtifact } from './telemetry.js';

const TAIL = /(?:<\/｜DSML｜parameter>\s*)?(?:<\/｜DSML｜invoke>\s*)?<\/｜DSML｜tool_calls>\s*$/u;
const INCOMPLETE_TAIL = /(?:<\/｜DSML｜(?:parameter|invoke|tool_calls)>\s*)*(?:<\/｜DSML(?:｜(?:tool_calls|invoke|parameter)?)?>?)\s*$/u;
const OPEN_TAG = /<｜DSML｜(?:tool_calls|invoke|parameter)[^>]*>/gu;
const CLOSE_TAG = /<\/｜DSML｜(?:tool_calls|invoke|parameter)>/gu;
const THINK_TOKEN = /<think(?:>|\s[^>]*>)|<\/think>\s*/gi;
const TRAILING_THINK_MARKERS = /(?:<\/think>|<｜end of sentence｜>|<｜thought｜>|<\/｜thought｜>)\s*$/u;
const KEEP = 96;
const THINK_BOUNDARY_GUARD = 24;

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

  // Backward compatibility: legacy exact providerId/modelId rule
  if (c.providerId && c.modelId && provider === c.providerId && model === c.modelId) {
    return true;
  }

  const providersList = Array.isArray(c.providers)
    ? c.providers.map(p => String(p).trim()).filter(Boolean)
    : (typeof c.providers === 'string' && c.providers.trim() ? c.providers.split(',').map(p => p.trim()).filter(Boolean) : []);

  if (providersList.length > 0 && !providersList.includes(provider)) {
    return false;
  }

  const pattern = (c.modelPattern !== undefined && c.modelPattern !== null && String(c.modelPattern).trim() !== '')
    ? String(c.modelPattern).trim()
    : 'deepseek';

  try {
    const rx = new RegExp(pattern, 'i');
    return rx.test(model);
  } catch {
    // Fallback to substring matching if regex syntax is invalid
    return model.toLowerCase().includes(pattern.toLowerCase());
  }
}

// Tracks <think> nesting depth across segments so orphan </think> tags can be stripped at emission time
function processThinkSegment(segment, state, { mode = 'sanitize', onArtifact, provider = '', model = '' } = {}) {
  if (!segment) return segment;
  let orphanCount = 0;
  THINK_TOKEN.lastIndex = 0;
  const out = segment.replace(THINK_TOKEN, (match) => {
    if (match[1] !== '/') {
      state.thinkDepth += 1;
      return match;
    }
    if (state.thinkDepth > 0) {
      state.thinkDepth -= 1;
      return match;
    }
    orphanCount += 1;
    return mode === 'sanitize' ? '' : match;
  });
  THINK_TOKEN.lastIndex = 0;
  if (orphanCount > 0) {
    onArtifact?.({
      mode,
      removed: orphanCount,
      sample: '</think>',
      provider,
      model,
      type: 'think-orphan',
    });
  }
  return out;
}

// Shared end-of-block / end-of-stream tail sanitizer used by both streaming and standalone paths
function sanitizeTailArtifacts(text, state, {
  mode = 'sanitize',
  cleanThinkArtifacts = false,
  onArtifact,
  provider = '',
  model = '',
} = {}) {
  if (!text) return text;
  let result = text;

  if (TAIL.test(result)) {
    const tailMatch = result.match(TAIL);
    const tailCloseCount = tailMatch ? (tailMatch[0].match(CLOSE_TAG) || []).length : 0;
    const closedBeforeTail = state.totalClose - tailCloseCount;
    if (state.totalOpen - closedBeforeTail <= 0) {
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
    const incompMatch = result.match(INCOMPLETE_TAIL);
    const incompCloses = incompMatch ? (incompMatch[0].match(CLOSE_TAG) || []).length : 0;
    const closedBefore = state.totalClose - incompCloses;
    if (state.totalOpen - closedBefore <= 0) {
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
    if (state.thinkDepth > 0) {
      onArtifact?.({
        mode,
        removed: 0,
        sample: 'auto-closed unclosed <think>',
        provider,
        model,
        type: 'think-repair',
      });
      if (mode === 'sanitize') result += '\n</think>\n';
      state.thinkDepth = 0;
    }
  }

  return result;
}

export function sanitizeStandaloneText(text, {
  mode = 'sanitize',
  cleanThinkArtifacts = false,
  onArtifact,
  provider = '',
  model = '',
} = {}) {
  if (!text || typeof text !== 'string') return text;
  const opens = text.match(OPEN_TAG);
  const closes = text.match(CLOSE_TAG);
  const state = {
    totalOpen: opens ? opens.length : 0,
    totalClose: closes ? closes.length : 0,
    thinkDepth: 0,
  };
  const opts = { mode, cleanThinkArtifacts, onArtifact, provider, model };
  let result = cleanThinkArtifacts ? processThinkSegment(text, state, opts) : text;
  result = sanitizeTailArtifacts(result, state, opts);
  return result;
}

// Avoid splitting an in-flight <think> or </think> token at the KEEP emission cut point
function safeThinkCutIndex(buffer, targetCut) {
  const minScan = Math.max(0, targetCut - THINK_BOUNDARY_GUARD);
  const lastLt = buffer.lastIndexOf('<', targetCut - 1);
  if (lastLt >= minScan) {
    const closingGt = buffer.indexOf('>', lastLt);
    if (closingGt === -1 || closingGt >= targetCut) {
      return lastLt;
    }
  }
  return targetCut;
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
  let rawBlockText = '';
  let emittedBlockText = '';
  const state = { totalOpen: 0, totalClose: 0, thinkDepth: 0 };
  const opts = { mode, cleanThinkArtifacts, onArtifact, provider, model };

  const countTags = (str) => {
    if (!str) return;
    const opens = str.match(OPEN_TAG);
    if (opens) state.totalOpen += opens.length;
    const closes = str.match(CLOSE_TAG);
    if (closes) state.totalClose += closes.length;
  };

  const emitChunkText = (rawSlice, cleanText) => {
    rawBlockText += rawSlice;
    if (cleanText) emittedBlockText += cleanText;
  };

  const flush = async function* (end) {
    if (!p) return;
    const rawP = p;
    let text = cleanThinkArtifacts ? processThinkSegment(p, state, opts) : p;
    if (end) {
      if (scanBuffer) {
        countTags(scanBuffer);
        scanBuffer = '';
      }
      text = sanitizeTailArtifacts(text, state, opts);
    }
    emitChunkText(rawP, text);
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
        const target = p.length - KEEP;
        const n = cleanThinkArtifacts ? safeThinkCutIndex(p, target) : target;
        if (n > 0) {
          const rawPrefix = p.slice(0, n);
          const emitText = cleanThinkArtifacts ? processThinkSegment(rawPrefix, state, opts) : rawPrefix;
          emitChunkText(rawPrefix, emitText);
          if (emitText) yield { type: 'text-delta', index: i, text: emitText };
          p = p.slice(n);
        }
      }
      continue;
    }

    if (c?.type === 'block-start') {
      rawBlockText = '';
      emittedBlockText = '';
      yield* flush(false);
      yield c;
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
      const isTextBlock = !block?.type || block.type === 'text';
      if (block && typeof block.text === 'string' && isTextBlock) {
        if (rawBlockText && block.text === rawBlockText) {
          block = { ...block, text: emittedBlockText };
        } else if (rawP && block.text.endsWith(rawP)) {
          const prefix = block.text.slice(0, block.text.length - rawP.length);
          block = { ...block, text: prefix + flushedText };
        } else {
          // Non-streaming or mismatched block fallback (suppress duplicate onArtifact if stream deltas already ran)
          block = {
            ...block,
            text: sanitizeStandaloneText(block.text, {
              mode,
              cleanThinkArtifacts,
              onArtifact: rawBlockText ? undefined : onArtifact,
              provider,
              model,
            }),
          };
        }
      }
      rawBlockText = '';
      emittedBlockText = '';
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
  if (typeof conf.get === 'function') {
    try {
      const inner = conf.get();
      const plain = plainConfig(inner);
      return plain && typeof plain === 'object' ? plain : {};
    } catch {
      // Getter threw; return safe empty object fallback
      return {};
    }
  }
  try {
    return plainConfig(Config(conf));
  } catch {
    // Schema validation threw; fallback to single-pass unwrapped raw config
    const plain = plainConfig(conf);
    return plain && typeof plain === 'object' ? plain : {};
  }
}

export function apply(ctx, initialConfig = {}) {
  let activeConfig = unwrapConfig(initialConfig);
  const getConfig = () => (typeof initialConfig?.get === 'function' ? unwrapConfig(initialConfig) : activeConfig);
  const registerEffect = (fn, label) => (typeof ctx.effect === 'function' ? ctx.effect(fn, label) : fn());

  if (typeof ctx.on === 'function') {
    const syncConfig = (nextConfig) => {
      activeConfig = unwrapConfig(nextConfig || initialConfig);
    };
    registerEffect(() => {
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
    registerEffect(() => ctx.settings.configure({ auto: false }, ctx.fiber), 'dsh-dsml-artifact-guard: settings policy');
  }

  if (ctx.webServer && typeof ctx.webServer.register === 'function') {
    registerEffect(() => registerPluginUpdater(ctx, {
      endpoint: '/api/dsh-dsml-artifact-guard/update',
      packageName: '@goodandready/dsh-dsml-artifact-guard',
      manifestUrl: new URL('../package.json', import.meta.url),
    }), 'dsh-dsml-artifact-guard: plugin updater');

    registerEffect(() => registerPluginTelemetry(ctx, {
      endpoint: '/api/dsh-dsml-artifact-guard/stats',
    }), 'dsh-dsml-artifact-guard: plugin telemetry');
  }

  // Hook into llm/stream synchronously so callers receive an AsyncIterable directly
  registerEffect(() => ctx.on('llm/stream', (o, next) => {
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
  }), 'dsh-dsml-artifact-guard: stream hook');
}

export function checkRequestMethod(req, expected = 'POST') {
  return req && req.method === expected;
}

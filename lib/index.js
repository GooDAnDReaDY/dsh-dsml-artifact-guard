import Schema from '@deepseek-ai/schemastery';
import { registerPluginUpdater } from './updater.js';
import { registerPluginTelemetry, recordArtifact, recordSessionGuarded } from './telemetry.js';
import { checkRequestMethod } from './request-trust.js';

export { checkRequestMethod };

const DSML_TAG_NAME = '(?:tool[_-]?calls|calls|invoke|parameter)';
const DSML_MARK = '[ \\t]*[\\uFF5C|][ \\t]*DSML[ \\t]*[\\uFF5C|][ \\t]*';
const DSML_CLOSE = '<\\/' + DSML_MARK + DSML_TAG_NAME + '[ \\t]*>';
const CLOSE_TAG = new RegExp(DSML_CLOSE, 'gu');
const DSML_CLUSTER = new RegExp('<' + DSML_MARK + DSML_TAG_NAME + '[^>]*>|(?:' + DSML_CLOSE + '\\s*)+', 'gu');
const INCOMPLETE_TAIL = new RegExp(
  '(?:' + DSML_CLOSE + '\\s*)*(?:<\\/[ \\t]*[\\uFF5C|][ \\t]*DSML(?:[ \\t]*[\\uFF5C|][ \\t]*' + DSML_TAG_NAME + ')?[ \\t]*)\\s*$',
  'u'
);
const THINK_TOKEN = /<think\s*>|<\/think>\s*/gi;
const TRAILING_THINK_MARKERS = /(?:<｜end of sentence｜>|<｜thought｜>|<\/｜thought｜>)\s*$/u;
const KEEP = 96;
const MAX_TAG_SCAN = 1024;
const MAX_PATTERN_LENGTH = 128;
const MAX_CUSTOM_TOKENS = 32;
const MIN_CUSTOM_TOKEN_LENGTH = 2;
const MAX_CUSTOM_TOKEN_LENGTH = 64;

let cachedPattern = null;
let cachedRegex = null;
let cachedCustomKey = null;
let cachedCustomRegex = null;

export const name = '@goodandready/dsh-dsml-artifact-guard';
export const inject = ['llm'];

export const Config = Schema.object({
  mode: Schema.string().default('sanitize').volatile().description('How to handle detected artifact markup'),
  modelPattern: Schema.string().default('deepseek').volatile().description('Model name substring this plugin guards'),
  providers: Schema.array(Schema.string()).default([]).volatile().description('Restrict guarding to these providers; empty means all'),
  customTokens: Schema.array(Schema.string()).default([]).volatile().description('Additional literal artifact tokens to strip outside code fences (2-64 chars each, max 32 tokens)'),
  cleanThinkArtifacts: Schema.boolean().default(false).volatile().description('Clean leaked reasoning closing tags (</think>) and trailing incomplete tokens'),
  showTelemetry: Schema.boolean().default(true).volatile().description('Display activity and telemetry dashboard in settings'),
  providerId: Schema.string().volatile().description('Legacy exact provider id match'),
  modelId: Schema.string().volatile().description('Legacy exact model id match'),
});

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

  // Backward compatibility: legacy providerId/modelId rule (#85: OR-semantics)
  if (c.providerId && provider === c.providerId) {
    return true;
  }
  if (c.modelId && model === c.modelId) {
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

  if (pattern.length > MAX_PATTERN_LENGTH) {
    return model.toLowerCase().includes(pattern.slice(0, MAX_PATTERN_LENGTH).toLowerCase());
  }

  if (cachedPattern !== pattern) {
    cachedPattern = pattern;
    try {
      cachedRegex = new RegExp(pattern, 'i');
    } catch {
      cachedRegex = null;
    }
  }

  if (cachedRegex) {
    return cachedRegex.test(model);
  }
  return model.toLowerCase().includes(pattern.toLowerCase());
}

export function normalizeCustomTokens(value) {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const token = typeof raw === 'string' ? raw.trim() : '';
    if (!token || token.length < MIN_CUSTOM_TOKEN_LENGTH || token.length > MAX_CUSTOM_TOKEN_LENGTH || token.includes('`') || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length >= MAX_CUSTOM_TOKENS) break;
  }
  return out;
}

function customTokenRegex(tokens) {
  const key = tokens.join('\u0000');
  if (key === cachedCustomKey) return cachedCustomRegex;
  const escaped = [...tokens]
    .sort((a, b) => b.length - a.length)
    .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  cachedCustomKey = key;
  cachedCustomRegex = escaped.length > 0 ? new RegExp('(?:' + escaped.join('|') + ')', 'g') : null;
  return cachedCustomRegex;
}

// Strips user-provided literal artifacts outside code fences and inline code
function processCustomSegment(segment, fenceBase, tokens, { mode = 'sanitize', onArtifact, provider = '', model = '' } = {}) {
  if (!segment || tokens.length === 0) return segment;
  const re = customTokenRegex(tokens);
  if (!re) return segment;
  let detectedCount = 0;
  let sample = '';
  const out = segment.replace(re, (match, offset, fullString) => {
    const fenceToggles = (fullString.slice(0, offset).match(/```/g) || []).length;
    if (((fenceBase ? 1 : 0) + fenceToggles) % 2 === 1) return match;

    const before = fullString.slice(0, offset);
    const lastNewline = before.lastIndexOf('\n');
    const lineBefore = lastNewline >= 0 ? before.slice(lastNewline) : before;
    const after = fullString.slice(offset + match.length);
    const nextNewline = after.indexOf('\n');
    const lineAfter = nextNewline >= 0 ? after.slice(0, nextNewline) : after;
    if ((lineBefore.match(/`/g) || []).length % 2 === 1 && lineAfter.includes('`')) return match;

    detectedCount += 1;
    if (!sample) sample = match;
    return mode === 'sanitize' ? '' : match;
  });
  if (detectedCount > 0) {
    onArtifact?.({
      mode,
      detected: detectedCount,
      removed: mode === 'sanitize' ? detectedCount : 0,
      sample,
      provider,
      model,
      type: 'custom-token',
    });
  }
  return out;
}

// Tracks <think> nesting depth across segments so orphan </think> tags can be stripped (Issue #82)
function processThinkSegment(segment, state, { mode = 'sanitize', onArtifact, provider = '', model = '' } = {}) {
  if (!segment) return segment;
  let orphanCount = 0;
  THINK_TOKEN.lastIndex = 0;
  const out = segment.replace(THINK_TOKEN, (match, offset, fullString) => {
    // Fail-open: check code fence
    const fenceToggles = (fullString.slice(0, offset).match(/```/g) || []).length;
    const isInsideFence = ((state.inCodeFence ? 1 : 0) + fenceToggles) % 2 === 1;
    if (isInsideFence) {
      return match;
    }

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
      detected: orphanCount,
      removed: mode === 'sanitize' ? orphanCount : 0,
      sample: '</think>',
      provider,
      model,
      type: 'think-orphan',
    });
  }
  return out;
}

// Strips orphan DSML leaks mid-stream or at tail, preserving tag balance and fail-open (#81)
function sanitizeDsmlSegment(text, state, { mode = 'sanitize', onArtifact, provider = '', model = '' } = {}) {
  if (!text) return text;
  DSML_CLUSTER.lastIndex = 0;

  const out = text.replace(DSML_CLUSTER, (match, offset, fullString) => {
    // Fail-open: check code fence
    const fenceToggles = (fullString.slice(0, offset).match(/```/g) || []).length;
    const isInsideFence = ((state.inCodeFence ? 1 : 0) + fenceToggles) % 2 === 1;
    if (isInsideFence) {
      return match;
    }

    // Fail-open: check inline code
    const before = fullString.slice(0, offset);
    const lastNewline = before.lastIndexOf('\n');
    const lineBefore = lastNewline >= 0 ? before.slice(lastNewline) : before;
    const after = fullString.slice(offset + match.length);
    const nextNewline = after.indexOf('\n');
    const lineAfter = nextNewline >= 0 ? after.slice(0, nextNewline) : after;
    if ((lineBefore.match(/`/g) || []).length % 2 === 1 && lineAfter.includes('`')) {
      return match;
    }

    // If opening tag, increment open count
    if (!match.startsWith('</')) {
      state.totalOpen += 1;
      return match;
    }

    const tagCloses = (match.match(CLOSE_TAG) || []).length || 1;
    const unclosedBefore = state.totalOpen - state.totalClose;

    // If there were unclosed open tags, these closing tags belong to them (fail-open)
    if (unclosedBefore > 0) {
      state.totalClose = Math.min(state.totalOpen, state.totalClose + tagCloses);
      return match;
    }

    // Orphan closing tag / cluster
    onArtifact?.({
      mode,
      detected: tagCloses,
      removed: mode === 'sanitize' ? tagCloses : 0,
      sample: match.trim(),
      provider,
      model,
      type: 'dsml',
    });
    return mode === 'sanitize' ? '' : match;
  });

  const totalFences = (text.match(/```/g) || []).length;
  if (totalFences % 2 === 1) {
    state.inCodeFence = !state.inCodeFence;
  }

  return out;
}

// End-of-stream tail sanitizer
function sanitizeTailArtifacts(text, state, {
  mode = 'sanitize',
  cleanThinkArtifacts = false,
  isStreamEnd = false,
  onArtifact,
  provider = '',
  model = '',
} = {}) {
  if (!text) return text;
  let result = text;

  const unclosedBefore = state.totalOpen - state.totalClose;
  if (unclosedBefore <= 0 && INCOMPLETE_TAIL.test(result)) {
    const incompMatch = result.match(INCOMPLETE_TAIL);
    const incompCloses = incompMatch ? (incompMatch[0].match(CLOSE_TAG) || []).length : 0;
    onArtifact?.({
      mode,
      detected: Math.max(incompCloses, 1),
      removed: mode === 'sanitize' ? Math.max(incompCloses, 1) : 0,
      sample: incompMatch ? incompMatch[0] : '',
      provider,
      model,
      type: 'incomplete-dsml',
    });
    if (mode === 'sanitize') result = result.replace(INCOMPLETE_TAIL, '');
  }

  if (cleanThinkArtifacts) {
    if (TRAILING_THINK_MARKERS.test(result)) {
      const markerMatch = result.match(TRAILING_THINK_MARKERS);
      onArtifact?.({
        mode,
        detected: 1,
        removed: mode === 'sanitize' ? 1 : 0,
        sample: markerMatch ? markerMatch[0] : '',
        provider,
        model,
        type: 'think-marker',
      });
      if (mode === 'sanitize') result = result.replace(TRAILING_THINK_MARKERS, '');
    }

    // Auto-close unclosed <think> ONLY when entire stream finishes (#82)
    if (isStreamEnd && state.thinkDepth > 0) {
      onArtifact?.({
        mode,
        detected: 1,
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
  customTokens = [],
  onArtifact,
  provider = '',
  model = '',
} = {}) {
  if (!text || typeof text !== 'string') return text;
  const state = {
    totalOpen: 0,
    totalClose: 0,
    inCodeFence: false,
    thinkDepth: 0,
  };
  const opts = { mode, cleanThinkArtifacts, onArtifact, provider, model };
  const tokens = normalizeCustomTokens(customTokens);
  let result = cleanThinkArtifacts ? processThinkSegment(text, state, opts) : text;
  const fenceBase = state.inCodeFence;
  result = sanitizeDsmlSegment(result, state, opts);
  result = processCustomSegment(result, fenceBase, tokens, opts);
  result = sanitizeTailArtifacts(result, state, { ...opts, isStreamEnd: true });
  return result;
}

function safeCutIndex(buffer, targetCut) {
  const minScan = Math.max(0, targetCut - MAX_TAG_SCAN);
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
  customTokens = [],
  onArtifact,
  onSessionGuarded,
  provider = '',
  model = '',
} = {}) {
  let p = '';
  let i;
  let rawBlockText = '';
  let emittedBlockText = '';
  let sessionNotified = false;
  const state = { totalOpen: 0, totalClose: 0, inCodeFence: false, thinkDepth: 0 };
  const opts = { mode, cleanThinkArtifacts, onArtifact, provider, model };
  const tokens = normalizeCustomTokens(customTokens);

  const notifySessionOnce = () => {
    if (!sessionNotified) {
      sessionNotified = true;
      onSessionGuarded?.({ provider, model });
    }
  };

  const emitChunkText = (rawSlice, cleanText) => {
    rawBlockText += rawSlice;
    if (cleanText) emittedBlockText += cleanText;
  };

  const flush = async function* (isBlockOrStreamEnd, isStreamEnd = false) {
    if (!p) return;
    const rawP = p;
    let text = cleanThinkArtifacts ? processThinkSegment(p, state, opts) : p;
    const fenceBase = state.inCodeFence;
    text = sanitizeDsmlSegment(text, state, opts);
    text = processCustomSegment(text, fenceBase, tokens, opts);
    if (isBlockOrStreamEnd) {
      text = sanitizeTailArtifacts(text, state, { ...opts, isStreamEnd });
    }
    emitChunkText(rawP, text);
    if (text) yield { type: 'text-delta', index: i, text };
    p = '';
    i = undefined;
  };

  try {
    for await (const c of s) {
      if (c?.type === 'text-delta' && typeof c.text === 'string') {
        if (p && i !== c.index) yield* flush(true, false);
        i = c.index;
        p += c.text;

        if (p.length > KEEP) {
          const target = p.length - KEEP;
          const n = safeCutIndex(p, target);
          if (n > 0) {
            const rawPrefix = p.slice(0, n);
            let emitText = cleanThinkArtifacts ? processThinkSegment(rawPrefix, state, opts) : rawPrefix;
            const fenceBase = state.inCodeFence;
            emitText = sanitizeDsmlSegment(emitText, state, opts);
            emitText = processCustomSegment(emitText, fenceBase, tokens, opts);
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
        yield* flush(false, false);
        yield c;
        continue;
      }

      if (c?.type === 'block-end') {
        const rawP = p;
        let flushedText = '';
        if (p) {
          for await (const chunk of flush(true, false)) {
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
            // Standalone or non-streaming block fallback
            block = {
              ...block,
              text: sanitizeStandaloneText(block.text, {
                mode,
                cleanThinkArtifacts,
                customTokens,
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
        yield* flush(true, true);
        notifySessionOnce();
        yield c;
        continue;
      }

      yield* flush(false, false);
      yield c;
    }
    yield* flush(true, true);
    notifySessionOnce();
  } finally {
    notifySessionOnce();
  }
}

export function unwrapConfig(conf) {
  if (!conf) return {};
  if (typeof conf.get === 'function') {
    try {
      const inner = conf.get();
      const plain = plainConfig(inner);
      return plain && typeof plain === 'object' ? plain : {};
    } catch {
      return {};
    }
  }
  try {
    return plainConfig(Config(conf));
  } catch {
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

  // Dynamic SettingsForms configuration if settings service is available
  const setupSettings = (sctx) => {
    if (sctx.settings && typeof sctx.settings.configure === 'function') {
      const eff = typeof sctx.effect === 'function' ? sctx.effect.bind(sctx) : registerEffect;
      eff(() => sctx.settings.configure({ auto: false }, sctx.fiber), 'dsh-dsml-artifact-guard: settings policy');
    }
  };
  if (Object.prototype.hasOwnProperty.call(ctx, 'settings') && ctx.settings) {
    setupSettings(ctx);
  } else if (typeof ctx.inject === 'function') {
    ctx.inject(['settings'], setupSettings);
  }

  // Dynamic webServer routes registration if webServer service is available (#90)
  const setupWebServer = (wctx) => {
    if (!wctx.webServer || typeof wctx.webServer.register !== 'function') return;
    const eff = typeof wctx.effect === 'function' ? wctx.effect.bind(wctx) : registerEffect;
    eff(() => registerPluginUpdater(wctx, {
      endpoint: '/api/dsh-dsml-artifact-guard/update',
      packageName: '@goodandready/dsh-dsml-artifact-guard',
      manifestUrl: new URL('../package.json', import.meta.url),
    }), 'dsh-dsml-artifact-guard: plugin updater');

    eff(() => registerPluginTelemetry(wctx, {
      endpoint: '/api/dsh-dsml-artifact-guard/stats',
    }), 'dsh-dsml-artifact-guard: plugin telemetry');
  };
  if (Object.prototype.hasOwnProperty.call(ctx, 'webServer') && ctx.webServer) {
    setupWebServer(ctx);
  } else if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], setupWebServer);
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
      customTokens: current.customTokens,
      provider,
      model,
      onArtifact: (x) => {
        recordArtifact(x);
        ctx.logger?.info?.('DSML closing-tag artifact detected', x);
      },
      onSessionGuarded: () => {
        recordSessionGuarded({ provider, model });
      },
    });
  }), 'dsh-dsml-artifact-guard: stream hook');
}


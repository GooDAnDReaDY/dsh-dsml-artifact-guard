import { checkRequestMethod } from './index.js';
import { isLoopback } from './updater.js';

const STATS_HEADER = 'x-dsh-plugin-stats';
const MAX_RECENT_EVENTS = 20;

let stats = {
  totalCleaned: 0,
  sessionsGuarded: 0,
  lastCleanedAt: null,
  lastModel: null,
  lastProvider: null,
  recent: [],
};

export function recordArtifact({ mode = 'sanitize', removed = 1, sample = '', provider = '', model = '', type = 'dsml' } = {}) {
  const count = Number(removed) > 0 ? Number(removed) : 1;
  stats.totalCleaned += count;
  stats.sessionsGuarded += 1;
  stats.lastCleanedAt = new Date().toISOString();
  if (model) stats.lastModel = String(model);
  if (provider) stats.lastProvider = String(provider);

  const event = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: stats.lastCleanedAt,
    mode: String(mode),
    removed: count,
    type: String(type),
    sample: typeof sample === 'string' ? sample.slice(0, 160) : '',
    provider: String(provider || ''),
    model: String(model || ''),
  };

  stats.recent.unshift(event);
  if (stats.recent.length > MAX_RECENT_EVENTS) {
    stats.recent.length = MAX_RECENT_EVENTS;
  }
}

export function getTelemetryStats() {
  return {
    totalCleaned: stats.totalCleaned,
    sessionsGuarded: stats.sessionsGuarded,
    lastCleanedAt: stats.lastCleanedAt,
    lastModel: stats.lastModel,
    lastProvider: stats.lastProvider,
    recent: [...stats.recent],
  };
}

export function resetTelemetryStats() {
  stats = {
    totalCleaned: 0,
    sessionsGuarded: 0,
    lastCleanedAt: null,
    lastModel: null,
    lastProvider: null,
    recent: [],
  };
  return getTelemetryStats();
}

function header(request, name) {
  const value = request?.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function isPrivateLan(value) {
  const address = value?.toLowerCase().replace(/^\[|\]$/g, '');
  if (!address) return false;
  const ipv4 = address.startsWith('::ffff:') ? address.slice(7) : address;
  return (
    ipv4.startsWith('192.168.') ||
    ipv4.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ipv4)
  );
}

export function getConnection(ctx) {
  try {
    const fromCtx = ctx?.reflect?.get
      ? (ctx.reflect.get('connection') || ctx?.connection)
      : (ctx?.get ? (ctx.get('connection') || ctx?.connection) : Reflect.get(ctx || {}, 'connection'));
    if (fromCtx) return fromCtx;
    if (ctx?.root) {
      return getConnection(ctx.root);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function isTrustedTelemetryRequest(request, targetCtx = null) {
  // 1. Core connection auth check
  const conn = getConnection(targetCtx);
  if (conn && typeof conn.requestRejection === 'function') {
    let rejection;
    try {
      rejection = conn.requestRejection(request);
    } catch {
      return false;
    }
    if (rejection !== undefined) return false;
  } else {
    // Fallback when connection service is absent (e.g. standalone tests):
    // Remote must be loopback
    if (!isLoopback(request?.socket?.remoteAddress)) return false;
    const origin = header(request, 'origin');
    if (origin === 'dsh-app://app' || origin === 'dsh-app://app/') {
      // Electron desktop app on loopback
    } else {
      const site = header(request, 'sec-fetch-site');
      if (site !== 'same-origin' && site !== 'none') return false;
      const hostHeader = header(request, 'host');
      if (hostHeader) {
        const host = hostHeader.split(':')[0];
        if (!isLoopback(host) && !isPrivateLan(host)) return false;
      }
    }
  }

  // 2. For POST (reset telemetry): require x-dsh-plugin-stats: 1 and origin verification
  if (request?.method === 'POST') {
    if (header(request, STATS_HEADER) !== '1') return false;
    const origin = header(request, 'origin');
    const host = header(request, 'host');
    if (origin === undefined || host === undefined) return false;
    try {
      const url = new URL(origin);
      if (url.protocol === 'dsh-app:' && url.hostname === 'app') {
        return isLoopback(request?.socket?.remoteAddress);
      }
      return (url.protocol === 'http:' || url.protocol === 'https:')
        && (isLoopback(url.hostname) || isPrivateLan(url.hostname)) && url.host === host;
    } catch {
      return false;
    }
  }

  return true;
}

export const isTrustedStatsRequest = isTrustedTelemetryRequest;

export function registerPluginTelemetry(ctx, options = {}) {
  const endpoint = options.endpoint || '/api/dsh-dsml-artifact-guard/stats';
  return ctx.webServer.register({
    kind: 'exact',
    path: endpoint,
    handler: async (req, res) => {
      try {
        if (!isTrustedStatsRequest(req, ctx)) {
          res.writeHead(403, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          });
          res.end(JSON.stringify({ ok: false, error: 'Rejected non-local or cross-origin telemetry request.' }));
          return;
        }

        if (req.method === 'GET' || req.method === 'HEAD') {
          const payload = getTelemetryStats();
          res.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          });
          res.end(req.method === 'HEAD' ? undefined : JSON.stringify(payload));
          return;
        }

        if (!checkRequestMethod(req, 'POST')) {
          res.writeHead(405, { allow: 'GET, HEAD, POST' });
          res.end();
          return;
        }

        const updatedStats = resetTelemetryStats();
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, stats: updatedStats }));
      } catch (error) {
        ctx.logger?.warn?.(`[dsh-dsml-artifact-guard] telemetry error: ${String(error)}`);
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Internal telemetry error' }));
      }
    },
  });
}

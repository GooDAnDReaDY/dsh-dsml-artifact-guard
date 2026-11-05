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

export function isTrustedStatsRequest(request) {
  if (header(request, STATS_HEADER) !== '1') return false;
  const site = header(request, 'sec-fetch-site');
  if (site !== undefined && site !== 'same-origin') return false;
  const origin = header(request, 'origin');
  const host = header(request, 'host');
  if (origin === undefined || host === undefined) return false;
  try {
    const url = new URL(origin);
    if (url.protocol === 'dsh-app:' && url.hostname === 'app') {
      return isLoopback(request.socket?.remoteAddress);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.host.toLowerCase() !== host.toLowerCase()) return false;
    if (isLoopback(url.hostname)) {
      return isLoopback(request.socket?.remoteAddress);
    }
    return site === 'same-origin';
  } catch {
    return false;
  }
}

export function registerPluginTelemetry(ctx, options = {}) {
  const endpoint = options.endpoint || '/api/dsh-dsml-artifact-guard/stats';
  return ctx.webServer.register({
    kind: 'exact',
    path: endpoint,
    handler: async (req, res) => {
      try {
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
        if (!isTrustedStatsRequest(req)) {
          res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'Untrusted or cross-origin request rejected.' }));
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

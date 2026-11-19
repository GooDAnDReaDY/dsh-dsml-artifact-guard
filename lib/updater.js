import { spawn } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRequestMethod, isLoopback, isTrustedRequest } from './request-trust.js';

export { isLoopback };

const UPDATE_HEADER = 'x-dsh-plugin-update';
const UPDATE_TIMEOUT_MS = 10 * 60000;
const VERSION_CACHE_MS = 5 * 60000;
let latestCache;

export function isTrustedUpdateRequest(request, targetCtx = null) {
  return isTrustedRequest(request, {
    targetCtx,
    requiredHeader: UPDATE_HEADER,
    requireHeaderOnOmittedMethod: true,
    requireLoopbackOnMutation: true,
  });
}

function validProfileName(value) {
  return typeof value === 'string' && value !== '' && value !== '.' && value !== '..'
    && !value.includes('/') && !value.includes('\\') && !/[\0-\x1f\x7f]/.test(value);
}

function profileNameFromArgv(argv) {
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--profile') return argv[index + 1];
    if (argv[index]?.startsWith('--profile=')) return argv[index].slice('--profile='.length);
  }
  // DSH profile subcommand: `dsh web`, `dsh desktop`, ...
  if (argv[2] === 'web') return 'web';
  return undefined;
}

function realOrSelf(value) {
  try {
    return realpathSync(value);
  } catch {
    return value;
  }
}

function findDshCliEntry(value, cwd) {
  if (typeof value !== 'string' || value === '') return undefined;
  const resolved = value.startsWith('file:') ? fileURLToPath(value) : resolve(cwd, value);
  if (!existsSync(resolved)) return undefined;
  const entry = realOrSelf(resolved);
  for (let directory = dirname(entry); ; directory = dirname(directory)) {
    const manifestPath = resolve(directory, 'package.json');
    if (existsSync(manifestPath)) {
      let manifest = null;
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch {
        manifest = null;
      }
      if (manifest) {
        const bin = typeof manifest.bin === 'string'
          ? manifest.bin
          : (typeof manifest.bin === 'object' && manifest.bin !== null ? manifest.bin.dsh : undefined);
        if (manifest.name === '@deepseek-ai/dsh' && typeof bin === 'string'
          && !isAbsolute(bin) && realOrSelf(resolve(directory, bin)) === entry) {
          return entry;
        }
      }
    }
    const parent = dirname(directory);
    if (parent === directory) return undefined;
  }
}

export function parseSemver(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

function compareIdentifiers(a, b) {
  const aNum = Number(a);
  const bNum = Number(b);
  const aIsNum = Number.isInteger(aNum) && String(aNum) === a;
  const bIsNum = Number.isInteger(bNum) && String(bNum) === b;
  if (aIsNum && bIsNum) return aNum - bNum;
  if (aIsNum) return -1;
  if (bIsNum) return 1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function isNewerVersion(current, latest) {
  const c = parseSemver(current);
  const l = parseSemver(latest);
  if (!c || !l) return false;
  if (l.major !== c.major) return l.major > c.major;
  if (l.minor !== c.minor) return l.minor > c.minor;
  if (l.patch !== c.patch) return l.patch > c.patch;
  if (c.prerelease.length === 0 && l.prerelease.length === 0) return false;
  if (c.prerelease.length === 0) return false;
  if (l.prerelease.length === 0) return true;
  const len = Math.max(c.prerelease.length, l.prerelease.length);
  for (let idx = 0; idx < len; idx += 1) {
    if (c.prerelease[idx] === undefined) return true;
    if (l.prerelease[idx] === undefined) return false;
    const diff = compareIdentifiers(l.prerelease[idx], c.prerelease[idx]);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

export function runtime(options = {}) {
  const env = options.env ?? process.env;
  const argv = options.argv ?? process.argv;
  const cwd = options.cwd ?? process.cwd();
  const dshHome = isAbsolute(env.DSH_HOME ?? '') ? env.DSH_HOME : resolve(homedir(), '.dsh');

  let profileName;
  let profileDir;
  if (isAbsolute(env.DSH_PROFILE_DIR ?? '')) {
    const candidate = resolve(env.DSH_PROFILE_DIR);
    if (validProfileName(basename(candidate))) {
      profileDir = candidate;
      profileName = basename(candidate);
    }
  }
  if (!profileName) {
    const selected = profileNameFromArgv(argv);
    if (validProfileName(selected)) profileName = selected;
    else if (validProfileName(env.DSH_PROFILE)) profileName = env.DSH_PROFILE;
  }
  if (!profileName) {
    const directPatch = resolve(cwd, 'cordis.patch.yml');
    const directConfig = resolve(cwd, 'cordis.yml');
    if (existsSync(directPatch) || existsSync(directConfig)) profileName = basename(cwd);
  }
  if (!profileName) profileName = 'web';
  if (!profileDir) profileDir = resolve(dshHome, 'profiles', profileName);

  return { profileName, profileDir, cliEntry: findDshCliEntry(argv[1], cwd) };
}

export async function latestVersion(packageName, registry = 'https://registry.npmjs.org', { fetchFn = fetch } = {}) {
  if (latestCache && latestCache.packageName === packageName && latestCache.registry === registry && latestCache.expiresAt > Date.now()) {
    return latestCache.version;
  }
  const cleanRegistry = registry.replace(/\/+$/, '');
  const url = `${cleanRegistry}/${packageName.replace('/', '%2f')}/latest`;
  try {
    const res = await fetchFn(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return undefined;
    const value = await res.json();
    if (typeof value.version !== 'string' || value.version === '') return undefined;
    latestCache = { packageName, registry, version: value.version, expiresAt: Date.now() + VERSION_CACHE_MS };
    return value.version;
  } catch {
    return undefined;
  }
}

export async function currentVersion(manifestUrl) {
  const raw = await readFile(manifestUrl, 'utf8');
  const value = JSON.parse(raw);
  if (typeof value.version !== 'string' || value.version === '') throw new Error('Cannot read current plugin version.');
  return value.version;
}

export async function getUpdateStatus(options, target = runtime(), { fetchFn = fetch } = {}) {
  const current = await currentVersion(options.manifestUrl);
  const latest = await latestVersion(options.packageName, options.registry ?? 'https://registry.npmjs.org', { fetchFn });
  return {
    packageName: options.packageName,
    currentVersion: current,
    ...(latest === undefined ? {} : { latestVersion: latest }),
    latestCheckFailed: latest === undefined,
    updateAvailable: latest !== undefined && isNewerVersion(current, latest),
    profileName: target.profileName,
    canAutoUpdate: target.cliEntry !== undefined,
  };
}

export async function installExact(target, packageSpec, options = {}, { spawnFn = spawn } = {}) {
  if (target.cliEntry === undefined) throw new Error('Automatic update is unavailable in this runtime.');
  if (!existsSync(target.profileDir)) throw new Error(`DSH profile directory not found: ${target.profileDir}`);
  return new Promise((resolvePromise, reject) => {
    const args = [
      target.cliEntry, 'plugin', '--profile', target.profileName, 'add',
      packageSpec,
      `--registry=${options.registry ?? 'https://registry.npmjs.org/'}`,
    ];
    const child = spawnFn(process.execPath, args, {
      cwd: target.profileDir,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1' },
    });
    let detail = '';
    child.stdout?.on('data', chunk => { detail = (detail + String(chunk)).slice(-4000); });
    child.stderr?.on('data', chunk => { detail = (detail + String(chunk)).slice(-4000); });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Update timed out; use the normal DSH update flow.'));
    }, options.timeoutMs ?? UPDATE_TIMEOUT_MS);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else reject(new Error(detail.trim() || `Update exited with code ${String(code)}.`));
    });
  });
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

export function registerPluginUpdater(ctx, options = {}, { spawnFn = spawn, fetchFn = fetch } = {}) {
  let installing = false;
  return ctx.webServer.register({
    kind: 'exact',
    path: options.endpoint || '/api/dsh-dsml-artifact-guard/update',
    handler: async (req, res) => {
      try {
        if (!isTrustedUpdateRequest(req, ctx)) {
          ctx.logger?.warn?.(`[dsh-dsml-artifact-guard] Rejected untrusted or non-loopback updater request: method=${req?.method} remote=${req?.socket?.remoteAddress}`);
          sendJson(res, 403, { ok: false, error: 'Untrusted or cross-origin request rejected.' });
          return;
        }
        const target = runtime();
        if (req.method === 'GET' || req.method === 'HEAD') {
          const payload = await getUpdateStatus(options, target, { fetchFn });
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
        if (installing) {
          sendJson(res, 409, { ok: false, error: 'This plugin is already updating.' });
          return;
        }
        installing = true;
        try {
          const before = await getUpdateStatus(options, target, { fetchFn });
          if (before.latestVersion === undefined) {
            sendJson(res, 503, { ok: false, error: 'The latest version is temporarily unavailable.' });
            return;
          }
          if (!before.updateAvailable) {
            sendJson(res, 200, { ...before, ok: true, updated: false, message: 'Already up to date.' });
            return;
          }
          ctx.logger?.info?.(`[dsh-dsml-artifact-guard] Installing update ${options.packageName}@${before.latestVersion} on profile ${target.profileName}`);
          await installExact(target, `${options.packageName}@${before.latestVersion}`, options, { spawnFn });
          sendJson(res, 200, {
            ...before,
            ok: true,
            updated: true,
            updatedVersion: before.latestVersion,
            restartRequired: true,
          });
        } finally {
          installing = false;
        }
      } catch (error) {
        ctx.logger?.warn?.(`[dsh-dsml-artifact-guard] plugin updater failed: ${String(error)}`);
        sendJson(res, 503, { ok: false, error: 'Plugin update failed; see server logs.' });
      }
    },
  });
}


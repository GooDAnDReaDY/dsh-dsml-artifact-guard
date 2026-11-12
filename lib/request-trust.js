export function header(request, name) {
  const value = request?.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function isLoopback(value) {
  const address = value?.toLowerCase().replace(/^\[|\]$/g, '');
  return address === 'localhost' || address === 'localhost.' || address === '::1'
    || address?.startsWith('127.') === true
    || address?.startsWith('::ffff:127.') === true;
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

function isLocalOrLanHost(hostHeader) {
  if (!hostHeader) return true;
  const host = hostHeader.split(':')[0];
  return isLoopback(host) || isPrivateLan(host);
}

/**
 * Validates HTTP requests against DSH core session authentication (`connection.requestRejection`)
 * when available, falling back strictly to loopback + local/same-origin checks otherwise.
 */
export function isTrustedRequest(request, {
  targetCtx = null,
  requiredHeader = null,
  requireHeaderOnOmittedMethod = false,
} = {}) {
  const method = request?.method;
  const isRead = method === 'GET' || method === 'HEAD';
  const isMutating = method === 'POST' || (method === undefined && requireHeaderOnOmittedMethod);

  // Never admit explicit cross-site browser fetches even if a connection service is permissive
  const site = header(request, 'sec-fetch-site');
  if (isMutating) {
    if (site !== undefined && site !== 'same-origin') return false;
  } else if (site !== undefined && site !== 'same-origin' && site !== 'none') {
    return false;
  }

  const conn = getConnection(targetCtx);
  const hasCoreAuth = Boolean(conn && typeof conn.requestRejection === 'function');
  if (hasCoreAuth) {
    let rejection;
    try {
      rejection = conn.requestRejection(request);
    } catch {
      return false;
    }
    if (rejection !== undefined) return false;
  } else {
    if (!isLoopback(request?.socket?.remoteAddress)) return false;
    const origin = header(request, 'origin');
    const isDesktopApp = origin === 'dsh-app://app' || origin === 'dsh-app://app/';
    if (!isDesktopApp) {
      if (site !== 'same-origin' && (!isRead || site !== 'none')) return false;
      if (!isLocalOrLanHost(header(request, 'host'))) return false;
    }
  }

  if (isMutating) {
    if (requiredHeader && header(request, requiredHeader) !== '1') return false;
    const origin = header(request, 'origin');
    const host = header(request, 'host');
    if (origin === undefined || host === undefined) return false;
    try {
      const url = new URL(origin);
      if (url.protocol === 'dsh-app:' && url.hostname === 'app') {
        return isLoopback(request?.socket?.remoteAddress);
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
      if (url.host.toLowerCase() !== host.toLowerCase()) return false;
      if (!hasCoreAuth && !isLoopback(url.hostname) && !isPrivateLan(url.hostname)) return false;
      return true;
    } catch {
      return false;
    }
  }

  return true;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { isLoopback, isTrustedUpdateRequest, parseSemver, isNewerVersion } from '../lib/updater.js';

test('isLoopback identifies loopback IP addresses and localhost', () => {
  assert.equal(isLoopback('127.0.0.1'), true);
  assert.equal(isLoopback('::1'), true);
  assert.equal(isLoopback('::ffff:127.0.0.1'), true);
  assert.equal(isLoopback('localhost'), true);
  assert.equal(isLoopback('192.168.1.111'), false);
  assert.equal(isLoopback('10.0.0.1'), false);
  assert.equal(isLoopback(undefined), false);
});

test('parseSemver and isNewerVersion compare versions properly including prerelease', () => {
  assert.equal(isNewerVersion('0.1.5', '0.2.0'), true);
  assert.equal(isNewerVersion('0.2.0', '0.1.5'), false);
  assert.equal(isNewerVersion('0.1.5', '0.1.5'), false);
  assert.equal(isNewerVersion('0.2.0-rc.1', '0.2.0'), true);
  assert.equal(isNewerVersion('0.2.0', '0.2.0-rc.1'), false);
  assert.equal(isNewerVersion('0.2.0-rc.1', '0.2.0-rc.2'), true);
});

test('isTrustedUpdateRequest validates headers, loopback and origin', () => {
  const validReq = {
    headers: {
      'x-dsh-plugin-update': '1',
      'sec-fetch-site': 'same-origin',
      origin: 'http://127.0.0.1:3080',
      host: '127.0.0.1:3080',
    },
    socket: { remoteAddress: '127.0.0.1' },
  };
  assert.equal(isTrustedUpdateRequest(validReq), true);

  const missingHeader = { ...validReq, headers: { ...validReq.headers, 'x-dsh-plugin-update': '0' } };
  assert.equal(isTrustedUpdateRequest(missingHeader), false);

  const remoteReq = { ...validReq, socket: { remoteAddress: '192.168.1.50' } };
  assert.equal(isTrustedUpdateRequest(remoteReq), false);

  const crossOrigin = { ...validReq, headers: { ...validReq.headers, 'sec-fetch-site': 'cross-site' } };
  assert.equal(isTrustedUpdateRequest(crossOrigin), false);

  const lanReq = {
    headers: {
      'x-dsh-plugin-update': '1',
      'sec-fetch-site': 'same-origin',
      origin: 'http://192.168.1.111:3080',
      host: '192.168.1.111:3080',
    },
    socket: { remoteAddress: '192.168.1.50' },
  };
  assert.equal(isTrustedUpdateRequest(lanReq), true);
});

import { checkRequestMethod } from "../lib/index.js";
test("checkRequestMethod validates HTTP method", () => {
  assert.equal(checkRequestMethod({ method: "POST" }, "POST"), true);
  assert.equal(checkRequestMethod({ method: "GET" }, "POST"), false);
});

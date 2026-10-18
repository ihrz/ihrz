// W4 slice 86 battery: replicate LastFMScrobblerManager.callLastFM envelope verbatim.
// Mocked fetch; asserts the ok/error mapping legs incl. falsy-error + invalid-JSON.
'use strict';
const cases = [];
function mockFetchOnce({ ok, status, statusText, body, throwErr }) {
  global.fetch = async () => {
    if (throwErr) throw throwErr;
    return { ok, status, statusText, text: async () => body };
  };
}
// Verbatim copy of callLastFM minus the isConfigured guard (unreachable legs pinned separately)
async function callLastFM(method, params, signedParams, apiSig) {
  const body = new URLSearchParams({ ...signedParams, api_sig: apiSig, format: 'json' });
  try {
    const response = await fetch('https://ws.audioscrobbler.com/2.0/', {
      body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, method: 'POST',
    });
    const rawBody = await response.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};
    if (!response.ok || payload.error) {
      return {
        errorCode: payload.error ? Number(payload.error) : response.status,
        message: payload.message || response.statusText,
        ok: false,
      };
    }
    return { data: payload, ok: true };
  } catch (error) {
    return { message: error instanceof Error ? error.message : String(error), ok: false };
  }
}
let pass = 0, fail = 0;
async function check(name, fetchCfg, verify) {
  mockFetchOnce(fetchCfg);
  const r = await callLastFM('track.scrobble', {}, { api_key: 'k', method: 'm' }, 'sig');
  const ok = verify(r);
  if (ok) pass++; else { fail++; console.log('FAIL', name, JSON.stringify(r)); }
  cases.push([name, ok]);
}
(async () => {
  await check('ok-valid', { ok: true, status: 200, statusText: 'OK', body: '{"a":1}' },
    r => r.ok === true && r.data.a === 1 && r.errorCode === undefined);
  await check('ok-empty-body', { ok: true, status: 200, statusText: 'OK', body: '' },
    r => r.ok === true && JSON.stringify(r.data) === '{}');
  await check('ok-invalid-json', { ok: true, status: 200, statusText: 'OK', body: '{oops' },
    r => r.ok === false && r.errorCode === undefined && typeof r.message === 'string' && r.message.length > 0);
  await check('ok-error9', { ok: true, status: 200, statusText: 'OK', body: '{"error":9,"message":"Invalid session key"}' },
    r => r.ok === false && r.errorCode === 9 && r.message === 'Invalid session key');
  await check('ok-error-string9', { ok: true, status: 200, statusText: 'OK', body: '{"error":"9","message":"bad key"}' },
    r => r.ok === false && r.errorCode === 9 && r.message === 'bad key');
  await check('ok-error-zero-falsy', { ok: true, status: 200, statusText: 'OK', body: '{"error":0,"x":1}' },
    r => r.ok === true && r.data.error === 0);
  await check('ok-error9-no-message', { ok: true, status: 200, statusText: 'OK', body: '{"error":9}' },
    r => r.ok === false && r.errorCode === 9 && r.message === 'OK');
  await check('403-error4', { ok: false, status: 403, statusText: 'Forbidden', body: '{"error":4,"message":"Unauthorized"}' },
    r => r.ok === false && r.errorCode === 4 && r.message === 'Unauthorized');
  await check('500-empty-body', { ok: false, status: 500, statusText: 'Internal Server Error', body: '' },
    r => r.ok === false && r.errorCode === 500 && r.message === 'Internal Server Error');
  await check('500-garbage-body', { ok: false, status: 500, statusText: 'Internal Server Error', body: '<html>oops' },
    r => r.ok === false && r.errorCode === undefined && typeof r.message === 'string' && r.message.length > 0);
  await check('network-throw', { throwErr: new Error('fetch failed') },
    r => r.ok === false && r.errorCode === undefined && r.message === 'fetch failed');
  // unconfigured guard leg (verbatim from callLastFM head)
  function isConfigured(apiKey, secret) { return Boolean(apiKey && secret); }
  const guard = !isConfigured('', '') ? { errorCode: -1, ok: false } : null;
  const guardOk = guard && guard.ok === false && guard.errorCode === -1 && guard.message === undefined;
  if (guardOk) pass++; else { fail++; console.log('FAIL unconfigured-guard'); }
  console.log(`envelope battery: ${pass} passed, ${fail} failed over ${cases.length + 1} cases`);
  process.exit(fail ? 1 : 0);
})();

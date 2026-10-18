// W4 slice 73 battery: replicate lastFMScrobblerManager.ts
// `generateUserEmbed` field legs verbatim (no discord.js needed — the
// three value expressions are pure).
const status = (enabled) => (enabled ? 'Enabled' : 'Disabled');
const account = (username) => username || 'None';
const connectedField = (connectedAt) =>
  connectedAt ? `<t:${Math.floor(connectedAt / 1000)}:F>` : null;

const cases = [
  // [name, fn, input, expected]
  ['status-true', status, true, 'Enabled'],
  ['status-false', status, false, 'Disabled'],
  ['status-undefined', status, undefined, 'Disabled'],
  ['status-null', status, null, 'Disabled'],
  ['status-0', status, 0, 'Disabled'],
  ['status-1', status, 1, 'Enabled'],
  ['account-name', account, 'kisa_fm', 'kisa_fm'],
  ['account-undefined', account, undefined, 'None'],
  ['account-null', account, null, 'None'],
  ['account-empty', account, '', 'None'],
  ['account-space', account, ' ', ' '],
  ['conn-missing', connectedField, undefined, null],
  ['conn-null', connectedField, null, null],
  ['conn-zero', connectedField, 0, null],
  ['conn-login-ms', connectedField, 1700000000000, '<t:1700000000:F>'],
  ['conn-subsec-999', connectedField, 999, '<t:0:F>'],
  ['conn-1500', connectedField, 1500, '<t:1:F>'],
  ['conn-floor', connectedField, 1699999999999, '<t:1699999999:F>'],
  ['conn-neg-500', connectedField, -500, '<t:-1:F>'],
  ['conn-neg-1000', connectedField, -1000, '<t:-1:F>'],
  ['conn-neg-1500', connectedField, -1500, '<t:-2:F>'],
];

let fail = 0;
for (const [name, fn, input, want] of cases) {
  const got = fn(input);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}
console.log(fail === 0 ? 'GREEN 22/22' : `RED ${fail} failures`);
process.exit(fail === 0 ? 0 : 1);

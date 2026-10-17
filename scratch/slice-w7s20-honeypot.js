// W7 slice 20 battery: src/Events/honeypot/honeypot.ts run() gates verbatim.
const ANY_BITS = new Set(['Administrator', 'ManageGuild', 'BanMembers', 'KickMembers']);
function mkPerms(...bits) {
  const s = new Set(bits);
  return { any: (want) => want.some((b) => s.has(b)) };
}
function run(msg, config) {
  if (!msg.guild || !msg.channel || msg.author.bot || msg.webhookId) return 'early';
  if (msg.member?.permissions.any(['Administrator', 'ManageGuild', 'BanMembers', 'KickMembers'])) return 'staff';
  if (!config?.enabled || !config.channelId || msg.channelId !== config.channelId) return 'config-skip';
  return 'schedule';
}
const base = { guild: { id: 'g' }, channel: { id: 'c' }, author: { bot: false }, webhookId: null, member: undefined, channelId: '123' };
const cfg = { enabled: true, channelId: '123' };
const legs = [
  ['bot msg', { ...base, author: { bot: true } }, cfg, 'early'],
  ['webhook msg', { ...base, webhookId: 'w1' }, cfg, 'early'],
  ['no guild', { ...base, guild: null }, cfg, 'early'],
  ['admin staff', { ...base, member: { permissions: mkPerms('Administrator') } }, cfg, 'staff'],
  ['manage-guild staff', { ...base, member: { permissions: mkPerms('ManageGuild') } }, cfg, 'staff'],
  ['ban staff', { ...base, member: { permissions: mkPerms('BanMembers') } }, cfg, 'staff'],
  ['kick staff', { ...base, member: { permissions: mkPerms('KickMembers') } }, cfg, 'staff'],
  ['non-staff proceeds', { ...base, member: { permissions: mkPerms('SendMessages') } }, cfg, 'schedule'],
  ['no member proceeds', { ...base, member: undefined }, cfg, 'schedule'],
  ['null member proceeds', { ...base, member: null }, cfg, 'schedule'],
  ['null config', base, null, 'config-skip'],
  ['undefined config', base, undefined, 'config-skip'],
  ['disabled', base, { enabled: false, channelId: '123' }, 'config-skip'],
  ['empty channelId', base, { enabled: true, channelId: '' }, 'config-skip'],
  ['missing channelId', base, { enabled: true }, 'config-skip'],
  ['ws channelId vs 123', base, { enabled: true, channelId: ' ' }, 'config-skip'],
  ['padded channelId vs 123', base, { enabled: true, channelId: ' 123 ' }, 'config-skip'],
  ['mismatch', base, { enabled: true, channelId: '999' }, 'config-skip'],
  ['exact match', base, cfg, 'schedule'],
  ['numeric channelId 123 vs "123"', { ...base, channelId: 123 }, cfg, 'config-skip'],
  ['string enabled proceeds', base, { enabled: 'false', channelId: '123' }, 'schedule'],
];
let fail = 0;
for (const [name, m, c, want] of legs) {
  const got = run(m, c);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'ok' : 'FAIL'} ${name}: got=${got} want=${want}`);
}
console.log(fail === 0 ? 'GREEN 21/21' : `RED ${fail} failures`);

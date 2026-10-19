// W7 slice 67 battery: protection/ready.ts backupGuildStructure partition,
// isRaiding loop control, ChannelType numerics, getLogs LOG_SETS dedup.
const {
  CategoryChannel, TextChannel, VoiceChannel, StageChannel, NewsChannel,
  ForumChannel, MediaChannel, ThreadChannel, ChannelType,
} = require('discord.js');

const out = [];
const eq = (name, a, b) => out.push(`${a === b ? 'PASS' : 'FAIL'} ${name}: ts=${JSON.stringify(a)}`);

// ---- A. partition verdict per channel kind ----
// TS: CategoryChannel -> categories; else instanceof GuildChannel &&
// (type === GuildText || isTextBased()) -> channels; else skipped.
const PROTO = {
  Text: TextChannel.prototype, Voice: VoiceChannel.prototype,
  Stage: StageChannel.prototype, News: NewsChannel.prototype,
  Forum: ForumChannel.prototype, Media: MediaChannel.prototype,
  Thread: ThreadChannel.prototype, Category: CategoryChannel.prototype,
};
const KINDNUM = {
  Text: ChannelType.GuildText, Voice: ChannelType.GuildVoice,
  Stage: ChannelType.GuildStageVoice, News: ChannelType.GuildAnnouncement,
  Forum: ChannelType.GuildForum, Media: ChannelType.GuildMedia,
  Thread: ChannelType.PublicThread, Category: ChannelType.GuildCategory,
};
// 'messages' in this is the real isTextBased body (BaseChannel.js:130).
// Source-verified carriers: BaseGuildTextChannel (Text/News),
// BaseGuildVoiceChannel (Voice/Stage), ThreadChannel. Forum/Media extend
// ThreadOnlyChannel (no messages), Category has none.
const HAS_MESSAGES = new Set(['Text', 'News', 'Voice', 'Stage', 'Thread']);
for (const [k, proto] of Object.entries(PROTO)) {
  const ch = Object.create(proto);
  ch.type = KINDNUM[k];
  if (HAS_MESSAGES.has(k)) ch.messages = {};
  let verdict;
  try {
    if (ch instanceof CategoryChannel) verdict = 'categories';
    else if (ch instanceof (require('discord.js').GuildChannel) && (ch.type === ChannelType.GuildText || ch.isTextBased())) verdict = 'channels';
    else verdict = 'skipped';
  } catch (e) { verdict = 'THREW:' + e.constructor.name; }
  let tb;
  try { tb = ch.isTextBased(); } catch (e) { tb = 'THREW:' + e.constructor.name; }
  out.push(`CLASS ${k}(type=${KINDNUM[k]}): ${verdict} isTextBased=${tb}`);
}
eq('ChannelType numerics Text/Voice/Cat/News/Stage/Forum/Media/PubThread',
  [KINDNUM.Text, KINDNUM.Voice, KINDNUM.Category, KINDNUM.News, KINDNUM.Stage, KINDNUM.Forum, KINDNUM.Media, KINDNUM.Thread].join(','),
  '0,2,4,5,13,15,16,11');

// ---- B. isRaiding loop control ----
// verbatim: for (guild of guilds) { if (isRaiding.get(id)) return; snap(id); }
function tsPass(order, raiding) {
  const snapped = [];
  for (const g of order) { if (raiding.has(g)) return snapped; snapped.push(g); }
  return snapped;
}
eq('raid-first aborts rest', tsPass(['A', 'B', 'C'], new Set(['A'])).join(','), '');
eq('raid-middle aborts tail', tsPass(['A', 'B', 'C'], new Set(['B'])).join(','), 'A');
eq('raid-last snaps rest', tsPass(['A', 'B', 'C'], new Set(['C'])).join(','), 'A,B');
eq('no-raid snaps all', tsPass(['A', 'B', 'C'], new Set()).join(','), 'A,B,C');

// ---- C. LOG_SETS dedup cube ----
function makeGetLogs() {
  const sets = { PROTECTION: new Set(), LOGS: new Set(), NONE: null };
  return (id, type) => {
    const s = sets[type];
    if (s?.has(id)) return undefined;
    s?.add(id);
    return id;
  };
}
const g = makeGetLogs();
eq('PROT->PROT blocked', g('e1', 'PROTECTION') === 'e1' && g('e1', 'PROTECTION'), undefined);
eq('LOGS->LOGS blocked', g('e2', 'LOGS') === 'e2' && g('e2', 'LOGS'), undefined);
eq('PROT->LOGS allowed', g('e3', 'PROTECTION') === 'e3' && g('e3', 'LOGS'), 'e3');
eq('LOGS->PROT allowed', g('e4', 'LOGS') === 'e4' && g('e4', 'PROTECTION'), 'e4');
eq('NONE never dedups', g('e5', 'NONE') === 'e5' && g('e5', 'NONE'), 'e5');
eq('NONE->PROT allowed', g('e5', 'PROTECTION'), 'e5');

// ---- D. find-gate: executorId '' / missing, target null coercion ----
const BOT = 'bot9';
function find(entries, target, now) {
  return entries.find((e) => {
    const m = e.targetId === target;
    const nb = e.executorId !== BOT;
    const he = Boolean(e.executorId);
    const rec = e.createdTimestamp > now - 20_000;
    return m && nb && he && rec;
  });
}
const NOW = 1_000_000;
eq('empty-string executor skipped', find([{ targetId: 't', executorId: '', createdTimestamp: NOW }], 't', NOW), undefined);
eq('boundary exactly 20000 NOT recent', find([{ targetId: 't', executorId: 'x', createdTimestamp: NOW - 20_000 }], 't', NOW), undefined);
eq('19999 recent', !!find([{ targetId: 't', executorId: 'x', createdTimestamp: NOW - 19_999 }], 't', NOW), true);

console.log(out.join('\n'));
const fails = out.filter((l) => l.startsWith('FAIL')).length;
console.log(fails === 0 ? 'BATTERY GREEN' : `BATTERY ${fails} FAILURES`);

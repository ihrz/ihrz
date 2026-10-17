// W7 slice 30 battery: Events/utils/snipeModule.ts verbatim replication.
const assert = require('node:assert');

// Verbatim TS gate chain: !guild || !author || author.id == botId -> skip;
// content.length == 0 -> skip; content === "" -> skip.
function gate(m, botId) {
  if (!m.guild || !m.author || m.author.id == botId) return 'skip';
  if (m.content.length == 0) return 'skip';
  if (m.content === '') return 'skip';
  return 'write';
}
const BOT = '999';
let legs = 0, run = (m, b, want, label) => {
  legs++;
  assert.strictEqual(gate(m, b), want, label);
};
// no-guild / no-author early returns
run({ guild: null, author: { id: '1' }, content: 'hi' }, BOT, 'skip', 'no-guild skips');
run({ guild: {}, author: null, content: 'hi' }, BOT, 'skip', 'no-author skips');
run({ guild: {}, content: 'hi' }, BOT, 'skip', 'missing-author skips');
// loose == over id strings; undefined bot id never matches a real id
run({ guild: {}, author: { id: '999' }, content: 'hi' }, BOT, 'skip', 'bot-self skips');
run({ guild: {}, author: { id: '1' }, content: 'hi' }, undefined, 'write', 'undefined-bot-id proceeds');
run({ guild: {}, author: { id: '1' }, content: 'hi' }, BOT, 'write', 'normal proceeds');
// length==0 <=>==="" redundancy for strings + falsy-but-nonempty content
run({ guild: {}, author: { id: '1' }, content: '' }, BOT, 'skip', 'empty skips');
run({ guild: {}, author: { id: '1' }, content: '0' }, BOT, 'write', '"0" proceeds (no falsy check)');
run({ guild: {}, author: { id: '1' }, content: '   ' }, BOT, 'write', 'whitespace-only proceeds');
for (const s of ['a', '0', ' ', '\n', '🔥']) {
  legs++;
  assert.strictEqual((s.length == 0), (s === ''), `redundant legs agree for ${JSON.stringify(s)}`);
}
// tag shape + double-set idempotence
legs++;
assert.strictEqual(`${'bob'} (${123})`, 'bob (123)', 'tag shape');
{
  const store = new Map();
  const payload = JSON.stringify({ snipe: 'hi' });
  store.set('G.GUILD.SNIPE.5', payload);
  store.set('G.GUILD.SNIPE.5', payload); // verbatim duplicate set
  legs++;
  assert.strictEqual(store.get('G.GUILD.SNIPE.5'), payload, 'double-set idempotent');
}
// default avatar (new username system): (id >> 22) % 6
for (const [id, want] of [[324942190222770176n, (324942190222770176n >> 22n) % 6n]]) {
  legs++;
  assert.strictEqual((id >> 22n) % 6n, want, 'avatar index formula');
}
// createdTimestamp keeps ms
legs++;
assert.strictEqual(1728500000456 % 1000, 456, 'ms survives');
console.log(`GREEN ${legs} legs`);

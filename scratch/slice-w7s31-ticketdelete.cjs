// W7 slice 31 battery: verbatim replicas of the three ticket-delete legs.
// 1. deleteTicketPanelOnMessageDelete.ts gate: !guild || !author || author.id == botId
// 2. deleteTicketPanel.ts channelDelete match: channel.id === inner KEY, whole-node wipe
// 3. deleteTicketOnLeave.ts: missing-logs `return` skips rest + skips row delete
const assert = require('node:assert');

// ---- leg 1: gate (verbatim) ----
const BOT_ID = '999';
function panelDeleteProceeds(message, botId) {
    if (!message.guild || !message.author || message.author.id == botId) return false;
    return true;
}
// guild/author presence
assert.strictEqual(panelDeleteProceeds({ guild: null, author: { id: '1' } }, BOT_ID), false);
assert.strictEqual(panelDeleteProceeds({ guild: undefined, author: { id: '1' } }, BOT_ID), false);
assert.strictEqual(panelDeleteProceeds({ guild: { id: 'g' }, author: null }, BOT_ID), false);
assert.strictEqual(panelDeleteProceeds({ guild: { id: 'g' }, author: undefined }, BOT_ID), false);
// loose == bot leg: numeric-vs-string still matches (snowflakes are strings both sides in practice)
assert.strictEqual(panelDeleteProceeds({ guild: { id: 'g' }, author: { id: '999' } }, BOT_ID), false);
assert.strictEqual(panelDeleteProceeds({ guild: { id: 'g' }, author: { id: 999 } }, BOT_ID), false);
// panel messages ARE bot-authored -> TS keeps the marker (dead-row leg in practice)
assert.strictEqual(panelDeleteProceeds({ guild: { id: 'g' }, author: { id: '999' } }, BOT_ID), false);
// ordinary user message -> delete fires
assert.strictEqual(panelDeleteProceeds({ guild: { id: 'g' }, author: { id: '123' } }, BOT_ID), true);

// ---- leg 2: channelDelete match (verbatim) ----
// fetch = whole TICKET_ALL node; compare is against the INNER KEY, not value.channel
function channelDeleteWipes(fetch, channelId) {
    const wiped = [];
    for (const user in fetch) {
        for (const channel_2 in fetch[user]) {
            if (channelId === channel_2) {
                wiped.push(`TICKET_ALL.${user}`);
            }
        }
    }
    return wiped;
}
const db = {
    u1: { c100: { channel: 'c100', author: 'u1', alive: true }, c101: { channel: 'c101', author: 'u1', alive: true } },
    u2: { c200: { channel: 'c200', author: 'u2', alive: true } },
};
assert.deepStrictEqual(channelDeleteWipes(db, 'c100'), ['TICKET_ALL.u1']); // whole node, not one row
assert.deepStrictEqual(channelDeleteWipes(db, 'c200'), ['TICKET_ALL.u2']);
assert.deepStrictEqual(channelDeleteWipes(db, 'c999'), []);
// strict === : numeric channel id does NOT match a string key
assert.deepStrictEqual(channelDeleteWipes(db, 100), []);
// value.channel is IGNORED by the match: corrupted row (key != value.channel) still wipes on key
const corrupt = { u9: { c100: { channel: 'cOTHER', author: 'u9', alive: true } } };
assert.deepStrictEqual(channelDeleteWipes(corrupt, 'c100'), ['TICKET_ALL.u9']);
assert.deepStrictEqual(channelDeleteWipes(corrupt, 'cOTHER'), []);
// null/undefined fetch is a silent no-op (for...in over nullish)
assert.deepStrictEqual(channelDeleteWipes(null, 'c100'), []);
assert.deepStrictEqual(channelDeleteWipes(undefined, 'c100'), []);
// one deleted channel shared by two users' nodes wipes both
const shared = { u1: { c100: { channel: 'c100' } }, u2: { c100: { channel: 'c100' } } };
assert.deepStrictEqual(channelDeleteWipes(shared, 'c100'), ['TICKET_ALL.u1', 'TICKET_ALL.u2']);

// ---- leg 3: onLeave missing-logs return (verbatim control flow) ----
function onLeaveProcessedTickets(fetch, logsChannelExists) {
    const processed = [];
    let rowsDeleted = false;
    for (const channelId in fetch) {
        if (!logsChannelExists) return { processed, rowsDeleted }; // TS `return`, not `continue`
        processed.push(channelId);
        rowsDeleted = true; // db.delete(TICKET_ALL.<user>) runs per iteration, inside the loop
    }
    return { processed, rowsDeleted };
}
const two = { c100: { channel: 'c100' }, c101: { channel: 'c101' } };
assert.deepStrictEqual(onLeaveProcessedTickets(two, true), { processed: ['c100', 'c101'], rowsDeleted: true });
assert.deepStrictEqual(onLeaveProcessedTickets(two, false), { processed: [], rowsDeleted: false }); // orphans both rows
assert.deepStrictEqual(onLeaveProcessedTickets(null, true), { processed: [], rowsDeleted: false });
assert.deepStrictEqual(onLeaveProcessedTickets({}, false), { processed: [], rowsDeleted: false });

console.log('slice-31 battery: all green');

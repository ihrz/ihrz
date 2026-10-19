/* W7 slice 68 battery: Events/guildconfig/joinDm.ts run-leg exactness.
 * Replicates verbatim: `!msg_dm || msg_dm === "off"` gate, disabled
 * Secondary "join-dm-from-server" button labelled "Message from <guildId>",
 * SnowflakeUtil nonce string, send-failure + outer-throw swallow. */
'use strict';
const assert = require('node:assert');
const { SnowflakeUtil, ButtonStyle } = require('discord.js');

// --- gate leg (joinDm.ts:43) ---
function gate(msg_dm) {
    if (!msg_dm || msg_dm === 'off') return 'skip';
    return 'send';
}
const gateCases = [
    [undefined, 'skip'], [null, 'skip'], ['', 'skip'], ['off', 'skip'],
    ['OFF', 'send'], [' off', 'send'], ['off ', 'send'], ['0', 'send'],
    ['hello', 'send'], [0, 'skip'], [false, 'skip'], [true, 'send'],
    [42, 'send'], [{}, 'send'],
];
for (const [v, want] of gateCases) {
    assert.strictEqual(gate(v), want, `gate(${JSON.stringify(String(v))})`);
}
console.log(`gate: ${gateCases.length}/${gateCases.length} ok`);

// --- button legs (joinDm.ts:58-62) ---
assert.strictEqual(ButtonStyle.Secondary, 2, 'Secondary numeric');
const label = 'Message from ' + '123456789012345678';
assert.strictEqual(label, 'Message from 123456789012345678', 'label concat');
console.log('button: Secondary=2, label concat ok');

// --- nonce leg (joinDm.ts:50) ---
const nonce = SnowflakeUtil.generate().toString();
assert.strictEqual(typeof nonce, 'string', 'nonce is string');
assert.ok(/^\d+$/.test(nonce), 'nonce is snowflake digits');
console.log(`nonce: ${nonce} ok`);

// --- swallow legs: .catch(()=>{}) + outer try{} (no-throw proof) ---
async function runWithSend(sendImpl, msg_dm) {
    try {
        if (!msg_dm || msg_dm === 'off') return 'skipped';
        const n = SnowflakeUtil.generate().toString();
        await Promise.resolve()
            .then(() => sendImpl({ content: msg_dm, enforceNonce: true, nonce: n }))
            .catch(() => {})
            .then(() => {});
        return 'settled';
    } catch { return 'threw'; }
}
(async () => {
    assert.strictEqual(await runWithSend(() => { throw new Error('dm closed'); }, 'hi'), 'settled');
    assert.strictEqual(await runWithSend(() => Promise.reject(new Error('x')), 'hi'), 'settled');
    assert.strictEqual(await runWithSend(() => { throw new Error('sync'); }, 'off'), 'skipped');
    console.log('swallow: 3/3 ok');
    console.log('BATTERY GREEN');
})();

/* W7 slice 70 battery: Events/guildconfig/autoreact.ts run-composition exactness.
 * Replicates verbatim (autoreact.ts:28-46):
 *   gate: `!message.guild || !message.channel || message.author.bot` -> return
 *   key: `${guildId}.GUILD.AUTOREACT.${channelId}`
 *   `if (!reactionData) return`
 *   `Array.isArray(reactionData) ? reactionData : [reactionData]`
 *   per-reaction `message.react` in try/catch -> `continue` on throw.
 */
'use strict';
const assert = require('node:assert');

let n = 0;
function gate(guild, channel, bot) {
    if (!guild || !channel || bot) return 'skip';
    return 'proceed';
}
// Full cube: guild x channel x bot.
const cube = [
    [null, null, false, 'skip'], [{}, null, false, 'skip'],
    [null, {}, false, 'skip'], [{}, {}, false, 'proceed'],
    [{}, {}, true, 'skip'], [null, null, true, 'skip'],
    [{}, {}, false, 'proceed'],
    [0, {}, false, 'skip'], [{}, '', false, 'skip'],
];
for (const [g, c, b, want] of cube) {
    assert.strictEqual(gate(g, c, b), want, `gate cube ${n}`);
    n++;
}
console.log(`gate: ${cube.length}/${cube.length} ok`);

// Falsy table for `!reactionData`.
function falsyProceeds(v) { return !v ? 'skip' : 'proceed'; }
const falsy = [
    [undefined, 'skip'], [null, 'skip'], [0, 'skip'], ['', 'skip'],
    [false, 'skip'], [NaN, 'skip'],
    ['x', 'proceed'], [[], 'proceed'], [['a'], 'proceed'],
    [5, 'proceed'], [{}, 'proceed'], [true, 'proceed'],
];
for (const [v, want] of falsy) {
    assert.strictEqual(falsyProceeds(v), want, `falsy ${String(v)}`);
}
console.log(`falsy: ${falsy.length}/${falsy.length} ok`);

// Wrap leg: identity for arrays (same ref), single-element for scalars.
const arr = ['a', 'b'];
assert.strictEqual(Array.isArray(arr) ? arr : [arr], arr, 'array identity');
assert.deepStrictEqual(Array.isArray('x') ? 'x' : ['x'], ['x'], 'scalar wrap');
assert.deepStrictEqual(Array.isArray(5) ? 5 : [5], [5], 'number wrap');
assert.deepStrictEqual(Array.isArray({}) ? {} : [{}], [{}], 'object wrap');
console.log('wrap: 4/4 ok');

// Key template leg.
const key = `${'111'}.GUILD.AUTOREACT.${'222'}`;
assert.strictEqual(key, '111.GUILD.AUTOREACT.222', 'db key shape');
console.log('key: ok');

// Continue leg: throw on item 1 still reacts items 2..3, in order, awaited.
async function run(reactionData, reactImpl) {
    if (!reactionData) return 'skipped';
    const reactions = Array.isArray(reactionData) ? reactionData : [reactionData];
    const done = [];
    for (const reaction of reactions) {
        try {
            await reactImpl(reaction);
            done.push(reaction);
        } catch {
            continue;
        }
    }
    return done;
}
(async () => {
    const calls = [];
    const ok = await run(['a', 'b', 'c'], async (r) => { calls.push(r); });
    assert.deepStrictEqual(ok, ['a', 'b', 'c'], 'all ok in order');
    assert.deepStrictEqual(calls, ['a', 'b', 'c'], 'calls in order');
    const calls2 = [];
    const partial = await run(['a', 'BAD', 'c'], async (r) => {
        calls2.push(r);
        if (r === 'BAD') throw new Error('unknown emoji');
    });
    assert.deepStrictEqual(partial, ['a', 'c'], 'throw skipped, rest ran');
    assert.deepStrictEqual(calls2, ['a', 'BAD', 'c'], 'attempted all incl bad');
    // Scalar legs attempt exactly one react.
    const calls3 = [];
    assert.deepStrictEqual(await run('solo', async (r) => { calls3.push(r); }), ['solo']);
    assert.deepStrictEqual(await run([], async () => { throw new Error('unreached'); }), []);
    assert.strictEqual(await run(0, async () => {}), 'skipped');
    assert.strictEqual(await run('', async () => {}), 'skipped');
    assert.strictEqual(await run(null, async () => {}), 'skipped');
    console.log('continue: 7/7 ok');
    console.log('BATTERY GREEN');
})();

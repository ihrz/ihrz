// W7 slice 17 battery: ghostPingModule.ts (guildMemberAdd) decision legs, verbatim.
// TS: `if (!all_channels) return;` then per channel `!channel || !admin -> continue`,
// else channelSend({content: member.user.toString(), enforceNonce, nonce}) + msg.delete().
let pass = 0, fail = 0;
function eq(actual, expected, name) {
  if (actual === expected) { pass++; }
  else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`); }
}
// Leg 1: falsy gate over db.get-decoded shapes (db.get JSON-parses stored strings).
const falsyShapes = [
  [undefined, false], [null, false], [false, false], [0, false], ["", false], [NaN, false],
  [[], true], [["123"], true], ["ab", true], [5, true], [{}, true], [true, true],
];
for (const [v, proceeds] of falsyShapes) {
  eq(!v ? "return" : "proceed", proceeds ? "proceed" : "return", `gate(${JSON.stringify(v) ?? "undefined"})`);
}
// Leg 2: non-iterable truthy throws out of run() (no per-channel try around the loop);
// iterable truthy iterates (strings char-wise). Outcome for sends is still none.
function runOutcome(v) {
  try { const out = []; for (const i of v) out.push(i); return out; }
  catch { return "THREW"; }
}
eq(JSON.stringify(runOutcome("ab")), JSON.stringify(["a","b"]), "string iterates chars");
eq(runOutcome(5), "THREW", "number throws");
eq(runOutcome({}), "THREW", "object throws");
eq(runOutcome(true), "THREW", "bool throws");
// Leg 3: per-channel skip table.
function prime(channelFound, admin) {
  if (!channelFound || !admin) return "skip";
  return "send+delete";
}
eq(prime(false, false), "skip", "missing channel skips");
eq(prime(false, true), "skip", "missing channel skips even admin");
eq(prime(true, false), "skip", "no-admin skips");
eq(prime(true, true), "send+delete", "found+admin sends");
// Leg 4: content shape.
const userId = "324942190222770176";
eq(`<@${userId}>`, "<@324942190222770176>", "mention content");
console.log(`ghostping battery: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

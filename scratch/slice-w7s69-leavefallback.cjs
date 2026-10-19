// W7 slice 69 battery: replicates src/Events/guildconfig/leaveMessage.ts
// run composition verbatim (gate :62, inviter branch :87-132, try/catch
// fallback :134-158) + method.ts preview inviter slots (:1103-1113).
let pass = 0, fail = 0;
function eq(actual, expected, leg) {
  if (actual === expected) { pass++; }
  else { fail++; console.log(`FAIL ${leg}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`); }
}
function throws(fn, leg) {
  try { fn(); fail++; console.log(`FAIL ${leg}: no throw`); }
  catch { pass++; }
}

// --- preview replica (method.ts:1095-1113 inviter legs) ---
function preview(message, input) {
  return message
    .replaceAll("{inviterUsername}", input.inviter?.user.username || `unknow_user`)
    .replaceAll("{inviterMention}", input.inviter?.user.mention || `@unknow_user`)
    .replaceAll("{invitesCount}", input.inviter?.invitesAmount.toString() || "1337");
}
const D_INV = "left. invited by **{inviterUsername}** (**{invitesCount}**)";
const D_DEF = "left the guild.";

// --- leg 1: template choice `leaveMessage || default` falsy table ---
for (const [lm, inv, want] of [
  ["custom", true, "custom"], ["custom", false, "custom"],
  ["", true, D_INV], ["", false, D_DEF],
  [null, true, D_INV], [undefined, false, D_DEF],
  [0, true, D_INV], [false, false, D_DEF],
]) {
  eq(lm || (inv ? D_INV : D_DEF), want, `tpl lm=${JSON.stringify(lm)} inv=${inv}`);
}

// --- leg 2: {invitesCount} eager `.toString()` throw table ---
eq(preview(D_INV, { inviter: { user: { username: "a", mention: "<@1>" }, invitesAmount: 5 } }),
  "left. invited by **a** (**5**)", "render amount=5");
eq(preview(D_DEF, {}), "left the guild.", "render no-inviter default");
eq(preview("{invitesCount}", {}), "1337", "render no-inviter 1337");
eq(preview("{invitesCount}", { inviter: { user: { username: "a", mention: "b" }, invitesAmount: 0 } }),
  "0", "render amount=0 (0.toString, no throw)");
eq(preview("{invitesCount}", { inviter: { user: { username: "a", mention: "b" }, invitesAmount: "5" } }),
  "5", "render string amount (delta: rust 1337)");
throws(() => preview(D_INV, { inviter: { user: { username: "a", mention: "<@1>" }, invitesAmount: undefined } }),
  "throw amount=undefined (missing row/subkey)");
throws(() => preview(D_INV, { inviter: { user: { username: "a", mention: "<@1>" }, invitesAmount: null } }),
  "throw amount=null");
// eager: throws even when the template has NO {invitesCount} slot
throws(() => preview("plain no slots", { inviter: { user: { username: "a", mention: "b" }, invitesAmount: undefined } }),
  "throw eager (slotless template still throws)");

// --- leg 3: full run replica (gate + branch + try/catch + swallowed send) ---
function run({ lChan, cacheHas, base, leaveMessage, inviterFetch, amount, sender }) {
  const sends = [];
  const goodbyes = [];
  if (!lChan || !cacheHas) return { ret: "early", sends };
  const sendGoodbye = (msg, variables) => {
    const useComponents = variables.embed ? false : variables.componentsEnabled;
    try { sends.push({ msg, useComponents }); sender(); }
    catch { /* .catch(() => null): swallowed, NO retry */ }
  };
  try {
    let variables = {};
    let messageContent;
    if (base?.inviter) {
      const inviter = inviterFetch(base.inviter); // throws on fetch fail
      messageContent = preview(leaveMessage || D_INV,
        { inviter: { user: { username: inviter.username, mention: `<@${base.inviter}>` }, invitesAmount: amount } });
      variables = { inviter: true };
    } else {
      messageContent = preview(leaveMessage || D_DEF, variables);
    }
    sendGoodbye(messageContent, { ...variables, componentsEnabled: true });
  } catch {
    const fb = preview(D_DEF, {}); // fallback: default tpl, inviter-free vars
    sendGoodbye(fb, { componentsEnabled: true });
    goodbyes.push(fb);
  }
  return { sends, goodbyes };
}
const okSender = () => {};
const boomSender = () => { throw new Error("DiscordAPIError"); };
// gate legs
eq(run({ lChan: "", cacheHas: true, sender: okSender }).ret, "early", "gate empty lChan");
eq(run({ lChan: null, cacheHas: true, sender: okSender }).ret, "early", "gate null lChan");
eq(run({ lChan: undefined, cacheHas: true, sender: okSender }).ret, "early", "gate undef lChan");
eq(run({ lChan: "123", cacheHas: false, sender: okSender }).ret, "early", "gate cache miss");
eq(run({ lChan: "123", cacheHas: true, base: null, leaveMessage: "", sender: okSender }).sends.length, 1, "gate pass sends once");
// inviter+amount: primary inviter template, real name
eq(run({ lChan: "1", cacheHas: true, base: { inviter: "9" }, leaveMessage: "",
  inviterFetch: () => ({ username: "Zed" }), amount: 4, sender: okSender }).sends[0].msg,
  "left. invited by **Zed** (**4**)", "primary inviter render");
// inviter, amount missing -> primary throws -> fallback default+unknown (ONE send)
{
  const r = run({ lChan: "1", cacheHas: true, base: { inviter: "9" }, leaveMessage: "",
    inviterFetch: () => ({ username: "Zed" }), amount: undefined, sender: okSender });
  eq(r.sends.length, 1, "throw-case single fallback send");
  eq(r.sends[0].msg, D_DEF, "throw-case fallback default template");
}
// inviter fetch throws -> fallback default+unknown
{
  const r = run({ lChan: "1", cacheHas: true, base: { inviter: "9" }, leaveMessage: "",
    inviterFetch: () => { throw new Error("fetch"); }, amount: 4, sender: okSender });
  eq(r.sends.length, 1, "fetch-fail single fallback send");
  eq(r.sends[0].msg, D_DEF, "fetch-fail fallback default template");
}
// send failure swallowed: no retry, no throw
{
  const r = run({ lChan: "1", cacheHas: true, base: null, leaveMessage: "", sender: boomSender });
  eq(r.sends.length, 1, "send-fail one attempt, no retry");
  eq(r.goodbyes.length, 0, "send-fail no fallback (swallowed)");
}
// --- leg 4: sendGoodbye composition `textEnabled ? msg : null`, `embed ? false : components` ---
for (const [textEn, embed, comp, wantMsg, wantUC] of [
  [true, null, true, "hi", true], [false, null, true, null, true],
  [false, null, false, null, false], [true, { e: 1 }, true, "hi", false],
  [false, { e: 1 }, false, null, false],
]) {
  eq(textEn ? "hi" : null, wantMsg, `comp msg t=${textEn}`);
  eq(embed ? false : comp, wantUC, `comp uc e=${!!embed} c=${comp}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

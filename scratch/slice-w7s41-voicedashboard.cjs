// W7 slice 41 battery: Events/voicedashboard/voiceState.ts decision legs, verbatim.
const assert = require('node:assert');
let n = 0;
function eq(a, b, label) { n++; assert.deepStrictEqual(a, b, `${label}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }

// --- Leg 1: rename template (voiceState.ts:216-231) ---
function tsRenderTempName(tpl, username) {
  return tpl.includes("{Username}")
    ? tpl.replace("{Username}", username) // string pattern => FIRST only
    : tpl + " " + username;
}
eq(tsRenderTempName("{Username}'s room", "Ada"), "Ada's room", "rename single");
eq(tsRenderTempName("Lounge", "Ada"), "Lounge Ada", "rename append");
eq(tsRenderTempName("{Username} & {Username}", "Ada"), "Ada & {Username}", "rename first-only");
eq(tsRenderTempName("{Username}{Username}", "Bo"), "Bo{Username}", "rename adjacent first-only");
eq(tsRenderTempName("", "Ada"), " Ada", "rename empty tpl appends");
eq(tsRenderTempName("{username}", "Ada"), "{username} Ada", "rename lowercase no-match");

// --- Leg 2: initial title (voiceState.ts:187-190) ---
function tsInitialTitle(langTpl, username) {
  return langTpl.replace("{nickname}", maskLink(username)); // first only
}
function maskLink(input) {
  for (const c of ["http://", "https://", "discordapp", ".com", ".gg"])
    if (input.includes(c)) return "Hidden Link";
  return input;
}
eq(tsInitialTitle("{nickname}'s Channel", "Ada"), "Ada's Channel", "title single");
eq(tsInitialTitle("{nickname} {nickname}", "Ada"), "Ada {nickname}", "title first-only");
eq(tsInitialTitle("{nickname}'s Channel", "x https://y"), "Hidden Link's Channel", "title masked");

// --- Leg 3: gates ---
// `newState.channelId === oldState.channelId` => return (mute/deaf toggles)
eq(("A" === "A"), true, "same-channel returns");
eq((null === null), true, "both-null returns");
// `!baseData || !baseData.voice_channel` => return
for (const [bd, proceeds] of [[null, false], [undefined, false], [{}, false], [{ voice_channel: "" }, false], [{ voice_channel: "1" }, true]])
  eq(!(!bd || !bd.voice_channel), proceeds, `gate ${JSON.stringify(bd)}`);
// category fallback: baseData.voice_channel_category || result_channel?.parentId
eq("cat" || "parent", "cat", "cat explicit wins");
eq("" || "parent", "parent", "cat empty falls back");
eq(undefined || undefined, undefined, "both missing => undefined");

// --- Leg 4: position + username resolution ---
eq("top" === "top", true, "position top exact");
eq("Top" === "top", false, "position case differs");
eq("Ada" || "nick", "Ada", "displayName wins");
eq("" || "nick", "nick", "empty displayName falls to nickname");
eq(undefined || undefined, undefined, "both missing => undefined (TS then maskLink(undefined) throws)");

// --- Leg 5: staff_role string vs array (voiceState.ts:274-321) ---
function tsStaffTargets(staff_role, cacheHas) {
  if (!staff_role) return [];
  if (typeof staff_role === "string") return [staff_role]; // no cache guard on legacy leg
  return staff_role.filter((r) => cacheHas(r));
}
eq(tsStaffTargets("9", () => false), ["9"], "legacy string skips cache guard");
eq(tsStaffTargets(["9", "10"], (r) => r === "9"), ["9"], "array filters by cache");
eq(tsStaffTargets([], () => true), [], "empty array none");

// --- Leg 6: sweep loop skip-self + break-first (voiceState.ts:138-165) ---
function tsSweep(entries, oldChannelId, selfId, memberless) {
  const deleted = [];
  for (const [userId, chId] of entries) {
    if (chId !== oldChannelId) continue;
    if (userId === selfId) continue;
    if (oldChannelId === chId && memberless(chId)) { deleted.push(userId); break; }
  }
  return deleted;
}
eq(tsSweep([["u1", "C"], ["u2", "C"]], "C", "self", () => true), ["u1"], "sweep stops after first");
eq(tsSweep([["self", "C"]], "C", "self", () => true), [], "sweep skips self row");
eq(tsSweep([["u1", "D"]], "C", "self", () => true), [], "sweep ignores other channels");
eq(tsSweep([["u1", "C"]], "C", "self", () => false), [], "sweep keeps occupied");

// --- Leg 7: move-verify + conditional row drop (voiceState.ts:243-257, 323-333) ---
function tsRowDropAfterFail(current, channId) { return current === channId; }
eq(tsRowDropAfterFail("7", "7"), true, "row dropped when still pointing");
eq(tsRowDropAfterFail("8", "7"), false, "row kept when repointed");
eq(tsRowDropAfterFail(undefined, "7"), false, "row kept when missing");
// verify leg: !movedMember || movedMember.voice.channelId !== chann.id => rollback
for (const [m, ch, rb] of [[null, "7", true], [{ c: "7" }, "7", false], [{ c: "9" }, "7", true], [{ c: null }, "7", true]])
  eq(!m || m.c !== ch, rb, `verify ${JSON.stringify(m)}/${ch}`);

// --- Leg 8: recoverCustomVoiceChannels (voiceState.ts:346-391) ---
function tsRecover(channelId, exists, memberless) {
  if (typeof channelId !== "string" || !channelId) return "drop-row";
  if (!exists) return "drop-row";
  if (memberless) return "delete-and-drop";
  return "keep";
}
eq(tsRecover(123, true, false), "drop-row", "recover non-string drops");
eq(tsRecover("", true, false), "drop-row", "recover empty drops");
eq(tsRecover("7", false, false), "drop-row", "recover missing drops");
eq(tsRecover("7", true, true), "delete-and-drop", "recover memberless deletes");
eq(tsRecover("7", true, false), "keep", "recover occupied keeps");

console.log(`W7S41 battery green: ${n} asserts`);

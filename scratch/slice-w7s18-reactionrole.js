// W7 slice 18 battery: reactionrole onReactAdd.ts / onReactRemove.ts verbatim legs.
// Replicates: `${...emoji.name}` / `${...emoji.id}` key building (template
// literal null -> "null"), the `||` toggle, first-hit return, throw->catch
// short-circuits, and the remove-side duplicate name-key read. No discord.js
// needed: the replicated surface is template literals + control flow.
let pass = 0, fail = 0;
function eq(actual, expected, leg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${leg}: got ${a} want ${e}`); }
}
const key = (mid, k) => `GUILD.REACTION_ROLES.${mid}.${k}`;
// --- add-side key legs (onReactAdd.ts:32 leg1 name, :66 leg2 id) ---
function addKeys(emoji) { return [key(9, `${emoji.name}`), key(9, `${emoji.id}`)]; }
eq(addKeys({ name: "👍", id: null }), ["GUILD.REACTION_ROLES.9.👍", "GUILD.REACTION_ROLES.9.null"], "add-unicode-keys");
eq(addKeys({ name: "party", id: "123456789012345678" }), ["GUILD.REACTION_ROLES.9.party", "GUILD.REACTION_ROLES.9.123456789012345678"], "add-custom-keys");
eq(addKeys({ name: null, id: "123456789012345678" }), ["GUILD.REACTION_ROLES.9.null", "GUILD.REACTION_ROLES.9.123456789012345678"], "add-nameless-keys");
// --- remove-side key legs (onReactRemove.ts:33 + :54 BOTH use .name) ---
function removeKeys(emoji) { return [key(9, `${emoji.name}`), key(9, `${emoji.name}`)]; }
eq(removeKeys({ name: "👍", id: null }), ["GUILD.REACTION_ROLES.9.👍", "GUILD.REACTION_ROLES.9.👍"], "remove-unicode-dup-keys");
eq(removeKeys({ name: "party", id: "123456789012345678" }), ["GUILD.REACTION_ROLES.9.party", "GUILD.REACTION_ROLES.9.party"], "remove-custom-dup-keys");
eq(removeKeys({ name: null, id: "1" }), ["GUILD.REACTION_ROLES.9.null", "GUILD.REACTION_ROLES.9.null"], "remove-nameless-dup-keys");
// --- toggle verdict (onReactAdd.ts:47-60 `cache.has || fresh.has`) ---
const toggle = (cachedHas, freshHas) => (cachedHas || freshHas) ? "remove" : "add";
eq(toggle(false, false), "add", "toggle-add");
eq(toggle(true, false), "remove", "toggle-stale-cache-remove");
eq(toggle(false, true), "remove", "toggle-fresh-remove");
eq(toggle(true, true), "remove", "toggle-both-remove");
// --- control-flow simulation of run() with stubbed db/roles/members ---
function runAdd({ selfHit, inGuild, rows, roleOk, memberOk, cachedHas, freshHas }) {
  const lookups = []; const actions = [];
  try {
    if (selfHit || !inGuild) return { lookups, actions, ret: true };
    lookups.push("name");
    const fetched = rows.name; // throws simulated via {throw:true}
    if (fetched && fetched.throw) throw new Error("role fetch throw");
    if (fetched) {
      if (!roleOk) return { lookups, actions, ret: true }; // !role -> return, nitro skipped
      if (!memberOk) throw new Error("member fetch throw"); // -> outer catch -> return
      actions.push(toggle(cachedHas, freshHas));
      return { lookups, actions, ret: true }; // return skips nitro leg
    }
    lookups.push("id");
    const nitro = rows.id;
    if (nitro && nitro.throw) throw new Error("role fetch throw");
    if (nitro) {
      if (!roleOk) return { lookups, actions, ret: true };
      if (!memberOk) throw new Error("member fetch throw");
      actions.push(toggle(cachedHas, freshHas));
    }
  } catch { return { lookups, actions, ret: true }; }
  return { lookups, actions, ret: true };
}
let r = runAdd({ selfHit: false, inGuild: true, rows: { name: {} }, roleOk: true, memberOk: true, cachedHas: false, freshHas: false });
eq([r.lookups, r.actions], [["name"], ["add"]], "add-leg1-hit-skips-nitro");
r = runAdd({ selfHit: false, inGuild: true, rows: { name: { throw: true } }, roleOk: true, memberOk: true, cachedHas: false, freshHas: false });
eq([r.lookups, r.actions], [["name"], []], "add-leg1-unparsable-throw-skips-nitro");
r = runAdd({ selfHit: false, inGuild: true, rows: { name: null, id: {} }, roleOk: true, memberOk: true, cachedHas: false, freshHas: true });
eq([r.lookups, r.actions], [["name", "id"], ["remove"]], "add-nitro-hit-toggles");
r = runAdd({ selfHit: false, inGuild: true, rows: { name: null, id: null }, roleOk: true, memberOk: true, cachedHas: false, freshHas: false });
eq([r.lookups, r.actions], [["name", "id"], []], "add-both-miss-noop");
r = runAdd({ selfHit: false, inGuild: true, rows: { name: {} }, roleOk: false, memberOk: true, cachedHas: false, freshHas: false });
eq([r.lookups, r.actions], [["name"], []], "add-role-missing-returns-nitro-skipped");
r = runAdd({ selfHit: false, inGuild: true, rows: { name: {} }, roleOk: true, memberOk: false, cachedHas: false, freshHas: false });
eq([r.lookups, r.actions], [["name"], []], "add-member-throw-returns-nitro-skipped");
r = runAdd({ selfHit: true, inGuild: true, rows: { name: {} }, roleOk: true, memberOk: true, cachedHas: false, freshHas: false });
eq([r.lookups, r.actions], [[], []], "add-self-gate");
r = runAdd({ selfHit: false, inGuild: false, rows: { name: {} }, roleOk: true, memberOk: true, cachedHas: false, freshHas: false });
eq([r.lookups, r.actions], [[], []], "add-noguild-gate");
function runRemove({ selfHit, inGuild, rows, roleFetchOk, memberOk }) {
  const lookups = []; const actions = [];
  try {
    if (selfHit || !inGuild) return { lookups, actions, ret: true };
    lookups.push("name");
    let fetched = rows.name;
    if (fetched && fetched.throw) fetched = null; // .catch(() => null)
    if (fetched) {
      if (!roleFetchOk) throw new Error("role fetch throw"); // NO catch -> outer catch -> return
      if (!memberOk) throw new Error("member fetch throw");
      actions.push("remove");
      // NOTE: no return here — falls through to leg2 (same key)
    }
    lookups.push("name");
    let nitro = rows.name2;
    if (nitro && nitro.throw) nitro = null; // .catch(() => null)
    if (nitro) {
      if (!roleFetchOk) throw new Error("role fetch throw");
      if (!memberOk) throw new Error("member fetch throw");
      actions.push("remove");
      return { lookups, actions, ret: true };
    }
  } catch { return { lookups, actions, ret: true }; }
  return { lookups, actions, ret: true };
}
r = runRemove({ selfHit: false, inGuild: true, rows: { name: {}, name2: {} }, roleFetchOk: true, memberOk: true });
eq([r.lookups, r.actions], [["name", "name"], ["remove", "remove"]], "remove-double-remove-same-key");
r = runRemove({ selfHit: false, inGuild: true, rows: { name: {}, name2: {} }, roleFetchOk: false, memberOk: true });
eq([r.lookups, r.actions], [["name"], []], "remove-role-missing-throw-skips-leg2");
r = runRemove({ selfHit: false, inGuild: true, rows: { name: null, name2: null }, roleFetchOk: true, memberOk: true });
eq([r.lookups, r.actions], [["name", "name"], []], "remove-both-miss-noop");
r = runRemove({ selfHit: false, inGuild: true, rows: { name: { throw: true }, name2: { throw: true } }, roleFetchOk: true, memberOk: true });
eq([r.lookups, r.actions], [["name", "name"], []], "remove-db-throw-caught-null-skips-all");
console.log(`reactionrole battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

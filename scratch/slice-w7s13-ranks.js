// W7 slice 13 battery: ranks/onNewMessage.ts decision legs, verbatim.
let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log(`FAIL ${label}: got ${a}, want ${e}`); }
}

// --- Leg 1: gain gate (ts:63-67) ---
function gainBlocked(xpTurn, bypass, ch) {
  return xpTurn === "disable" || (bypass || []).includes(ch);
}
eq(gainBlocked("disable", [], "c1"), true, "gain disable-string");
eq(gainBlocked(false, [], "c1"), false, "gain false-bool proceeds");
eq(gainBlocked(true, [], "c1"), false, "gain true-bool proceeds");
eq(gainBlocked(undefined, [], "c1"), false, "gain missing proceeds");
eq(gainBlocked(0, [], "c1"), false, "gain 0 proceeds");
eq(gainBlocked("", ["c1"], "c1"), true, "gain bypass hit");
eq(gainBlocked("disable", ["c9"], "c1"), true, "gain disable wins");
eq(gainBlocked("Disable", [], "c1"), false, "gain case-sensitive");

// --- Leg 2: announce gate (ts:161-167) ---
function announceSuppressed(xpTurn, canSend) {
  return xpTurn === false || !canSend;
}
eq(announceSuppressed(false, true), true, "ann silent on false");
eq(announceSuppressed("disable", true), false, "ann disable-string NOT silenced here (caught upstream)");
eq(announceSuppressed(true, true), false, "ann true proceeds");
eq(announceSuppressed(undefined, true), false, "ann missing proceeds");
eq(announceSuppressed("false", true), false, "ann string-false proceeds (strict)");
eq(announceSuppressed(0, true), false, "ann 0 proceeds (strict)");
eq(announceSuppressed(false, false), true, "ann false wins over noperm");
eq(announceSuppressed(true, false), true, "ann noperm silences");

// --- Leg 3: threshold + level/sub arithmetic (ts:69,81,93-96) ---
function levelStep(level, xpStale, gain) {
  // level = baseData?.level || 1 ; xpStale = baseData?.xp (pre-add)
  const lv = level || 1;
  let xp = xpStale, xptotal = xpStale, newLevel = lv, leveled = false;
  xp += gain; xptotal += gain; // db.add legs (NaN-safe: undefined+gain=NaN in TS!)
  if (lv * 500 < xpStale) {
    newLevel = lv + 1;
    xp = xp - lv * 500;
    leveled = true;
  }
  return { newLevel, xp, xptotal, leveled };
}
eq(levelStep(1, 0, 35), { newLevel: 1, xp: 35, xptotal: 35, leveled: false }, "lvl fresh no levelup");
eq(levelStep(1, 501, 35), { newLevel: 2, xp: 536 - 500, xptotal: 536, leveled: true }, "lvl stale-501 levels");
eq(levelStep(1, 500, 35), { newLevel: 1, xp: 535, xptotal: 535, leveled: false }, "lvl boundary strict");
eq(levelStep(2, 1499, 37), { newLevel: 3, xp: 1536 - 1000, xptotal: 1536, leveled: true }, "lvl2 cross");
eq(levelStep(0, 0, 36), { newLevel: 1, xp: 36, xptotal: 36, leveled: false }, "lvl 0 folds to 1");
eq(levelStep(undefined, undefined, 35).leveled, false, "lvl missing-xp never levels");
eq(levelStep(1, 99999, 35).newLevel, 2, "lvl single step even far above");

// --- Leg 4: rank-role pick (ts:105-112) + removal set (ts:133-138) ---
function rolePick(rolesMap, newLevel) {
  return Object.entries(rolesMap)
    .filter(([roleLevel]) => parseInt(roleLevel) <= newLevel)
    .sort(([a], [b]) => parseInt(b) - parseInt(a))?.[0]?.[1];
}
function rolesToRemove(rolesMap, held, assign) {
  return Object.values(rolesMap).filter((r) => held.includes(r) && r !== assign);
}
eq(rolePick({ "2": "low", "5": "high" }, 7), "high", "pick highest at-or-below");
eq(rolePick({ "2": "low", "5": "high" }, 5), "high", "pick boundary inclusive");
eq(rolePick({ "2": "low", "5": "high" }, 1), undefined, "pick none below");
eq(rolePick({}, 9), undefined, "pick empty map");
eq(rolePick({ "2abc": "junk", "5": "high" }, 7), "high", "pick junk-key 2 loses to 5");
eq(rolePick({ "2abc": "junk" }, 3), "junk", "pick junk-key admitted at 2");
eq(rolePick({ "0x10": "hex" }, 16), "hex", "pick hex-key 16");
eq(rolePick({ "0x10": "hex" }, 15), undefined, "pick hex-key misses 15");
eq(rolePick({ " 3": "sp" }, 3), "sp", "pick space-key 3");
eq(rolePick({ "3.9": "dec" }, 3), "dec", "pick 3.9 truncates to 3");
eq(rolePick({ "": "empty", "2": "low" }, 9), "low", "pick empty-key filtered (NaN)");
eq(rolesToRemove({ "2": "low", "9": "future" }, ["low", "future"], "low"), ["future"], "remove keeps assign, drops stale incl above-level");
eq(rolesToRemove({ "2": "low" }, ["low"], "low"), [], "remove none when only assign held");

// --- Leg 5: xpChan routing (ts:186,206) ---
function route(xpChan, resolved) {
  if (!xpChan) return "reply";
  if (!resolved) return "silent";
  return "send-there";
}
eq(route(undefined, false), "reply", "route missing -> reply");
eq(route("", false), "reply", "route empty -> reply");
eq(route("123", true), "send-there", "route set+resolved");
eq(route("123", false), "silent", "route set+unresolved");
eq(route(" ", false), "silent", "route whitespace truthy -> silent (no trim)");

// --- Leg 6: new-user hint gate (ts:193) ---
function hintApplies(newLevel, roll) { return newLevel === 1 && roll < 0.5; }
eq(hintApplies(1, 0.4999), true, "hint hit");
eq(hintApplies(1, 0.5), false, "hint boundary strict");
eq(hintApplies(2, 0.0), false, "hint level 2 never");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// W7 slice 50 battery: addBanLogs.ts / removeBanLogs.ts / kickLogs.ts
// rich-embed render exactness (desc token chain + reason || fold + shared banAdd field keys).
const FALLBACK = "No reason found";
const BAN_ADD_DESC = "<@${firstEntry.executor.id}> **banned** <@${firstEntry.target.id}>";
const BAN_REMOVE_DESC = "<@${firstEntry.executor.id}> **revoked the ban** on ${firstEntry.target.username}";
const KICK_DESC = "<@${firstEntry.executor.id}> **kicked** <@${firstEntry.target.id}>";
const FIELD_VALUE = "```{reason}```";

// Verbatim TS legs (per file)
const ts_ban_add_desc = (ex, tid) => BAN_ADD_DESC
  .replace("${firstEntry.executor.id}", ex)
  .replace("${firstEntry.target.id}", tid);
const ts_ban_remove_desc = (ex, username) => BAN_REMOVE_DESC
  .replace("${firstEntry.executor.id}", ex)
  .replace("${firstEntry.target.username}", username);
const ts_kick_desc = (ex, tid) => KICK_DESC
  .replace("${firstEntry.executor.id}", ex)
  .replace("${firstEntry.target.id}", tid);
const ts_reason = (reason) => reason || FALLBACK;
const ts_field = (reason) => FIELD_VALUE.replace("{reason}", ts_reason(reason));

// Rust mirror (mod_audit_log unified chain + unwrap_or fallback)
const rs_desc = (tpl, ex, tid, uname) => tpl
  .replace("${firstEntry.executor.id}", ex)
  .replace("${firstEntry.target.id}", tid)
  .replace("${firstEntry.target.username}", uname);
const rs_reason = (reason) => reason ?? FALLBACK; // Option unwrap_or mirror

let pass = 0, fail = 0;
function eq(name, a, b, expectSame = true) {
  const same = a === b;
  const ok = expectSame ? same : !same;
  if (ok) { pass++; }
  else { fail++; console.log(`LEG ${name}: TS=${JSON.stringify(a)} RS=${JSON.stringify(b)} (expected ${expectSame ? "same" : "DIVERGE"})`); }
}

// desc legs: unified triple-chain must equal per-file double-chain
eq("banAdd-desc", ts_ban_add_desc("111", "222"), rs_desc(BAN_ADD_DESC, "111", "222", ""));
eq("banRemove-desc", ts_ban_remove_desc("111", "SomeUser"), rs_desc(BAN_REMOVE_DESC, "111", "222", "SomeUser"));
eq("kick-desc", ts_kick_desc("111", "222"), rs_desc(KICK_DESC, "111", "222", ""));
// cross-token pollution: banRemove template has no target.id token; banAdd has no username token
eq("banAdd-no-username-token", ts_ban_add_desc("111", "222").includes("SomeUser"), false);
eq("banRemove-no-id-token", ts_ban_remove_desc("111", "U").includes("222"), false);

// reason legs
eq("reason-value", ts_field("spam"), "```spam```");
eq("reason-null", ts_reason(null), FALLBACK);
eq("reason-undefined", ts_reason(undefined), FALLBACK);
eq("reason-empty", ts_reason(""), FALLBACK);                       // TS || folds ""
eq("reason-empty-rs", rs_reason(""), FALLBACK, false);             // DIVERGENCE: Rust keeps ""
eq("reason-null-rs", rs_reason(null), FALLBACK);
eq("reason-space", ts_reason(" "), " ");                        // whitespace is truthy, kept
eq("reason-space-rs", rs_reason(" "), " ");

// field template shared banAdd keys on all three legs (quirk: kick/remove reuse banAdd keys)
eq("field-shape", ts_field("x"), "```x```");

console.log(`\n${pass} pass / ${fail} unexpected`);
process.exit(fail ? 1 : 0);

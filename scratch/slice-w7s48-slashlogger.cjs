// W7 slice 48 battery: slashCommandLogger.ts event legs verbatim.
const SENSITIVE = new Set(["password","pass","token","apitoken","apikey","secret","sharedsecret","credential","sessionkey","sessiontoken"]);
function sanitize(name, value) {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (SENSITIVE.has(n)) return "[REDACTED]";
  return String(value);
}
// gate: !isCommand() || !guild?.channels || user.bot -> return
function proceeds(isCommand, guild, bot) {
  return !( !isCommand || !guild?.channels || bot );
}
// subCmd block verbatim (getSubcommandGroup() required=false -> null)
function subCmdOf(_subcommand, group, sub) {
  let s = "";
  if (_subcommand) {
    if (group) s += group + " ";
    s += sub;
  }
  return s;
}
function template(subCmd, optionsList) {
  return `/${subCmd} ${optionsList?.join(" ")}`.trim();
}
let pass = 0, fail = 0;
function eq(actual, expected, label) {
  if (actual === expected) { pass++; }
  else { fail++; console.log(`FAIL ${label}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`); }
}
// --- gate (8 corners) ---
eq(proceeds(true, {channels:{}}, false), true, "gate cmd+guild+human");
eq(proceeds(true, {channels:{}}, true), false, "gate bot");
eq(proceeds(true, null, false), false, "gate noguild");
eq(proceeds(true, {}, false), false, "gate guild-nochannels");
eq(proceeds(false, {channels:{}}, false), false, "gate notcommand");
eq(proceeds(false, null, true), false, "gate allbad");
eq(proceeds(true, {channels:null}, false), false, "gate channels-null");
eq(proceeds(true, {channels:0}, false), false, "gate channels-0");
// --- subCmd ---
eq(subCmdOf(undefined, null, null), "", "sub none");
eq(subCmdOf("ban", null, "ban"), "ban", "sub only");
eq(subCmdOf("ban", "user", "ban"), "user ban", "group+sub");
// --- template ---
eq(template("", []), "/", "tpl bare");
eq(template("ban", []), "/ban", "tpl sub noopts");
eq(template("", ["a:\"1\""]), "/ a:\"1\"", "tpl nosub opts (base dropped)");
eq(template("user ban", ["a:\"1\"", "b:\"2\""]), "/user ban a:\"1\" b:\"2\"", "tpl full");
// --- sanitize ---
eq(sanitize("password", "hunter2"), "[REDACTED]", "san password");
eq(sanitize("Pass-Word", "hunter2"), "[REDACTED]", "san dashfold");
eq(sanitize("api key", "x"), "[REDACTED]", "san spacefold");
eq(sanitize("SECRET!", "x"), "[REDACTED]", "san bangfold");
eq(sanitize("session_token", "x"), "[REDACTED]", "san underscorefold");
eq(sanitize("CREDENTIAL ", "x"), "[REDACTED]", "san space trail");
eq(sanitize("shared-secret", "x"), "[REDACTED]", "san sharedsecret");
eq(sanitize("PÄSSWORD", "v"), "v", "san unicode-ä stripped, not sensitive");
eq(sanitize("token2", "v"), "v", "san token2 verbatim");
eq(sanitize("reason", "spam"), "spam", "san plain");
eq(sanitize("amount", 0), "0", "san num 0");
eq(sanitize("amount", -0), "0", "san num -0");
eq(sanitize("amount", 1e21), "1e+21", "san num 1e21");
eq(sanitize("amount", 1e-7), "1e-7", "san num 1e-7");
eq(sanitize("amount", NaN), "NaN", "san NaN");
eq(sanitize("amount", Infinity), "Infinity", "san Inf");
eq(sanitize("ok", true), "true", "san bool");
eq(sanitize("ok", null), "null", "san null");
eq(sanitize("ok", undefined), "undefined", "san undefined");
// --- writer cap ---
let big = Array.from({length: 10003}, (_, i) => i);
if (big.length > 10000) big = big.slice(-10000);
eq(big.length, 10000, "cap len");
eq(big[0], 3, "cap drops oldest");
console.log(`battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

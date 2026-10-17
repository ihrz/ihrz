// W7 slice 12 battery: supportModule.ts final-match legs verbatim.
function tsVerdict({ type, actState, input, vanityCode, tagId, guildId, has }) {
  const acts = actState === undefined ? [] : [{ state: actState }];
  const bio = acts[0] || "null";
  const vanity = vanityCode || "null";
  if (type === "bio" && !bio.state) return has ? "remove-early" : "noop-early";
  if (type === "tag" && !tagId) return has ? "remove-early" : "noop-early";
  const cleanBio = bio.state?.toString().toLowerCase() || "";
  const cleanInput = input?.toString().toLowerCase() || "";
  const cleanVanity = vanity.toString().toLowerCase();
  const matched =
    (type === "bio" && (cleanBio.includes(cleanInput) || cleanBio.includes(cleanVanity))) ||
    (type === "tag" && tagId === guildId);
  if (matched) return has ? "keep" : "add";
  return has ? "remove" : "noop";
}
// Rust mirror (pre-fix): vanity "" skipped via is_empty guard.
function rsVerdict({ type, actState, input, vanityCode, tagId, guildId, has }) {
  const stateMissing = actState === undefined || actState === null;
  if (type === "bio" && stateMissing) return has ? "remove-early" : "noop-early";
  if (type === "tag" && !tagId) return has ? "remove-early" : "noop-early";
  let matched = false;
  if (type === "bio") {
    const state = (actState ?? "").toLowerCase();
    const inp = (input ?? "").toLowerCase();
    const van = (vanityCode ?? "").toLowerCase();
    matched = state.includes(inp) || (!van && state.includes(van) ? false : van ? state.includes(van) : false);
  } else if (type === "tag") matched = tagId === guildId;
  if (matched) return has ? "keep" : "add";
  return has ? "remove" : "noop";
}
const G = "guild1";
const cases = [
  // vanity-absent + "null" in bio -> TS grants via "null" fallback
  { type: "bio", actState: "i love null", input: "xyz", vanityCode: null, has: false },
  { type: "bio", actState: "annulled plans", input: "xyz", vanityCode: null, has: false },
  { type: "bio", actState: "NULL enjoyer", input: "xyz", vanityCode: undefined, has: true },
  { type: "bio", actState: "hello world", input: "xyz", vanityCode: null, has: false },
  { type: "bio", actState: "hello world", input: "xyz", vanityCode: null, has: true },
  // normal vanity hits
  { type: "bio", actState: "join my.server.gg/x", input: "xyz", vanityCode: "my.server.gg/x", has: false },
  { type: "bio", actState: "nothing", input: "gg", vanityCode: "other", has: false },
  { type: "bio", actState: "nothing here", input: "gg", vanityCode: "other", has: true },
  // input hits / empty input (contains("") grants both sides)
  { type: "bio", actState: "hello", input: "hell", vanityCode: "v", has: false },
  { type: "bio", actState: "HeLLo", input: "hell", vanityCode: "v", has: false },
  { type: "bio", actState: "", input: "", vanityCode: "v", has: false },
  // missing state early legs
  { type: "bio", actState: undefined, input: "x", vanityCode: "v", has: true },
  { type: "bio", actState: undefined, input: "x", vanityCode: "v", has: false },
  { type: "bio", actState: null, input: "x", vanityCode: "v", has: true },
  // missing/unknown type falls to remove
  { type: undefined, actState: "hello", input: "hell", vanityCode: "v", has: true },
  { type: undefined, actState: "hello", input: "hell", vanityCode: "v", has: false },
  { type: "weird", actState: "hello", input: "hell", vanityCode: "v", has: true },
  // tag legs
  { type: "tag", tagId: G, guildId: G, has: false },
  { type: "tag", tagId: G, guildId: G, has: true },
  { type: "tag", tagId: "other", guildId: G, has: true },
  { type: "tag", tagId: null, guildId: G, has: true },
  { type: "tag", tagId: null, guildId: G, has: false },
  { type: "tag", tagId: undefined, guildId: G, has: true },
];
let diverg = 0;
for (const [i, c] of cases.entries()) {
  const t = tsVerdict(c), r = rsVerdict(c);
  const mark = t === r ? "SAME " : (++diverg, "DIVER");
  console.log(`${mark} #${i} ts=${t} rs=${r} ${JSON.stringify(c)}`);
}
console.log(`divergences: ${diverg}/${cases.length}`);

// W7 slice 21 battery: join/leave welcomer gate exactness.
// Replicates verbatim:
//   joinMessage.ts:302-303 / leaveMessage.ts:59-60: `flag !== false`
//   leaveMessage.ts:62: `if (!lChan || !cache.get(lChan)) return`
//   joinMessage.ts:374: `if (!wChan) return`
//   `stored || default` template pick (both files)
const shapes = [
  ["missing", undefined],
  ["null", null],
  ["true", true],
  ["false", false],
  ["str-false", "false"],
  ["str-0", "0"],
  ["str-1", "1"],
  ["empty-str", ""],
  ["space-str", " "],
  ["num-0", 0],
  ["num-1", 1],
  ["float-0", 0.0],
  ["str-off", "off"],
  ["object", {}],
  ["array", []],
];
let fails = 0;
const eq = (a, b) => (a === b ? "" : (fails++, ` MISMATCH ts=${a} rs=${b}`));
// Rust mirror: as_bool().unwrap_or(true)  =>  disabled only on bool false
const rsEnabled = (v) => (typeof v === "boolean" ? v : true);
for (const [name, v] of shapes) {
  const ts = v !== false;
  console.log(`flag ${name}: ts=${ts}${eq(ts, rsEnabled(v))}`);
}
// Channel gate: TS leave `!lChan || !cache.get(lChan)`; cache holds {"123":1}
const cache = new Map([["123", 1]]);
const chanShapes = [
  ["missing", undefined],
  ["null", null],
  ["empty", ""],
  ["zero-num", 0],
  ["snowflake-hit", "123"],
  ["snowflake-miss", "999"],
  ["garbage", "abc"],
];
for (const [name, v] of chanShapes) {
  const ts = !(!v || !cache.get(v));
  // Rust mirror: as_str + parse::<u64> + contains_key
  const rs = (() => {
    if (typeof v !== "string" || v.length === 0) return false;
    if (!/^\d+$/.test(v)) return false;
    return cache.has(v);
  })();
  console.log(`chan ${name}: ts=${ts} rs=${rs}${eq(ts, rs)}`);
}
// Template pick `stored || default`
for (const [name, v] of [["missing", undefined], ["empty", ""], ["space", " "], ["hi", "hi"], ["0", "0"]]) {
  const ts = v || "D";
  const rs = v !== undefined && v !== null && v !== "" ? v : "D";
  console.log(`tpl ${name}: ts=${JSON.stringify(ts)}${eq(ts, rs)}`);
}
console.log(fails === 0 ? "GREEN" : `RED ${fails}`);
process.exit(fails === 0 ? 0 : 1);

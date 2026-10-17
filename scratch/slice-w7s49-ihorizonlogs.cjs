// W7 slice 49 battery: src/Events/logs/ihorizon_logs.ts channelCreate gate.
// TS: `if (!channel.name.includes("ihorizon-logs")) return;`
// Expected: case-sensitive substring (String.prototype.includes).
const cases = [
  ["ihorizon-logs", true],
  ["x-ihorizon-logs", true],
  ["ihorizon-logs-y", true],
  ["x-ihorizon-logs-y", true],
  ["IHORIZON-LOGS", false],
  ["Ihorizon-Logs", false],
  ["ihorizon-LOGS", false],
  ["ihorizon-log", false],
  ["ihorizon-logss", true],
  ["", false],
  ["ihorizonlogs", false],
  ["ihorizon--logs", false],
  ["ihorizon logs", false],
  ["ｉhorizon-logs", false],
  ["ihorizon-logs\ni", true],
  [" ihorizon-logs ", true],
  ["ihorizon-logsihorizon-logs", true],
  ["İhorizon-logs", false],
];
let fail = 0;
for (const [name, want] of cases) {
  const got = name.includes("ihorizon-logs");
  const ok = got === want;
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", JSON.stringify(name), "->", got, "(want " + want + ")");
}
console.log(fail === 0 ? `GREEN ${cases.length}/${cases.length}` : `DIVERGENT ${fail}/${cases.length}`);
process.exit(fail === 0 ? 0 : 1);

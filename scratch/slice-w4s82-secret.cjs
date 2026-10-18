// W4 slice 82 battery: getEncryptionSecret `apiToken || sharedSecret` verbatim.
const secret = (apiToken, sharedSecret) => apiToken || sharedSecret;
const cases = [
  ["tok", "sh", "tok"],
  ["", "sh", "sh"],
  ["  ", "sh", "  "],      // whitespace truthy in JS -> wins
  ["\t", "sh", "\t"],
  ["\n ", "sh", "\n "],
  [undefined, "sh", "sh"],
  [null, "sh", "sh"],
  ["tok", "", "tok"],
  ["", "", ""],
];
let fail = 0;
for (const [tok, sh, want] of cases) {
  const got = secret(tok, sh);
  const ok = got === want;
  if (!ok) fail++;
  console.log(ok ? "ok " : "FAIL ", JSON.stringify(tok), "->", JSON.stringify(got));
}
console.log(fail === 0 ? "GREEN" : `RED ${fail}`);

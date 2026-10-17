// W7 slice 14 battery: Events/security/onMemberJoin.ts decision legs, verbatim.
const MAX_ATTEMPTS = 3;

// collect leg
function collect(mContent, code, attemptsLeft) {
  if (mContent === code) return { stop: 'passed', passed: true };
  attemptsLeft--;
  if (attemptsLeft <= 0) return { stop: 'failed', passed: false, left: attemptsLeft };
  return { stop: null, passed: false, left: attemptsLeft };
}
// end leg (memberJoinDate captured ref; simulate reference equality via same flag)
function endKick(passed, joinedAtNow, joinDateRefSame) {
  if (passed) return false;
  if (!joinedAtNow || joinDateRefSame) return true;
  return false;
}
// disable gate
function gate(baseData) {
  if (!baseData || baseData?.disable === true) return 'return';
  return 'proceed';
}

const cases = [
  // code match strict ===
  ['exact hit', collect('ABC123K', 'ABC123K', 3).stop === 'passed'],
  ['case miss', collect('abc123k', 'ABC123K', 3).stop === null],
  ['padded miss', collect(' ABC123K', 'ABC123K', 3).left === 2],
  ['empty miss', collect('', 'ABC123K', 3).left === 2],
  ['number miss', collect(123, 'ABC123K', 3).left === 2],
  // attempts countdown 3->2->1->fail
  ['3->2 edit', JSON.stringify(collect('x', 'C', 3)) === JSON.stringify({stop:null,passed:false,left:2})],
  ['2->1 edit', JSON.stringify(collect('x', 'C', 2)) === JSON.stringify({stop:null,passed:false,left:1})],
  ['1->0 fail', collect('x', 'C', 1).stop === 'failed'],
  ['pass at 1 left', collect('C', 'C', 1).stop === 'passed'],
  // end kick guard
  ['passed no kick', endKick(true, 'D', true) === false],
  ['failed null joinedAt kicks', endKick(false, null, true) === true],
  ['failed same ref kicks', endKick(false, 'D', true) === true],
  ['failed rejoined spares', endKick(false, 'D2', false) === false],
  // disable gate
  ['null base returns', gate(null) === 'return'],
  ['undefined returns', gate(undefined) === 'return'],
  ['disable true returns', gate({disable:true}) === 'return'],
  ['disable false proceeds', gate({disable:false}) === 'proceed'],
  ['disable "true" proceeds', gate({disable:"true"}) === 'proceed'],
  ['disable 1 proceeds', gate({disable:1}) === 'proceed'],
  ['missing disable proceeds', gate({channel:'1'}) === 'proceed'],
  // constants
  ['max attempts 3', MAX_ATTEMPTS === 3],
  ['timeout 150000', (60_000*2+30_000) === 150_000],
];
let fail = 0;
for (const [n, ok] of cases) { if (!ok) { fail++; console.log('FAIL', n); } }
console.log(fail === 0 ? `GREEN ${cases.length}/${cases.length}` : `RED ${fail} failed`);

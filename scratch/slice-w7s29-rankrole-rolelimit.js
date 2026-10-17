// W7 slice 29 battery: rankRoleModule.ts + rankRoleModule_2.ts + roleLimit.ts pure legs, verbatim.
const counterRegex = /\s*\[\d+\/\d+\]\s*$/;
function counterName(current, members, limit) {
  let base = current;
  if (counterRegex.test(base)) base = base.replace(counterRegex, "").trim();
  return `${base} [${members}/${limit}]`;
}
const A = [
  ["VIP", 3, 10], ["VIP [1/10]", 3, 10], ["VIP  [12/5]  ", 2, 5],
  ["Best [EST] Team", 4, 9], ["VIP [1 / 2]", 3, 10], ["VIP [+1/2]", 3, 10],
  ["VIP [99999999999999999999999/1]", 3, 10], ["VIP   ", 3, 10],
  ["  VIP [1/2]", 3, 10], ["[1/2]", 3, 10], ["VIP [1/2][3/4]", 3, 10],
  ["a [[1/2]]", 3, 10], ["VIP [-1/2]", 3, 10], ["VIP [١/٢]", 3, 10],
  [" [1/2]", 3, 10], ["VIP [1/2]\t", 3, 10],
];
for (const [c, m, l] of A) console.log("A|" + JSON.stringify(c) + "|" + m + "|" + l + " => " + JSON.stringify(counterName(c, m, l)));

// B: limit gate + removal + template verbatim
function gate(limit) { if (!limit) return "skip"; return "enforce"; }
for (const l of [0, 3, -5, 2.5, null, undefined, "", "3"]) console.log("Bgate|" + JSON.stringify(l) + " => " + gate(l));
for (const [c, l] of [[3,3],[4,3],[1,-5],[3,2.5],[2,2.5]]) console.log("Brm|" + c + ">" + l + " => " + (c > l));
for (const l of [3, 2.5, -5]) console.log("Btpl|VIP|" + l + " => " + JSON.stringify(`VIP [3/${l}]`));

// C: rankRole msgCreate legs
function infoLeg(dbGet) { if (!dbGet || !dbGet.roles) return "info"; return "grant-path"; }
for (const g of [null, undefined, {}, {roles:""}, {roles:"0"}, {roles:"123"}]) console.log("Cinfo|" + JSON.stringify(g) + " => " + infoLeg(g));
function nickGate(nicknames, username, globalName) {
  if (nicknames) {
    const iu = username.includes(nicknames);
    const ig = globalName ? globalName.includes(nicknames) : false;
    if (!iu && !ig) return "no-grant";
  }
  return "grant";
}
for (const [n, u, g] of [["VIP","xVIPx",null],["vip","xVIPx",null],["VIP","plain","has VIP"], [" ","NoSpaces",null],[" ","Has Space",null],["", "x", null], ["0","user0",null]]) console.log("Cnick|" + JSON.stringify(n) + "|" + u + "|" + g + " => " + nickGate(n, u, g));

// D: userUpdate legs
function updGate(gd) { if (gd?.roles && gd?.nicknames) return "proceed"; return "skip"; }
for (const g of [null, undefined, {}, {roles:"123"}, {nicknames:"v"}, {roles:"",nicknames:"v"}, {roles:"123",nicknames:""}, {roles:"123",nicknames:" "}, {roles:"0",nicknames:"0"}]) console.log("Dgate|" + JSON.stringify(g) + " => " + updGate(g));
function changed(o, n2) { return o.username !== n2.username || o.globalName !== n2.globalName; }
console.log("Dchg|same => " + changed({username:"a",globalName:"b"},{username:"a",globalName:"b"}));
console.log("Dchg|null->name => " + changed({username:"a",globalName:null},{username:"a",globalName:"b"}));
console.log("Dchg|name->null => " + changed({username:"a",globalName:"b"},{username:"a",globalName:null}));
function decision(has, matched) { if (!matched && has) return "remove"; if (matched && !has) return "add"; return "keep"; }
for (const [h, m] of [[true,false],[false,true],[true,true],[false,false]]) console.log("Ddec|" + h + "|" + m + " => " + decision(h, m));

// E: affected dedup order
const add = ["7","8","7"], rem = ["8","9"];
console.log("Eaff => " + JSON.stringify([...new Set([...add, ...rem])]));

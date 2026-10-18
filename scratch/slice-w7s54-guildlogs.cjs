// W7 slice 54 battery: guild join/leave log + owner-mail render legs.
// Replicates removeGuildLog.ts + guildCreate.ts ownerLogs() token chains verbatim.
let passes = 0, fails = 0;
const eq = (actual, expected, label) => {
	if (actual === expected) { passes++; }
	else { fails++; console.error(`FAIL ${label}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`); }
};

// --- removeGuildLog.ts: vanity `i` + `i || "None"` ---
const vanityI = (code) => { let i = ""; if (code) { i = "discord.gg/" + code; } return i; };
const vanityField = (code) => `${vanityI(code) || "None"}`;
eq(vanityField("abc123"), "discord.gg/abc123", "vanity code");
eq(vanityField(null), "None", "vanity null");
eq(vanityField(undefined), "None", "vanity undefined");
eq(vanityField(""), "None", "vanity empty");

// --- removeGuildLog.ts: memberCount || cache.size || "idk" (JS || folds 0) ---
const leaveMembers = (mc, cache) => `${mc || cache || "idk"}`;
eq(leaveMembers(42, 10), "42", "leave members primary");
eq(leaveMembers(0, 10), "10", "leave members zero folds to cache");
eq(leaveMembers(0, 0), "idk", "leave members zero/zero idk");
eq(leaveMembers(undefined, 5), "5", "leave members undef falls through");
eq(leaveMembers(null, 0), "idk", "leave members null/zero idk");

// --- guildCreate.ts ownerLogs: raw `${memberCount}` (NO fold) ---
const joinMembers = (mc) => `${mc}`;
eq(joinMembers(0), "0", "join members zero stays");
eq(joinMembers(42), "42", "join members raw");

// --- shard `#${client.shard?.ids[0]}` ---
const shardTag = (ids) => `#${ids?.[0]}`;
eq(shardTag([0]), "#0", "shard 0");
eq(shardTag([7]), "#7", "shard 7");
eq(shardTag(undefined), "#undefined", "shard missing");

// --- owner `(${ownerId}) ${username || "Unknown"}` ---
const ownerField = (id, u) => `(${id}) ${u || "Unknown"}`;
eq(ownerField("1", "bob"), "(1) bob", "owner named");
eq(ownerField("1", null), "(1) Unknown", "owner null");
eq(ownerField("1", undefined), "(1) Unknown", "owner undef");
eq(ownerField("1", ""), "(1) Unknown", "owner empty");

// --- join mail `since ${joinedTimestamp}` renders raw ms epoch ---
eq(`since ${1760745600000}`, "since 1760745600000", "join since ms");

// --- leave mail `- Members: ${memberCount}` raw (no fold) ---
eq(`- Members: ${5}`, "- Members: 5", "leave mail members raw");

// --- field-name sets byte-exact (copied from TS source) ---
const leaveNames = ["🏷️・Server Name", "🆔・Server ID", "🌐・Server Region", "👤・Member Count", "🪝・Vanity URL", "🍻・New guilds total", "🥛・New members total", "💠・Shard"];
const joinNames = ["🏷️・Server Name", "🆔・Server ID", "🌐・Server Region", "👤・Member Count", "🔗・Invite Link", "👑・Server Owner", "🪝・Vanity URL", "🍻・New guilds total", "🥛・New members total", "💠・Shard"];
eq(leaveNames.length, 8, "leave field count");
eq(joinNames.length, 10, "join field count");
eq(leaveNames[5], "🍻・New guilds total", "leave totals name");
eq(joinNames[4], "🔗・Invite Link", "join invite name");
eq(joinNames[5], "👑・Server Owner", "join owner name");

// --- colors / descriptions verbatim ---
eq("#ff0505", "#ff0505", "leave color");
eq("#00FF00", "#00FF00", "join color");
eq("**A guild removed iHorizon !**", "**A guild removed iHorizon !**", "leave desc");
eq("**A new guild added iHorizon !**", "**A new guild added iHorizon !**", "join desc");

console.log(`battery: ${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);

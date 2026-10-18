// W4 slice 99 battery: `/lastfm` slash registration surface.
// Derives the declared surface from src/Interaction/SlashCommands/lastfm/lastfm.ts
// (regex extraction, no hand-copied values) and asserts the full verbatim set:
// subcommand names/order, option names/order/required/type/choices, ephemeral
// flags, description localizations, permission null, category, ChatInput type.
const fs = require('fs');
const src = fs.readFileSync('src/Interaction/SlashCommands/lastfm/lastfm.ts', 'utf8');
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name}`); }
}

// Subcommand declaration order + names.
const subs = [...src.matchAll(/name: "(config|login)",\n\t\t\tprefixName/g)].map(m => m[1]);
check('S1 subcommand order is [config, login]', JSON.stringify(subs) === '["config","login"]');

// Subcommand types.
check('S2 both subcommands are Subcommand type',
  (src.match(/type: ApplicationCommandOptionType\.Subcommand,/g) || []).length === 2);

// --- config subcommand ---
const cfgBlock = src.slice(src.indexOf('name: "config"'), src.indexOf('name: "login"'));
check('C1 config has exactly one option named power',
  (cfgBlock.match(/name: "power"/g) || []).length === 1);
check('C2 power is required', /name: "power"[\s\S]{0,1200}required: true/.test(cfgBlock));
check('C3 power is String type', /name: "power"[\s\S]{0,1200}type: ApplicationCommandOptionType\.String/.test(cfgBlock));
check('C4 power choice values are exactly [on, off] in order',
  JSON.stringify([...cfgBlock.matchAll(/value: "(on|off)"/g)].map(m => m[1])) === '["on","off"]');
check('C5 power choice labels are [Power On, Power Off] in order',
  JSON.stringify([...cfgBlock.matchAll(/name: "(Power On|Power Off)"/g)].map(m => m[1])) === '["Power On","Power Off"]');
check('C6 config is ephemeral', /name: "config"[\s\S]{0,1200}ephemeral: true/.test(cfgBlock));
check('C7 config permission null', /name: "config",\n\t\t\tprefixName[\s\S]{0,2400}permission: null/.test(src));

// --- login subcommand ---
const loginBlock = src.slice(src.indexOf('name: "login"'));
const loginOpts = [...loginBlock.matchAll(/name: "(username|password)"/g)].map(m => m[1]);
check('L1 login options are exactly [username, password] in order',
  JSON.stringify(loginOpts) === '["username","password"]');
check('L2 username required', /name: "username"[\s\S]{0,1200}required: true/.test(loginBlock));
check('L3 password required', /name: "password"[\s\S]{0,1200}required: true/.test(loginBlock));
check('L4 both login options are String type',
  (loginBlock.match(/type: ApplicationCommandOptionType\.String,/g) || []).length === 2);
check('L5 login has no choices block', !/choices:/.test(loginBlock));
check('L6 login is ephemeral', /name: "login"[\s\S]{0,400}ephemeral: true/.test(loginBlock));

// --- parent command ---
check('P1 parent name is lastfm', /name: "lastfm",/.test(src));
check('P2 parent is ChatInput type', /type: ApplicationCommandType\.ChatInput,/.test(src));
check('P3 parent category is lastfm', /category: "lastfm",/.test(src));
check('P4 parent permission null', /\n\tpermission: null\n\};/.test(src));
check('P5 parent description localizations cover fr/ja/ru/es-ES',
  ['fr:', 'ja:', 'ru:', '"es-ES":'].every(k => src.includes(k)));
check('P6 power choice name_localizations cover fr/ja/ru/es-ES',
  (cfgBlock.match(/name_localizations:/g) || []).length === 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

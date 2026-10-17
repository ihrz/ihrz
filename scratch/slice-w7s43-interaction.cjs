// W7 slice 43 battery: Events/interaction/buttonHandler.ts + selectMenuHandler.ts
// Verbatim replicas of the decision legs (no discord.js needed — pure logic).
'use strict';
const assert = require('node:assert');

let pass = 0;
function eq(actual, expected, label) {
  assert.deepStrictEqual(actual, expected, label);
  pass++;
}

// ---- buttonHandler.ts replica ----
function buttonDecision({ isButton, userBot, guildChannels, customId }) {
  if (!isButton || userBot) return { proceed: false };
  const isDmButton = customId.endsWith('?dm');
  const isGuildButton = !!guildChannels;
  if (!isGuildButton && !isDmButton) return { proceed: false };
  const cleanId = isDmButton ? customId.slice(0, -3) : customId;
  const key = cleanId.split('%')[0];
  return { proceed: true, key };
}

// ---- selectMenuHandler.ts replica ----
function selectDecision({ isSelect, userBot, guildChannels, customId }) {
  if (!isSelect || !guildChannels || userBot) return { proceed: false };
  const key = customId.split('%')[0]; // NOTE: raw id, no ?dm strip
  return { proceed: true, key };
}

// Button legs
eq(buttonDecision({ isButton: false, userBot: false, guildChannels: true, customId: 'x' }), { proceed: false }, 'btn non-button drops');
eq(buttonDecision({ isButton: true, userBot: true, guildChannels: true, customId: 'x' }), { proceed: false }, 'btn bot drops even in guild');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: true, customId: 'plain-id' }), { proceed: true, key: 'plain-id' }, 'btn guild plain proceeds');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: true, customId: 'a?dm' }), { proceed: true, key: 'a' }, 'btn guild ?dm still strips');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: false, customId: 'newsletter-toggle%123?dm' }), { proceed: true, key: 'newsletter-toggle' }, 'btn DM ?dm proceeds, strip-then-%');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: false, customId: 'plain-id' }), { proceed: false }, 'btn DM plain drops');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: false, customId: 'a?dmb' }), { proceed: false }, 'btn DM mid-string ?dm drops');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: false, customId: '?dmfoo' }), { proceed: false }, 'btn DM prefix ?dm drops');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: true, customId: 'button_reaction%456' }), { proceed: true, key: 'button_reaction' }, 'btn % key first segment');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: true, customId: 'a%b%c' }), { proceed: true, key: 'a' }, 'btn multi-% first segment');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: true, customId: '' }), { proceed: true, key: '' }, 'btn empty id proceeds in guild');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: false, customId: '?dm' }), { proceed: true, key: '' }, 'btn bare ?dm strips to empty');
eq(buttonDecision({ isButton: true, userBot: false, guildChannels: null, customId: 'x?dm' }), { proceed: true, key: 'x' }, 'btn null-channels + ?dm proceeds');
eq(buttonDecision({ isButton: true, userBot: true, guildChannels: false, customId: 'x?dm' }), { proceed: false }, 'btn bot drops even with ?dm');

// Select legs
eq(selectDecision({ isSelect: false, userBot: false, guildChannels: true, customId: 'x' }), { proceed: false }, 'sel non-select drops');
eq(selectDecision({ isSelect: true, userBot: true, guildChannels: true, customId: 'x' }), { proceed: false }, 'sel bot drops');
eq(selectDecision({ isSelect: true, userBot: false, guildChannels: false, customId: 'x' }), { proceed: false }, 'sel DM plain drops');
eq(selectDecision({ isSelect: true, userBot: false, guildChannels: false, customId: 'x?dm' }), { proceed: false }, 'sel DM ?dm ALSO drops (no dm leg)');
eq(selectDecision({ isSelect: true, userBot: false, guildChannels: true, customId: 'plain-id' }), { proceed: true, key: 'plain-id' }, 'sel guild plain proceeds');
eq(selectDecision({ isSelect: true, userBot: false, guildChannels: true, customId: 'foo?dm' }), { proceed: true, key: 'foo?dm' }, 'sel guild ?dm keeps suffix in key (no strip)');
eq(selectDecision({ isSelect: true, userBot: false, guildChannels: true, customId: 'x%y?dm' }), { proceed: true, key: 'x' }, 'sel % split before ?dm tail');
eq(selectDecision({ isSelect: true, userBot: false, guildChannels: null, customId: 'x' }), { proceed: false }, 'sel null-channels drops');

console.log(`battery green ${pass}/${pass}`);

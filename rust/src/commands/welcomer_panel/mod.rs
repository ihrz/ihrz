// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Interactive welcomer config panel. Mirrors
// Interaction/SlashCommands/guildconfig/welcomerPanel.ts (+ !welcomer.ts
// entry): join/leave/dm/roles/channels/banner sections with message
// modals, embed-id modals, text/component toggles, channel + role
// pickers, dangerous-role confirm, banner reset/toggle.
//
// Stateless: every interaction reloads GUILD.GUILD_CONFIG and re-renders
// (the TS in-memory panel state becomes the `welcomerPanelSection` blob
// field + direct blob reads). Classic embeds + action rows stand in for
// the TS Components V2 container (serenity 0.12 has no V2 builders),
// like the ticket panels. Banner image editing stays html2png-blocked;
// only status/reset/toggle port.

pub mod main;

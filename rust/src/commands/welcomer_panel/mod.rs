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
// field + direct blob reads). Rendering is Components V2 (Container +
// TextDisplay + Separator + MediaGallery over raw REST in `v2`, since
// serenity 0.12 has no V2 builders), like the TS panel.

pub mod main;
pub mod v2;

// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/membercount/membercount.ts.
//
// TS keys: <guild>.GUILD.MCOUNT.<member|roles|channel|boost|bot|voice|online>
// { name: template, enable: true, channel: voiceChannelId }.
// Template placeholders: {MemberCount} {RolesCount} {ChannelCount}
// {BoostCount} {BotCount} {VoiceCount} {OnlineCount}.

pub mod main;

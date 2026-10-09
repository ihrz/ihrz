// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/giveaway/* via giveawaysManager.ts.
//
// TS store: giveawaysTable keyed by messageId {guildId, channelId,
// winnerCount, prize, hostedBy, expireIn, ended, entries[], winners[]}.

pub mod main;

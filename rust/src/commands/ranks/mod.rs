// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/ranks/*.
//
// TS keys: GUILD.RANKS {disable, xpChannels, ignoreChannels[], roles[],
// message}, USER.<uid>.RANKS {level, xp, xptotal, message}.
// XP engine (message counting) lives in events; card/podHTML->PNG render
// pending (see PORT_INVENTORY.md).

pub mod main;

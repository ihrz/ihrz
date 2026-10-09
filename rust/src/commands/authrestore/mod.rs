// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/authrestore/*
// (authrestore.ts parent + !set/!delete/!get/!roles/!force-join.ts)
// and src/core/functions/authRestoreHelper.ts.
//
// The HorizonGateway HTTP API (create/securityCodeUpdate/changeRole/
// forcejoin + the force-join websocket stream) and the html2png stats
// image are external infra (see Blocked in MIGRATION.md): the request
// builders, response parsers and websocket-event parser below are
// ported and unit-tested, the live calls run only when the gateway is
// configured. Everything else (secret-code lookup, pagination,
// histogram/locale/recent stats, category navigation, RESTORECORD
// kv state) is fully offline.
//
// TS keys: GUILD.RESTORECORD {channelId, messageId}; the `authrestore`
// table rows are GuildAuthRestore blobs keyed by guild id.

pub mod main;

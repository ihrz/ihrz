// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Interactive embed builder. Mirrors
// src/Interaction/HybridCommands/utils/!embed.ts (EmbedManager: select
// menu actions 0-13 + save/send/replace/cancel + channel pick).
//
// TS keeps the draft in a stateful EmbedManager behind collectors; the
// port is stateless (welcomer-panel precedent): the draft lives in
// EMBED_DRAFT.<builder_msg_id>, text/media inputs arrive via
// EMBED_AWAIT.<user_id> consumed by the message() hook. Collector
// timeouts (1_420_000 ms) have no stateless equivalent — drafts persist
// until saved, sent or cancelled. Button ids are namespaced
// (embed:save/...) because bare "save"/"send" are unsafe in the shared
// component router; the select + channel-select ids stay TS-verbatim.
//
// TS keys: EMBED.<id> {embedOwner, embedSource}.

pub mod embed_builder;

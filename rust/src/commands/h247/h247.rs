use super::*;
use super::{info::h247_info, join::h247_join, leave::h247_leave};

/// Run-less group root for the h247 category (TS `h247.ts`).
// Gate parity: TS gates `join`/`leave` at Administrator and leaves
// `info` at `permission: null`; the Rust side mirrors this with the
// parent `ADMINISTRATOR` Discord-layer default plus an ungated `info`
// leaf. Poise only applies `default_member_permissions` to slash
// registration (poise 0.6.2 `structs/command.rs`), never as a prefix
// runtime check, so `!h247 info` stays open on prefix exactly like TS;
// on slash the parent default covers the whole group server-side
// (subcommands inherit top-level permissions), so `/h247 info` still
// requires Administrator there. Do NOT add a leaf permission gate to
// `info`: TS `info` is deliberately public. The only gate on `info`
// is the guild-presence early return in the body, mirroring the
// `!interaction.guild` leg of the TS !info.ts guard.
#[poise::command(
    slash_command,
    prefix_command,
    category = "h247",
    rename = "h247",
    subcommands("h247_join", "h247_leave", "h247_info"),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required,
    name_localized("fr", "h247"),
    name_localized("ja", "h247"),
    name_localized("ru", "h247"),
    name_localized("es-ES", "h247"),
    description_localized("fr", "Garder iHorizon connecté 24/7 dans un salon vocal!"),
    description_localized("ja", "iHorizonをボイスチャンネルに24時間365日接続させ続けます！"),
    description_localized("ru", "Держите iHorizon на связи 24/7 в голосовом канале!"),
    description_localized("es-ES", "¡Mantén a iHorizon conectado 24/7 en un canal de voz!")
)]
pub async fn h247(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

use super::*;
use super::{info::h247_info, join::h247_join, leave::h247_leave};

/// Run-less group root for the h247 category (TS `h247.ts`).
// Gate parity: TS gates `join`/`leave` at Administrator and leaves
// `info` at `permission: null`; the Rust side mirrors this with the
// parent `ADMINISTRATOR` Discord-layer default plus an ungated `info`
// leaf. Poise only applies `default_member_permissions` to slash
// registration (poise 0.6.2 `structs/command.rs`), never as a prefix
// runtime check, so `!h247 info` stays open on prefix exactly like TS.
// Do NOT add a leaf gate to `info`: TS `info` is deliberately public.
#[poise::command(
    slash_command,
    prefix_command,
    category = "h247",
    rename = "h247",
    subcommands("h247_join", "h247_leave", "h247_info"),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
)]
pub async fn h247(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

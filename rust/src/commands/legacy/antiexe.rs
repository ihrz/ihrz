use super::*;

/// Delete every message containing binary files.
///
/// Mirrors @antiexe.ts: a bare toggle with no action option — the
/// stored `UTILS.antiExe` flips between `"on"` and `"off"` (never
/// `"1"`/`"0"`) and the reply is the `[Anti-Bin]` line.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "antiexe",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn antiexe(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let state =
        crate::commands::owner::main::routed_get(&ctx.data().pool, &gid, &gid, "UTILS.antiExe")
            .await;
    let new_state = if state.as_deref() == Some("on") {
        "off"
    } else {
        "on"
    };
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.antiExe",
        new_state,
    )
    .await?;
    ctx.say(if new_state == "on" {
        "**[Anti-Bin]** Enabled: 🔐"
    } else {
        "**[Anti-Bin]** Disabled: 🔓"
    })
    .await?;
    Ok(())
}

use super::*;

/// Bulk-create every server log channel (autologs preset).
// Mirrors `MessageCommands/guildconfig/autologs.ts:45-52`: the
// prefix-only `autologs` command takes no channel and delegates to
// the setlogs `auto` slow path (a `LOGS` category plus one per-type
// channel), so this runs `handle_auto` with no channel. The ticket
// entry lands on the special `GUILD.TICKET.logs` key via
// `auto_db_key`, like TS `setlogschannel.ts:353-358`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "autologs",
    aliases("presetlogs", "presetlog", "autolog"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autologs(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    super::setlogschannel::handle_auto(&ctx, &code, None).await?;
    Ok(())
}

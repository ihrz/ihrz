use super::*;
use poise::serenity_prelude as serenity;

/// Rename a ticket!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "rename",
    default_member_permissions = "MANAGE_CHANNELS",
    description_localized("fr", "Rénommer un ticket"),
    description_localized("ja", "チケットの名前を変更！"),
    description_localized("ru", "Переименовать тикет!"),
    description_localized("es-ES", "Renombrar un ticket!")
)]
pub async fn ticket_rename(
    ctx: Ctx<'_>,
    // Required like TS (`getString("name")!` slash / `longString(args,
    // 0)` prefix validated by the checkCommandArgs caret gate before
    // run): a bare invocation never reaches the handler — verified
    // live, prod answers the caret usage embed (`+rename [string]`),
    // never the not-in-ticket leg. Rest-of-line like TS
    // `longString(args, 0)`: multi-word names survive prefix parsing
    // (same `#[rest]` pattern as fun/caracteres); `#[rest]` only
    // affects prefix parsing, the slash `name` option still registers
    // (required).
    #[description = "The new name of the ticket channel."]
    #[description_localized("fr", "Le nouveau nom du canal de ticket")]
    #[description_localized("ja", "チケットチャンネルの新しい名前。")]
    #[description_localized("ru", "Новое название канала тикета.")]
    #[description_localized("es-ES", "El nuevo nombre del canal de ticket.")]
    #[rest]
    name: String,
) -> Result<(), anyhow::Error> {
    // Mirrors !rename.ts guards (disable + delete_not_in_ticket) and
    // the rename error reply.
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    if ticket_guard_in_ticket(
        &ctx,
        pool,
        &gid,
        &code,
        ctx.channel_id(),
        "delete_not_in_ticket",
    )
    .await
    {
        return Ok(());
    }
    // TS renames with the validated `name` (`setName(name)`; throw ->
    // `ticket_rename_error` reply).
    if ctx
        .channel_id()
        // Trim is deliberate: Discord rejects leading/trailing whitespace
        // in channel names, and the TS guard shape (`setName(name)`
        // throw -> error reply) is preserved — a blank name just lands
        // in the error reply below.
        .edit(&ctx.http(), serenity::EditChannel::new().name(name.trim()))
        .await
        .is_ok()
    {
        ctx.say(
            crate::lang::get(&code, "ticket_rename_ok")
                .unwrap_or_else(|| "Ticket channel has been renamed!".to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::lang::get(&code, "ticket_rename_error")
                .unwrap_or_else(|| "Error when renaming the text channel".to_string()),
        )
        .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rest_keeps_slash_name_required() {
        // `#[rest]` only affects prefix parsing (rest-of-line, like TS
        // `longString(args, 0)`); the same parameter still registers as
        // the slash `name` option. Required like TS (`getString("name")!`
        // slash, checkCommandArgs caret gate prefix): verified live, a
        // bare `.ticket rename` on prod answers the caret usage embed,
        // so the miss must never reach the handler.
        let cmd = ticket_rename();
        assert!(cmd.slash_action.is_some());
        assert!(cmd.prefix_action.is_some());
        let param = cmd
            .parameters
            .iter()
            .find(|p| p.name == "name")
            .expect("slash `name` option");
        assert!(param.required);
    }
}

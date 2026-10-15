use super::*;
use poise::serenity_prelude as serenity;

/// List all entries in giveaway!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "list-entries",
    aliases("list"),
    default_member_permissions = "MANAGE_MESSAGES",
    name_localized("fr", "afficher-les-participant"),
    name_localized("ja", "list-entries"),
    name_localized("ru", "list-entries"),
    name_localized("es-ES", "list-entries"),
    description_localized("fr", "Répertorier toutes les entrées dans le giveaway"),
    description_localized("ja", "ギブアウェイの全エントリーを一覧表示！"),
    description_localized("ru", "Показать всех участников розыгрыша!"),
    description_localized("es-ES", "Listar todas las entradas en el sorteo!")
)]
pub async fn gw_entries(
    ctx: Ctx<'_>,
    // Option (not required) for slash (Discord validates `giveaway-id`
    // required:true in gw.ts), but a bare PREFIX call never reaches the
    // handler on prod: TS checkCommandArgs counts required args first
    // (method.ts) and renders the caret usage embed. The gate below
    // mirrors that; with an id present the TS `string(args, 0)`
    // nullable path applies (isValid fail -> `end_not_find_giveaway`).
    #[description_localized(
        "fr",
        "L'identifiant du cadeau (est l'identifiant du message du giveaway)"
    )]
    #[description_localized("ja", "ギブアウェイID（埋め込みギブアウェイのメッセージID）")]
    #[description_localized("ru", "ID розыгрыша (это ID сообщения эмбеда розыгрыша)")]
    #[description_localized(
        "es-ES",
        "El ID del sorteo (es el ID del mensaje del embed del sorteo)"
    )]
    #[description = "The giveaway id (is the message id of the embed's giveaways)"]
    #[rename = "giveaway-id"]
    message_id: Option<String>,
) -> Result<(), anyhow::Error> {
    // TS checkCommandArgs counts first (`giveaway-id` required:true in
    // HybridCommands/giveaway/gw.ts): a bare `.gw list-entries`
    // renders the caret usage embed, never the null-id not-found leg
    // (baninfo.rs / ranks channel.rs precedent). Gate runs before
    // defer, like the executor.
    if let poise::Context::Prefix(pctx) = ctx {
        if prefix_giveaway_id_missing(pctx.args) {
            crate::bot::prefix_usage_denial(ctx, None).await;
            return Ok(());
        }
    }
    // Ack-first like the TS `thinking: true` on `gw` (gw.ts:419): the
    // footer snapshot below is an HTTP fetch, so defer up front
    // instead of risking the 3s interaction timeout.
    ctx.defer().await?;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw_id = message_id.as_deref().unwrap_or("null");
    let mid: u64 = raw_id.trim().parse().unwrap_or(0);
    let pool = &ctx.data().pool;
    let code_early = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t_early = |k: &str| crate::lang::get(&code_early, k).unwrap_or_default();
    // Global board read like TS GetGiveawayData; !list-entries.ts gates
    // on isValid (-> end_not_find_giveaway) then isEnded
    // (-> end_command_error).
    let Some((home_gid, raw)) = super::gw::store_lookup(pool, &gid, mid).await else {
        ctx.say(t_early("end_not_find_giveaway").replace("${gw}", raw_id.trim()))
            .await?;
        return Ok(());
    };
    // TS listEntries only serves the owning guild
    // (`interaction.guildId === fetch.guildId`, giveawaysManager.ts:614);
    // cross-guild reads silently return.
    if home_gid != gid {
        return Ok(());
    }
    // Mirrors !list-entries.ts:52-67 (missing -> end_not_find_giveaway,
    // ended -> end_command_error).
    let gw: Giveaway = match serde_json::from_str(&raw) {
        Ok(gw) => gw,
        Err(_) => {
            ctx.say(t_early("end_not_find_giveaway").replace("${gw}", raw_id.trim()))
                .await?;
            return Ok(());
        }
    };
    if !gw.is_valid {
        ctx.say(t_early("end_not_find_giveaway").replace("${gw}", raw_id.trim()))
            .await?;
        return Ok(());
    }
    if gw.ended {
        ctx.say(t_early("end_command_error")).await?;
        return Ok(());
    }
    let entries: Vec<String> = gw.entries.clone();
    if entries.is_empty() {
        // Public like the TS slash path (`interaction.editReply` after
        // `thinking: true`, giveawaysManager.ts:618-621).
        ctx.say(t_early("history_no_entries")).await?;
        return Ok(());
    }
    let http = ctx.serenity_context().http.clone();
    let invoker = Some(ctx.author().id.get());
    let t = |k: &str| crate::lang::get(&code_early, k).unwrap_or_default();
    let Some((embed, components, icon)) =
        crate::commands::giveaway::render_entries_page(crate::commands::giveaway::EntriesPage {
            http: &http,
            pool,
            gid: &home_gid,
            t,
            mid,
            entries: &entries,
            page: 0,
            invoker,
        })
        .await
    else {
        return Ok(());
    };
    // Public page 0 like the TS slash path (deferred `editReply`,
    // not the ephemeral button reply; the button leg stays ephemeral
    // in `handle_giveaway_list`).
    let mut reply = poise::CreateReply::default()
        .embed(embed)
        .components(components);
    if let Some(bytes) = icon {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Prefix count-check predicate: a bare (or whitespace-only) prefix
/// invocation must render the caret usage embed, mirroring TS
/// checkCommandArgs for the required `giveaway-id` option.
pub fn prefix_giveaway_id_missing(args: &str) -> bool {
    args.trim().is_empty()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bare_prefix_id_counts_as_missing() {
        // Pins the TS checkCommandArgs gate: bare or whitespace-only
        // prefix args render the caret usage embed, never the null-id
        // not-found leg.
        assert!(prefix_giveaway_id_missing(""));
        assert!(prefix_giveaway_id_missing("   "));
        assert!(!prefix_giveaway_id_missing("123"));
    }

    #[test]
    fn ended_gate_parses_like_ts_isended() {
        let live = Giveaway {
            guild_id: "g".into(),
            channel_id: "c".into(),
            winner_count: 1,
            prize: "p".into(),
            hosted_by: "h".into(),
            expire_in_ms: 1,
            ended: false,
            entries: vec![],
            winners: vec![],
            requirement: "none".into(),
            requirement_value: String::new(),
            is_valid: true,
            embed_image_url: None,
        };
        let raw = serde_json::to_string(&live).unwrap();
        let parsed: Giveaway = serde_json::from_str(&raw).unwrap();
        assert!(!parsed.ended);
        assert!(parsed.is_valid);
        let mut ended = live;
        ended.ended = true;
        assert!(ended.ended);
    }
}

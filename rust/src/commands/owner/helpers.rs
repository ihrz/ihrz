#[allow(unused_imports)]
use super::entry::*;
use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// Per-guild language code (en-US fallback for guild lookup only).
pub async fn lang_code(ctx: &Ctx<'_>) -> String {
    crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await
}

/// Lang lookup with the exact en-US fallback (YAML untouched).
pub fn lt(code: &str, key: &str, fallback: &str) -> String {
    crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
}

/// `${client.iHorizon_Emojis.No}` markup for templates.
pub async fn no_emoji(ctx: &Ctx<'_>) -> String {
    crate::emojis::app_emoji_markup(ctx.http(), "No")
        .await
        .unwrap_or_default()
}

/// Display name. Mirrors `member.globalName || member.displayName`.
pub fn display_name(user: &serenity::User) -> String {
    user.global_name
        .clone()
        .unwrap_or_else(|| user.name.clone())
}

/// Owners embed for the no-arg add path. Mirrors the TS
/// `Owners [Bot]` / `Owners [Guild]` embeds: color + author name (not
/// a title) + mention description + shared footer text. No timestamp.
/// Callers attach the footer icon file like the TS
/// `footerAttachmentBuilder` send.
pub fn owners_embed(
    title: &str,
    owners: &[String],
    footer_name: &str,
    with_icon: bool,
) -> serenity::CreateEmbed {
    let desc = owners
        .iter()
        .map(|id| format!("<@{id}>"))
        .collect::<Vec<_>>()
        .join("\n");
    let base = serenity::CreateEmbed::default()
        .colour(0x2E2EFE_u32)
        .author(serenity::CreateEmbedAuthor::new(title))
        .description(desc);
    // The callers attach footer_icon.png exactly when with_icon is true,
    // so reference it only then; no icon means plain footer text, never
    // an empty-string icon_url.
    if with_icon {
        base.footer(
            serenity::CreateEmbedFooter::new(footer_name).icon_url("attachment://footer_icon.png"),
        )
    } else {
        base.footer(serenity::CreateEmbedFooter::new(footer_name))
    }
}
/// Guilds eligible for the blacklist ban sweep. Mirrors the TS
/// `broadcastBanAcrossShards` filter in
/// `HybridCommands/owner/blacklist.ts` (`memberCount <= 500` only —
/// no permission gate there; failures surface per-guild try/catch).
/// Single-process: local cache instead of `broadcastEval`.
pub fn sweep_targets(ctx: &Ctx<'_>) -> Vec<serenity::GuildId> {
    let cache = &ctx.serenity_context().cache;
    cache
        .guilds()
        .into_iter()
        .filter(|gid| {
            cache
                .guild(*gid)
                .map(|g| g.member_count <= SWEEP_MAX_MEMBERS)
                .unwrap_or(false)
        })
        .collect()
}

/// Cached bot BanMembers check for one guild: union of the bot's
/// role permissions plus @everyone (Administrator implies all).
/// Mirrors `g.members.me?.permissions.has("BanMembers")` in
/// `broadcastUnbanAcrossShards`
/// (`HybridCommands/owner/unblacklist.ts`).
pub fn bot_can_ban(guild: &serenity::Guild, bot_id: serenity::UserId) -> bool {
    let Some(member) = guild.members.get(&bot_id) else {
        return false;
    };
    let mut perms = serenity::Permissions::empty();
    for role_id in &member.roles {
        if let Some(role) = guild.roles.get(role_id) {
            perms |= role.permissions;
        }
    }
    if let Some(everyone) = guild.roles.get(&serenity::RoleId::new(guild.id.get())) {
        perms |= everyone.permissions;
    }
    if perms.administrator() {
        return true;
    }
    perms.ban_members()
}

/// Guilds eligible for the unblacklist unban sweep. Same size cap as
/// `sweep_targets` plus the TS BanMembers gate (unblacklist.ts only —
/// the blacklist ban sweep has none).
pub fn sweep_unban_targets(ctx: &Ctx<'_>) -> Vec<serenity::GuildId> {
    let sctx = ctx.serenity_context();
    let bot_id = sctx.cache.current_user().id;
    sctx.cache
        .guilds()
        .into_iter()
        .filter(|gid| {
            sctx.cache
                .guild(*gid)
                .map(|g| g.member_count <= SWEEP_MAX_MEMBERS && bot_can_ban(&g, bot_id))
                .unwrap_or(false)
        })
        .collect()
}

/// Ban one user across cached guilds in batches of 10 with a 100ms pause.
/// Mirrors `broadcastBanAcrossShards`. Returns (banned, total).
pub async fn sweep_ban(ctx: &Ctx<'_>, user_id: u64, reason: &str) -> (usize, usize) {
    let targets = sweep_targets(ctx);
    let total = targets.len();
    let mut ok = 0usize;
    let chunks = targets.chunks(SWEEP_BATCH).len();
    for (i, chunk) in targets.chunks(SWEEP_BATCH).enumerate() {
        for gid in chunk {
            if gid
                .ban_with_reason(ctx.http(), serenity::UserId::new(user_id), 0, reason)
                .await
                .is_ok()
            {
                ok += 1;
            }
        }
        if i + 1 < chunks {
            tokio::time::sleep(std::time::Duration::from_millis(SWEEP_DELAY_MS)).await;
        }
    }
    (ok, total)
}

/// Unban one user across cached guilds, batched like `sweep_ban`.
/// Mirrors `broadcastUnbanAcrossShards` (unblacklist.ts): same size
/// cap plus the BanMembers gate (see `sweep_unban_targets`).
/// Returns (unbanned, total).
pub async fn sweep_unban(ctx: &Ctx<'_>, user_id: u64) -> (usize, usize) {
    let targets = sweep_unban_targets(ctx);
    let total = targets.len();
    let mut ok = 0usize;
    let chunks = targets.chunks(SWEEP_BATCH).len();
    for (i, chunk) in targets.chunks(SWEEP_BATCH).enumerate() {
        for gid in chunk {
            if gid
                .unban(ctx.http(), serenity::UserId::new(user_id))
                .await
                .is_ok()
            {
                ok += 1;
            }
        }
        if i + 1 < chunks {
            tokio::time::sleep(std::time::Duration::from_millis(SWEEP_DELAY_MS)).await;
        }
    }
    (ok, total)
}

/// No-arg blacklist pager: 5-per-page embed with prev/next buttons and a
/// 16-minute collector gated on the invoker. Mirrors the TS collector
/// (wrap-around paging, buttons disabled at the end).
pub async fn send_bl_pager(
    ctx: &Ctx<'_>,
    code: &str,
    entries: &[(u64, BlEntry)],
) -> Result<(), anyhow::Error> {
    let unknown = lt(code, "profil_unknown", "Unknown");
    let no_reason = lt(code, "blacklist_var_no_reason", "No reason found");
    let title_tpl = lt(
        code,
        "blacklist_embed_title",
        "Blacklist - Page ${i / usersPerPage + 1}",
    );
    let pages = bl_pages(entries, &title_tpl, &unknown, &no_reason);
    let mk_embed = |page: usize| {
        serenity::CreateEmbed::default()
            .colour(0x2E2EFE_u32)
            .title(pages[page].0.clone())
            .description(pages[page].1.clone())
            .timestamp(serenity::Timestamp::now())
    };
    let mk_row = |disabled: bool| {
        // PAGER-ID VERDICT: bare `bl-prev`/`bl-next` ids are safe —
        // the collector is message-scoped (`await_component_interaction`
        // on this reply only) and invoker-gated, so concurrent pagers
        // never cross-talk. Kept as-is on purpose.
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("bl-prev")
                .style(serenity::ButtonStyle::Secondary)
                .label("<<<")
                .disabled(disabled),
            serenity::CreateButton::new("bl-next")
                .style(serenity::ButtonStyle::Secondary)
                .label(">>>")
                .disabled(disabled),
        ])
    };
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_embed(0))
                .components(vec![mk_row(false)]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let mut page = 0usize;
    let author_id = ctx.author().id;
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(BL_COLLECTOR_SECS))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author_id {
            continue;
        }
        match press.data.custom_id.as_str() {
            "bl-prev" => page = (page + pages.len() - 1) % pages.len(),
            "bl-next" => page = (page + 1) % pages.len(),
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(page))
                        .components(vec![mk_row(false)]),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![mk_row(true)]),
        )
        .await;
    Ok(())
}
/// Blacklist info embed. Mirrors the TS embed description.
/// Footer + attachment are applied by the caller (`send_blinfo_embed`)
/// mirroring `footerBuilder`/`footerAttachmentBuilder` + `setTimestamp`
/// in blinfo.ts / bledit.ts (O7).
pub fn blinfo_embed(
    user: &serenity::User,
    entry: &BlEntry,
    unknown: &str,
    no_reason: &str,
) -> serenity::CreateEmbed {
    serenity::CreateEmbed::default()
        .colour(0x2E2EFE_u32)
        .description(format!(
            "<@{}> ({})\n├─ {}\n├─ `{}`\n├─ By {}",
            user.id.get(),
            user.name,
            entry
                .created_at_ms
                .map(format_bl_date)
                .unwrap_or_else(|| unknown.to_string()),
            entry.reason.as_deref().unwrap_or(no_reason),
            entry.owner.as_deref().unwrap_or(unknown),
        ))
        .timestamp(serenity::Timestamp::now())
}

/// Send a blacklist info embed with the shared footer + icon
/// attachment. Mirrors the TS `setFooter(await footerBuilder(..))` +
/// `files: [await footerAttachmentBuilder(..)]` legs.
pub async fn send_blinfo_embed(
    ctx: &Ctx<'_>,
    user: &serenity::User,
    entry: &BlEntry,
    unknown: &str,
    no_reason: &str,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_else(|| "0".to_string());
    let (footer_name, footer_bytes) = crate::commands::shared::footer_parts(ctx, &gid).await;
    // No icon means plain footer text (never an empty-string icon_url);
    // the file is attached below only when the footer references it.
    let embed_base = blinfo_embed(user, entry, unknown, no_reason);
    let embed = if footer_bytes.is_some() {
        crate::commands::shared::embed_with_footer(embed_base, &footer_name, true)
    } else {
        embed_base.footer(serenity::CreateEmbedFooter::new(footer_name.clone()))
    };
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

use super::{NEWSLETTER_BL_KEY, NEWSLETTER_TOGGLE_PREFIX};
use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

// Changelog display. Mirrors MessageCommands/bot/@updates.ts: version
// embed (title/description, colour #475387, version/commit/branch
// fields, bot-name footer + `attachment://footer_icon.png` thumbnail
// + timestamp), three link buttons (GitLab/Releases/Commit with the
// GitLab_Logo/Sparkles/Crown app emojis) and the newsletter-toggle
// row (`newsletter-toggle%<guildId>`, label/style from the global
// `newsletter_bl` map, Danger when subscribed / Primary when not).
// The toggle itself is answered by the shared
// `handle_newsletter_toggle` component route (see events_handler).
//
// Verdict (documented delta, no silent drift): the changelog-PDF
// attach leg (`changelogs/<lang>/<version>/CHANGELOG_*.pdf` via
// `Bun.file`) is skipped — this port has no PDF pipeline, and the TS
// sends the embed without attachment when the file is missing anyway.
// The 10-minute button-disable collector is skipped too: component
// routing here is stateless, the toggle stays live like the other
// persistent buttons.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "updates",
    aliases("changelog", "update", "changes")
)]
pub async fn updates(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();

    let version = env!("CARGO_PKG_VERSION");
    let branch = git_word(&["branch", "--show-current"]);
    let short = git_word(&["rev-parse", "--short", "HEAD"]);
    let long = git_word(&["rev-parse", "HEAD"]);
    let remote = crate::bot::resolve_git_remote();
    let commit_url = match (remote.is_empty(), long.as_deref()) {
        (false, Some(hash)) => format!("{remote}/commit/{hash}"),
        _ => String::new(),
    };
    let release_url = if remote.is_empty() {
        String::new()
    } else {
        format!("{remote}/-/releases/{version}")
    };

    let footer_name = crate::commands::shared::bot_footer_name(
        crate::db::kv_get(pool, &gid, crate::commands::shared::BOT_NAME_KEY)
            .await
            .as_deref(),
    );
    let mut icon_bytes = crate::commands::shared::footer_icon_bytes(
        crate::db::kv_get(pool, &gid, crate::commands::shared::BOT_PFP_KEY)
            .await
            .as_deref(),
    );
    if icon_bytes.is_none() {
        let face = ctx.serenity_context().cache.current_user().face();
        icon_bytes = crate::commands::shared::download_bytes(&face).await;
    }

    let commit_field = match (short.as_deref(), commit_url.is_empty()) {
        (Some(s), false) => format!("[`{s}`]({commit_url})"),
        (Some(s), true) => format!("`{s}`"),
        _ => "`?`".to_string(),
    };
    let mut embed = serenity::CreateEmbed::default()
        .title(t("updates_embed_title"))
        .colour(serenity::Colour::from_rgb(0x47, 0x53, 0x87))
        .description(t("updates_embed_description"))
        .field(
            t("updates_field_version"),
            format!("`{}`", crate::commands::botcat::status::bot_version_label()),
            false,
        )
        .field(t("updates_field_commit"), commit_field, true)
        .field(
            t("updates_field_branch"),
            format!("`{}`", branch.as_deref().unwrap_or("?")),
            true,
        )
        .footer(
            serenity::CreateEmbedFooter::new(footer_name).icon_url("attachment://footer_icon.png"),
        )
        .timestamp(serenity::Timestamp::now());
    if icon_bytes.is_some() {
        embed = embed.thumbnail("attachment://footer_icon.png");
    }

    let http = ctx.http();
    let mut link_btns = Vec::new();
    if !remote.is_empty() {
        let mut gitlab_btn =
            serenity::CreateButton::new_link(remote.clone()).label("GitLab".to_string());
        if let Some(e) = link_emoji(http, "GitLab_Logo").await {
            gitlab_btn = gitlab_btn.emoji(e);
        }
        link_btns.push(gitlab_btn);
    }
    if !release_url.is_empty() {
        let mut releases_btn =
            serenity::CreateButton::new_link(release_url.clone()).label("Releases".to_string());
        if let Some(e) = link_emoji(http, "Sparkles").await {
            releases_btn = releases_btn.emoji(e);
        }
        link_btns.push(releases_btn);
    }
    if !commit_url.is_empty() {
        let mut commit_btn =
            serenity::CreateButton::new_link(commit_url.clone()).label("Commit".to_string());
        if let Some(e) = link_emoji(http, "Crown").await {
            commit_btn = commit_btn.emoji(e);
        }
        link_btns.push(commit_btn);
    }
    let mut rows = Vec::new();
    if !link_btns.is_empty() {
        rows.push(serenity::CreateActionRow::Buttons(link_btns));
    }

    // Newsletter row for everyone: subscribed (absent from the global
    // `newsletter_bl` map) -> Danger/Unsubscribe, else Primary/Subscribe.
    let author = ctx.author().id.get().to_string();
    let unsubscribed = crate::db::kv_get(pool, "0", NEWSLETTER_BL_KEY)
        .await
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
        .and_then(|v| v.get(author.clone()).and_then(|b| b.as_bool()))
        .unwrap_or(false);
    let toggle = serenity::CreateButton::new(format!("{NEWSLETTER_TOGGLE_PREFIX}{gid}"))
        .label(if unsubscribed {
            t("newsletter_btn_subscribe")
        } else {
            t("newsletter_btn_unsubscribe")
        })
        .style(if unsubscribed {
            serenity::ButtonStyle::Primary
        } else {
            serenity::ButtonStyle::Danger
        });
    rows.push(serenity::CreateActionRow::Buttons(vec![toggle]));

    let mut reply = poise::CreateReply::default().embed(embed).components(rows);
    if let Some(bytes) = icon_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// One-word git output (mirrors `shell()` in src/version.ts).
/// `None` when git is missing or the command fails (offline checkout).
fn git_word(args: &[&str]) -> Option<String> {
    let out = std::process::Command::new("git").args(args).output().ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8(out.stdout).ok()?.trim().to_string();
    (!s.is_empty()).then_some(s)
}

/// Cached app emoji for a link button (missing entries leave the
/// button text-only, like the guild-create welcome rows).
async fn link_emoji(http: &serenity::Http, name: &str) -> Option<serenity::ReactionType> {
    let (id, full, animated) = crate::emojis::cached_emoji_entry(http, name).await?;
    Some(serenity::ReactionType::Custom {
        animated,
        id: serenity::EmojiId::new(id),
        name: Some(full),
    })
}

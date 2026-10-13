use super::NEWSLETTER_TOGGLE_PREFIX;
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
// The changelog-PDF attach leg mirrors @updates.ts `getPdfPath` +
// fallback: guild lang `fr*` -> fr else en
// (`changelogs/<lang>/<version>/CHANGELOG_<LANG>_<version>.pdf`),
// attached as `CHANGELOG_<version>.pdf`; skipped when neither file
// exists, exactly like the TS `pdfExists` branch. Base dir is the
// TS-equivalent cwd when it holds `changelogs/`, else the checkout
// root derived from `CARGO_MANIFEST_DIR` (the service runs with cwd
// `rust/`, where a bare relative path would miss).
// The 10-minute button-disable collector is skipped: component
// routing here is stateless, the toggle stays live like the other
// persistent buttons.
// Changelog display. Mirrors MessageCommands/bot/@updates.ts:
// "Get the latest iHorizon updates and changelog!".
/// Show the latest iHorizon updates and changelog.
#[poise::command(
    prefix_command,
    category = "utils",
    rename = "updates",
    description_localized(
        "fr",
        "Obtenez les dernières mises à jour et le changelog d'iHorizon !"
    ),
    description_localized("ja", "iHorizonの最新アップデートとチェンジログを取得！"),
    description_localized("ru", "Получить последние обновления и список изменений iHorizon!"),
    description_localized(
        "es-ES",
        "Obtén las últimas actualizaciones y el changelog de iHorizon!"
    ),
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
        crate::db::tbl_get(pool, &gid, crate::commands::shared::BOT_NAME_KEY)
            .await
            .as_deref(),
    );
    let mut icon_bytes = crate::commands::shared::footer_icon_bytes(
        crate::db::tbl_get(pool, &gid, crate::commands::shared::BOT_PFP_KEY)
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

    // Newsletter row for everyone: subscribed (absent from the
    // table-first metas `newsletter_bl` map) -> Danger/Unsubscribe,
    // else Primary/Subscribe.
    let author = ctx.author().id.get().to_string();
    let unsubscribed =
        crate::commands::notifier::notifier::newsletter_unsubscribed(pool, &author).await;
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
    if let Some((pdf_bytes, pdf_name)) = changelog_pdf_bytes(&code, version).await {
        reply = reply.attachment(serenity::CreateAttachment::bytes(pdf_bytes, pdf_name));
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

/// `(dir_lang, file_name)` candidates for the changelog-PDF attach
/// leg. Mirrors @updates.ts: guild lang `fr*` -> fr else en, with the
/// other language as fallback.
fn changelog_pdf_candidates(guild_lang: &str, version: &str) -> [(String, String); 2] {
    let first = if guild_lang.starts_with("fr") {
        "fr"
    } else {
        "en"
    };
    let second = if first == "fr" { "en" } else { "fr" };
    [first, second].map(|lang| {
        (
            lang.to_string(),
            format!("CHANGELOG_{}_{}.pdf", lang.to_uppercase(), version),
        )
    })
}

/// Read the first existing changelog PDF, attached as
/// `CHANGELOG_<version>.pdf`. `None` when neither language file
/// exists (TS `pdfExists` false branch: embed without attachment).
async fn changelog_pdf_bytes(guild_lang: &str, version: &str) -> Option<(Vec<u8>, String)> {
    let cwd = std::env::current_dir().unwrap_or_default();
    let mut bases = Vec::new();
    if cwd.join("changelogs").is_dir() {
        bases.push(cwd);
    }
    if let Some(root) = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|p| p.to_path_buf())
    {
        if !bases.iter().any(|b| b == &root) {
            bases.push(root);
        }
    }
    for (lang, file) in changelog_pdf_candidates(guild_lang, version) {
        for base in &bases {
            let path = base
                .join("changelogs")
                .join(&lang)
                .join(version)
                .join(&file);
            if let Ok(bytes) = tokio::fs::read(&path).await {
                return Some((bytes, format!("CHANGELOG_{version}.pdf")));
            }
        }
    }
    None
}

#[cfg(test)]
mod updates_pdf_tests {
    use super::*;

    #[test]
    fn pdf_target_localizes_by_guild_lang() {
        assert_eq!(
            changelog_pdf_candidates("fr-FR", "2026.10.1")[0],
            ("fr".to_string(), "CHANGELOG_FR_2026.10.1.pdf".to_string())
        );
        assert_eq!(
            changelog_pdf_candidates("en-US", "2026.10.1")[0],
            ("en".to_string(), "CHANGELOG_EN_2026.10.1.pdf".to_string())
        );
        assert_eq!(
            changelog_pdf_candidates("ru-RU", "2026.10.1")[0].0,
            "en".to_string()
        );
    }

    #[test]
    fn pdf_fallback_is_the_other_language() {
        assert_eq!(
            changelog_pdf_candidates("fr-FR", "2026.10.1")[1].0,
            "en".to_string()
        );
        assert_eq!(
            changelog_pdf_candidates("en-US", "2026.10.1")[1].0,
            "fr".to_string()
        );
    }
}

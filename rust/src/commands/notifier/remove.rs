use super::*;

/// Remove Streamer/Youtuber/Twitcher
#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove",
    aliases("author-remove"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_remove(
    ctx: Ctx<'_>,
    #[description_localized("fr", "La plateforme du Streamer/Youtuber/Twitcher")]
    #[description_localized("ja", "ストリーマー/YouTuber/Twitcherのプラットフォーム")]
    #[description_localized("ru", "Платформа стримера/YouTube/Twitch")]
    #[description_localized("es-ES", "La plataforma del Streamer/Youtuber/Twitcher")]
    #[description = "The Streamer/Youtuber/Twitcher platform"]
    platform: super::NotifierPlatform,
    #[description_localized("fr", "L'identifiant du Streamer/Youtuber/Twitcher")]
    #[description_localized("ja", "ストリーマー/YouTuber/TwitcherのID")]
    #[description_localized("ru", "ID стримера/YouTube/Twitch")]
    #[description_localized("es-ES", "El ID del Streamer/Youtuber/Twitcher")]
    #[description = "The Streamer/Youtuber/Twitcher ID"]
    author: String,
) -> Result<(), anyhow::Error> {
    let platform = platform.as_str().to_string();
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the ManageGuild leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::MANAGE_GUILD,
    )
    .await
    {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // `author` compared verbatim (no trim: TS `===` on the raw
    // option value).
    let entries = load_entries(&ctx.data().pool, &gid).await;
    // Platform-scoped lookup (TS authorExist + remove filter match
    // platform AND id_or_username with `===` on both).
    if !entry_exists(&entries, &platform, &author) {
        ctx.say(say(
            "notifier_author_add_author_doesnt_exist",
            "Author doesn't exist. Please verify the ID.",
        ))
        .await?;
        return Ok(());
    }
    let kept: Vec<NotifierEntry> = entries
        .into_iter()
        .filter(|e| !(e.platform == platform && e.id_or_username == author))
        .collect();
    save_entries(&ctx.data().pool, &gid, &kept).await?;
    let (authors, config) = authors_and_config_embeds(&ctx.data().pool, &gid, &code).await;
    ctx.send(poise::CreateReply::default().embed(authors).embed(config))
        .await?;
    Ok(())
}

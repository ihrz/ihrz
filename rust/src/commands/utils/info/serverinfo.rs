use super::*;

/// Get information about the server!
// Mirrors utils serverinfo.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "serverinfo",
    aliases("si", "gi"),
    description_localized("fr", "Obtenir des informations sur le serveur"),
    description_localized("ja", "サーバーの情報を取得！"),
    description_localized("ru", "Получить информацию о сервере!"),
    description_localized("es-ES", "Obtener información sobre el servidor!")
)]
pub async fn serverinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let cached = {
        let Some(guild) = ctx.serenity_context().cache.guild(guild_id) else {
            return Ok(());
        };
        guild.clone()
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let f = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    // Verification level label. Mirrors the verlvl map in !serverinfo.ts:50
    // (note the historical HIGHT / VERY_HIGHT key spellings).
    let verlvl = match cached.verification_level {
        poise::serenity_prelude::VerificationLevel::None => f("serverinfo_verlvl_NONE", "NONE"),
        poise::serenity_prelude::VerificationLevel::Low => f("serverinfo_verlvl_LOW", "LOW"),
        poise::serenity_prelude::VerificationLevel::Medium => {
            f("serverinfo_verlvl_MEDIUM", "MEDIUM")
        }
        poise::serenity_prelude::VerificationLevel::High => {
            f("serverinfo_verlvl_HIGHT", "(╯°□°）╯︵ ┻━┻")
        }
        poise::serenity_prelude::VerificationLevel::Higher => {
            f("serverinfo_verlvl_VERY_HIGHT", "(ノಠ益ಠ)ノ彡┻━┻ ")
        }
        _ => f("serverinfo_verlvl_NONE", "NONE"),
    };
    let author_name = f("serverinfo_embed_author", "🚩 -> ${interaction.guild.name}")
        .replace("${interaction.guild.name}", &cached.name);
    let mut author = poise::serenity_prelude::CreateEmbedAuthor::new(author_name);
    // Author icon mirrors `iconURL()` in !serverinfo.ts.
    if let Some(icon) = cached.icon_url() {
        author = author.icon_url(icon);
    }
    let description = f(
        "serverinfo_embed_description",
        "**Description**: ${interaction.guild.description}",
    )
    .replace(
        "${interaction.guild.description}",
        // Mirrors `interaction.guild.description || "None"` in !serverinfo.ts.
        cached.description.as_deref().unwrap_or("None"),
    );
    // joinedAt/createdAt mirror the TS `` `${date}` `` interpolation of
    // JS Dates (Date.toString): rendered in fixed GMT here
    // (`Mon Oct 13 2026 09:30:00 GMT+0000`-style), same instants.
    let joined_at = ctx
        .author_member()
        .await
        .and_then(|m| m.joined_at)
        .map(|t| js_date_string(t.unix_timestamp()))
        .unwrap_or_else(|| "None".to_string());
    // Every TS field value is backtick-wrapped (`value` in !serverinfo.ts)
    // EXCEPT the owner mention: prod renders it parsed (`<@id>`, no
    // backticks), so the mention resolves instead of showing as code.
    let tick = |v: String| format!("`{v}`");
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xC3B2A1)
        .author(author)
        .description(description)
        .field(
            f("serverinfo_embed_fields_name", "🏷・**Name:**"),
            tick(cached.name.clone()),
            true,
        )
        .field(
            f("serverinfo_embed_fields_members", "🧔・**Members:**"),
            tick(cached.member_count.to_string()),
            true,
        )
        .field(
            f("serverinfo_embed_fields_id", "🆔・**ID:**"),
            tick(guild_id.get().to_string()),
            true,
        )
        .field(
            f("serverinfo_embed_fields_owner", "👑・**Owner:**"),
            format!("<@{}>", cached.owner_id.get()),
            true,
        )
        .field(
            f(
                "serverinfo_embed_fields_verlvl",
                "🎚 ・**Verification Level:**",
            ),
            tick(verlvl),
            true,
        )
        .field(
            f("serverinfo_embed_fields_region", "🌍・**Region:**"),
            tick(cached.preferred_locale.clone()),
            true,
        )
        .field(
            f("serverinfo_embed_fields_roles", "📇・**Role(s) number:**"),
            tick(cached.roles.len().to_string()),
            true,
        )
        .field(
            f(
                "serverinfo_embed_fields_channels",
                "✍・**Channel(s) number:**",
            ),
            tick(cached.channels.len().to_string()),
            true,
        )
        .field(
            f("serverinfo_embed_fields_joinat", "🚲・**Joined at:**"),
            tick(joined_at),
            true,
        )
        .field(
            f("serverinfo_embed_fields_createat", "⚓・**Created at:**"),
            tick(js_date_string(guild_id.created_at().unix_timestamp())),
            true,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    // Thumbnail mirrors `setThumbnail(guild.iconURL())`.
    if let Some(icon) = cached.icon_url() {
        embed = embed.thumbnail(icon);
    }
    // Banner image mirrors the TS `icons/{guildId}/{banner}.png` URL
    // verbatim — always set, even with no banner (TS interpolates null as
    // `null.png`), including the icons-path quirk.
    let banner_hash = cached
        .banner
        .as_ref()
        .map(|h| h.to_string())
        .unwrap_or_else(|| "null".to_string());
    embed = embed.image(format!(
        "https://cdn.discordapp.com/icons/{}/{}.png",
        guild_id.get(),
        banner_hash
    ));
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// JS `Date.toString()` rendering in fixed GMT
/// (`Mon Oct 13 2026 09:30:00 GMT+0000`-style). Mirrors the `` `${date}` ``
/// interpolation of joinedAt/createdAt in !serverinfo.ts:116-123; same
/// instants, timezone pinned to GMT+0000 instead of the host locale.
pub fn js_date_string(unix_secs: i64) -> String {
    let dt = chrono::DateTime::from_timestamp(unix_secs, 0)
        .map(|d| d.naive_utc())
        .unwrap_or_default();
    format!("{} GMT+0000", dt.format("%a %b %d %Y %H:%M:%S"))
}

#[cfg(test)]
mod tests {
    use super::js_date_string;

    #[test]
    fn js_date_renders_fixed_gmt_like_date_tostring() {
        // 2026-10-13 09:30:00 UTC is a Tuesday.
        assert_eq!(
            js_date_string(1791883800),
            "Tue Oct 13 2026 09:30:00 GMT+0000"
        );
    }
}

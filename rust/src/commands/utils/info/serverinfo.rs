use super::*;

/// Server info. Mirrors utils serverinfo.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "serverinfo",
    aliases("si", "gi")
)]
pub async fn serverinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let cached = {
        let Some(guild) = ctx.serenity_context().cache.guild(guild_id) else {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_guild_not_cached")
                    .unwrap_or_else(|| "Guild not cached.".to_string()),
            )
            .await?;
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
    let joined_at = ctx
        .author_member()
        .await
        .and_then(|m| m.joined_at)
        .map(|t| t.to_string())
        .unwrap_or_else(|| "None".to_string());
    // Every TS field value is backtick-wrapped (`value` in !serverinfo.ts);
    // the owner mention keeps its backticks too (`<@ownerId>`).
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
            tick(format!("<@{}>", cached.owner_id.get())),
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
            tick(guild_id.created_at().to_string()),
            true,
        )
        .field(
            f("var_boosts", "Boosts"),
            tick(cached.premium_subscription_count.unwrap_or(0).to_string()),
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
    // (verbatim, including the icons path quirk); skipped when the
    // guild has no banner so no dangling image is sent.
    if let Some(banner) = cached.banner.as_ref() {
        embed = embed.image(format!(
            "https://cdn.discordapp.com/icons/{}/{}.png",
            guild_id.get(),
            banner
        ));
    }
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

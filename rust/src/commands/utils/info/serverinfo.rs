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
    let author = f("serverinfo_embed_author", "🚩 -> ${interaction.guild.name}")
        .replace("${interaction.guild.name}", &cached.name);
    let description = f(
        "serverinfo_embed_description",
        "**Description**: ${interaction.guild.description}",
    )
    .replace(
        "${interaction.guild.description}",
        cached
            .description
            .as_deref()
            .unwrap_or("**Description**: ${interaction.guild.description}"),
    );
    let joined_at = ctx
        .author_member()
        .await
        .and_then(|m| m.joined_at)
        .map(|t| t.to_string())
        .unwrap_or_else(|| "None".to_string());
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(poise::serenity_prelude::CreateEmbedAuthor::new(author))
        .description(description)
        .field(
            f("serverinfo_embed_fields_name", "🏷・**Name:**"),
            cached.name,
            true,
        )
        .field(
            f("serverinfo_embed_fields_members", "🧔・**Members:**"),
            cached.member_count.to_string(),
            true,
        )
        .field(
            f("serverinfo_embed_fields_id", "🆔・**ID:**"),
            guild_id.get().to_string(),
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
            verlvl,
            true,
        )
        .field(
            f("serverinfo_embed_fields_region", "🌍・**Region:**"),
            cached.preferred_locale.clone(),
            true,
        )
        .field(
            f("serverinfo_embed_fields_roles", "📇・**Role(s) number:**"),
            cached.roles.len().to_string(),
            true,
        )
        .field(
            f(
                "serverinfo_embed_fields_channels",
                "✍・**Channel(s) number:**",
            ),
            cached.channels.len().to_string(),
            true,
        )
        .field(
            f("serverinfo_embed_fields_joinat", "🚲・**Joined at:**"),
            joined_at,
            true,
        )
        .field(
            f("serverinfo_embed_fields_createat", "⚓・**Created at:**"),
            guild_id.created_at().to_string(),
            true,
        )
        .field(
            f("var_boosts", "Boosts"),
            cached.premium_subscription_count.unwrap_or(0).to_string(),
            true,
        );
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

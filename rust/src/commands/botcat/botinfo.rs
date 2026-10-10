use super::*;

/// Library version shown in the `Libraries` field. Mirrors the
/// `discord.js@${djs}` value in botinfo.ts (keep in sync with
/// the `serenity` version in rust/Cargo.toml).
pub const SERENITY_VERSION: &str = "0.12";

/// Code-block value like ```` ```py\n{n}``` ```` in botinfo.ts.
fn py_block(n: impl std::fmt::Display) -> String {
    format!("```py\n{n}```")
}

/// Users counted for one cached guild. Mirrors the `availableGuilds`
/// filter + reduce in botinfo.ts: unavailable guilds and guilds with no
/// member-count data contribute 0, otherwise `memberCount ||
/// approximateMemberCount` (NaN has no Rust equivalent).
pub fn guild_users(member_count: u64, approximate: Option<u64>, unavailable: bool) -> u64 {
    if unavailable {
        return 0;
    }
    if member_count > 0 {
        member_count
    } else {
        approximate.unwrap_or(0)
    }
}

/// Bot info. Mirrors src/Interaction/HybridCommands/bot/botinfo.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "botinfo",
    aliases("bi")
)]
pub async fn botinfo_full(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let cache = ctx.cache();
    let me = cache.current_user().name.clone();
    let guilds = cache.guild_count();
    let channels = cache.guild_channel_count();
    // TS sums `memberCount || approximateMemberCount` per available
    // guild over all shards; here we sum the cached guilds the same way.
    let mut users: u64 = 0;
    for gid in cache.guilds() {
        if let Some(g) = cache.guild(gid) {
            users = users.saturating_add(guild_users(
                g.member_count,
                g.approximate_member_count,
                g.unavailable,
            ));
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed = serenity::CreateEmbed::default()
        .colour(0xF0D020)
        .thumbnail("attachment://footer_icon.png")
        .field(
            t("botinfo_embed_fields_myname", "My Name:"),
            format!("```{me}```"),
            false,
        )
        .field(
            t("botinfo_embed_fields_mychannels", "My Channels:"),
            py_block(channels),
            false,
        )
        .field(
            t("botinfo_embed_fields_myservers", "My Servers:"),
            py_block(guilds),
            false,
        )
        .field(
            t("botinfo_embed_fields_members", "Members:"),
            py_block(users),
            false,
        )
        .field(
            t("botinfo_embed_fields_libraires", "Libraries:"),
            format!("```py\nserenity@{SERENITY_VERSION}```"),
            false,
        )
        .field(
            t("botinfo_embed_fields_created_at", "Created at:"),
            "<t:1600042320:R>",
            false,
        )
        .field(
            t("botinfo_embed_fields_created_by", "Created by:"),
            "<@171356978310938624>",
            false,
        )
        // TS botinfo.ts calls .setTimestamp() on the info embed.
        .timestamp(serenity::Timestamp::now());
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_mirror_ts_available_filter_and_fallback() {
        assert_eq!(guild_users(10, Some(99), false), 10);
        assert_eq!(guild_users(0, Some(99), false), 99);
        assert_eq!(guild_users(0, None, false), 0);
        assert_eq!(guild_users(10, Some(99), true), 0);
        assert_eq!(guild_users(0, Some(99), true), 0);
    }
}

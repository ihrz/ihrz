use super::*;

/// Library version shown in the `Libraries` field. Mirrors the
/// `discord.js@${djs}` value in botinfo.ts (keep in sync with
/// the `serenity` version in rust/Cargo.toml).
pub const SERENITY_VERSION: &str = "0.12";

/// Code-block value like ```` ```py\n{n}``` ```` in botinfo.ts.
fn py_block(n: impl std::fmt::Display) -> String {
    format!("```py\n{n}```")
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
    // TS sums `memberCount || approximateMemberCount` per guild over
    // all shards; here we sum the cached guild member counts.
    let mut users: u64 = 0;
    for gid in cache.guilds() {
        if let Some(g) = cache.guild(gid) {
            users += g.member_count;
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let embed = serenity::CreateEmbed::default()
        .colour(0xF0D020)
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
        );
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

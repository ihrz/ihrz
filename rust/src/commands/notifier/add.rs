use super::*;

// N1 (groups): TS notifier.ts nests add/remove/list under an `author`
// SubcommandGroup and channel/message under a `config` SubcommandGroup.
// Poise supports only one subcommand level, so the port stays flat
// (notifier add/remove/list/channel/message). No behavior change.
// N2 (kick): TS offers only youtube/twitch choices — authorExistOnPlatform
// throws "Unsupported platform" for anything else, fetchUsersMedias and
// the authors-embed link switch handle only youtube/twitch. Kick therefore
// has no verify/feed path, so it is rejected here (dropped, not verified).

/// Platforms with a TS verification + feed path. Mirrors the
/// youtube/twitch choices in notifier.ts (kick dropped: see N2 above).
pub fn platform_supported(p: &str) -> bool {
    super::valid_platform(p) && !p.eq_ignore_ascii_case("kick")
}

/// Add Streamer/Youtuber/Twitcher
#[poise::command(
    slash_command,
    prefix_command,
    rename = "add",
    aliases("author-add"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_add(
    ctx: Ctx<'_>,
    #[description = "twitch or youtube"] platform: String,
    #[description = "Author id or username"] author: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    if !platform_supported(&platform) {
        ctx.say(say(
            "msg_bad_platform_twitch_youtube_kick",
            "Bad platform (twitch, youtube).",
        ))
        .await?;
        return Ok(());
    }
    // Platform + author stored verbatim (TS pushes
    // `{ id_or_username: author, platform }` untouched).
    // Live platform check (TS authorExistOnPlatform in !add.ts). Like
    // the TS client, missing creds read as "doesn't exist".
    if !crate::scheduler::author_exists_on_platform(&platform, &author).await {
        ctx.say(say(
            "notifier_author_add_author_doesnt_exist",
            "Author doesn't exist. Please verify the ID.",
        ))
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut entries = load_entries(&ctx.data().pool, &gid).await;
    entries.push(NotifierEntry {
        id_or_username: author,
        platform,
    });
    // Exact dedup, mirroring the TS JSON-stringify uniqueness filter in
    // !add.ts (`JSON.stringify(t) === JSON.stringify(value)`): the
    // (platform, author) pair compares verbatim, no lowercase fold
    // (same as the shared `dedup_entries` helper in mod.rs).
    {
        let mut seen = std::collections::HashSet::new();
        entries.retain(|e| seen.insert((e.platform.clone(), e.id_or_username.clone())));
    }
    save_entries(&ctx.data().pool, &gid, &entries).await?;
    let (authors, config) = authors_and_config_embeds(&ctx.data().pool, &gid, &code).await;
    ctx.send(poise::CreateReply::default().embed(authors).embed(config))
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn platforms_mirror_ts_choices() {
        assert!(platform_supported("twitch"));
        assert!(platform_supported("YouTube"));
        // N2: kick has no TS verify/feed path, so it is dropped.
        assert!(!platform_supported("kick"));
        assert!(!platform_supported("nope"));
    }
}

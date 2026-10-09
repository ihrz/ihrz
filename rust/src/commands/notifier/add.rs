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

#[poise::command(
    slash_command,
    prefix_command,
    rename = "add",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_add(
    ctx: Ctx<'_>,
    #[description = "twitch or youtube"] platform: String,
    #[description = "Author id or username"] author: String,
) -> Result<(), anyhow::Error> {
    if !platform_supported(&platform) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_bad_platform_twitch_youtube_kick")
                .unwrap_or_else(|| "Bad platform (twitch, youtube, kick).".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut entries = load_entries(&ctx.data().pool, &gid).await;
    let entry = NotifierEntry {
        id_or_username: author.trim().to_string(),
        platform: platform.to_ascii_lowercase(),
    };
    if !entries.contains(&entry) {
        entries.push(entry);
        save_entries(&ctx.data().pool, &gid, &entries).await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_notifier_entry_added")
            .unwrap_or_else(|| "Notifier entry added.".to_string()),
    )
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

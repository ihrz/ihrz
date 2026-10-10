use super::*;
use poise::serenity_prelude as serenity;

/// XP channel load with legacy key fallback (`GUILD.XP_LEVELING.xpchannels`,
/// legacy `GUILD.RANKS.channel` single / `GUILD.RANKS.xpChannels` list).
/// A legacy list contributes its first entry; a legacy hit promotes the
/// single id into the new key so rows migrate lazily.
pub async fn load_xp_channel_routed(pool: &crate::db::Pool, guild_id: &str) -> Option<String> {
    let raw = super::migrated_get(
        pool,
        guild_id,
        super::GUILD_XPCHANNEL_NEW,
        &[
            super::GUILD_XPCHANNEL_OLD_SINGLE,
            super::GUILD_XPCHANNEL_OLD_LIST,
        ],
    )
    .await?;
    if let Ok(list) = serde_json::from_str::<Vec<String>>(&raw) {
        return list.into_iter().next();
    }
    let id = crate::commands::owner::main::decode_stored_string(&raw);
    if id.is_empty() {
        return None;
    }
    Some(id)
}

/// XP channel store: single id on the new key (TS shape) plus the legacy
/// single key and a single-entry legacy list, so old readers stay fresh.
pub async fn save_xp_channel_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    channel_id: &str,
) -> anyhow::Result<()> {
    super::migrated_set(
        pool,
        guild_id,
        super::GUILD_XPCHANNEL_NEW,
        &[super::GUILD_XPCHANNEL_OLD_SINGLE],
        channel_id,
    )
    .await?;
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        super::GUILD_XPCHANNEL_OLD_LIST,
        &serde_json::to_string(&[channel_id])?,
    )
    .await
}

/// XP channel clear across the new key and every legacy key.
pub async fn clear_xp_channel_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
) -> anyhow::Result<bool> {
    super::migrated_del(
        pool,
        guild_id,
        super::GUILD_XPCHANNEL_NEW,
        &[
            super::GUILD_XPCHANNEL_OLD_SINGLE,
            super::GUILD_XPCHANNEL_OLD_LIST,
        ],
    )
    .await
}

/// Shared `on`/`off` runner. Mirrors `ranks/!channel.ts:50-146`:
/// the slash path requires an explicit channel (`getChannel("channel")`
/// null hits `setxpchannels_valid_channel_message`), while the prefix
/// path falls back to the current channel (`|| interaction.channel`).
/// `on` posts the confirmation message INTO the set channel (`:89-92`)
/// and replies in place; `off` deletes the row. Same-row /
/// already-unset calls hit the `already_*` guards instead of writing.
async fn run_channel_action(
    ctx: Ctx<'_>,
    action: Option<String>,
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let author_id = ctx.author().id.get().to_string();
    // Mirrors `ranks/!channel.ts:60-146`: only an explicit `on`/`off`
    // acts. The slash `action` option is `required: true`, so a
    // missing action only happens on prefix — and TS leaves a bare
    // call (no `type`) silent, with no default-on.
    let Some(action) = action else {
        return Ok(());
    };
    let act = action.trim().to_lowercase();
    match act.as_str() {
        // `on`: announce channel set. The slash
        // path requires the explicit option (TS `getChannel("channel")`
        // null errors); only the prefix path falls back to the current
        // channel (`|| interaction.channel` in `!channel.ts`).
        "on" => {
            let explicit = channel.as_ref().map(|c| c.id.get().to_string());
            let target = match explicit {
                Some(id) => id,
                None if matches!(ctx, poise::Context::Prefix(_)) => {
                    ctx.channel_id().get().to_string()
                }
                None => {
                    ctx.say(say(
                        "setxpchannels_valid_channel_message",
                        "Please provide a valid channel.",
                    ))
                    .await?;
                    return Ok(());
                }
            };
            let title = say(
                "setxpchannels_logs_embed_title_enable",
                "XP Channel Logs (enable)",
            );
            let desc = say(
                "setxpchannels_logs_embed_description_enable",
                "XP channel set by <@user> to <#chan>.",
            )
            .replace("${interaction.user.id}", &author_id)
            .replace("${argsid}", &target);
            crate::commands::economy::post_ihorizon_log(&ctx, &title, &desc).await;
            if load_xp_channel_routed(&ctx.data().pool, &gid)
                .await
                .as_deref()
                == Some(&target)
            {
                ctx.say(say(
                    "setxpchannels_already_with_this_config",
                    "This channel is already the XP channel.",
                ))
                .await?;
                return Ok(());
            }
            // Confirmation goes INTO the set channel, like TS `:89-92`;
            // a send failure surfaces the error leg, nothing is stored.
            let confirm = say(
                "setxpchannels_confirmation_message",
                "This channel is now the XP announce channel.",
            );
            if let Ok(id) = target.parse::<u64>() {
                if serenity::ChannelId::new(id)
                    .say(ctx.http(), &confirm)
                    .await
                    .is_err()
                {
                    ctx.say(say(
                        "setxpchannels_command_error_enable",
                        "Could not set the XP channel.",
                    ))
                    .await?;
                    return Ok(());
                }
            }
            save_xp_channel_routed(&ctx.data().pool, &gid, &target).await?;
            ctx.say(
                say(
                    "setxpchannels_command_work_enable",
                    "You have successfully set the custom XP channel to <#id>.",
                )
                .replace("${argsid}", &target),
            )
            .await?;
        }
        "off" => {
            let title = say(
                "setxpchannels_logs_embed_title_disable",
                "XP Channel Logs (disable)",
            );
            let desc = say(
                "setxpchannels_logs_embed_description_disable",
                "XP channel disabled by <@user>.",
            )
            .replace("${interaction.user.id}", &author_id);
            crate::commands::economy::post_ihorizon_log(&ctx, &title, &desc).await;
            // Mirrors `!channel.ts:122-131`: the already-disabled leg fires
            // only when the stored value is literally `"off"`. TS never
            // writes `"off"` (the branch deletes the row), so a missing row
            // falls through to delete + success reply — NOT the
            // already-disabled message.
            if load_xp_channel_routed(&ctx.data().pool, &gid)
                .await
                .as_deref()
                == Some("off")
            {
                ctx.say(say(
                    "setxpchannels_already_disabled_disable",
                    "The XP channel is already disabled.",
                ))
                .await?;
                return Ok(());
            }
            if clear_xp_channel_routed(&ctx.data().pool, &gid)
                .await
                .is_err()
            {
                ctx.say(say(
                    "setxpchannels_command_error_disable",
                    "Could not disable the XP channel.",
                ))
                .await?;
                return Ok(());
            }
            ctx.say(say(
                "setxpchannels_command_work_disable",
                "You have successfully disabled the custom XP channel!",
            ))
            .await?;
        }
        // Mirrors `ranks/!channel.ts:60-146`: only `on`/`off` do anything.
        // Any other input falls through every branch and returns silently.
        _ => {
            return Ok(());
        }
    }
    Ok(())
}

/// XP announce channel (set/clear).
// Mirrors `ranks/!channel.ts` (`channel` with prefixName
// `ranks-channel`, aliases `rchannel`): setting overwrites, `off`
// clears. There is no `xp-channels` command in TS.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    aliases("rchannel", "ranks-channel"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_channel(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: Option<String>,
    #[description = "Channel (required on slash; current channel on prefix)"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    run_channel_action(ctx, action, channel).await
}

#[cfg(test)]
mod tests {
    use super::{clear_xp_channel_routed, load_xp_channel_routed, save_xp_channel_routed};

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn legacy_single_reads_and_promotes() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.channel", "42")
            .await
            .unwrap();
        assert_eq!(
            load_xp_channel_routed(&pool, "g").await.as_deref(),
            Some("42")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.XP_LEVELING.xpchannels")
                .await
                .as_deref(),
            Some("42")
        );
        assert_eq!(load_xp_channel_routed(&pool, "g9").await, None);
    }

    #[tokio::test]
    async fn legacy_list_contributes_first_entry() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.xpChannels", r#"["7","8"]"#)
            .await
            .unwrap();
        assert_eq!(
            load_xp_channel_routed(&pool, "g").await.as_deref(),
            Some("7")
        );
    }

    #[tokio::test]
    async fn new_key_wins_over_legacy() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.channel", "42")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GUILD.XP_LEVELING.xpchannels", "99")
            .await
            .unwrap();
        assert_eq!(
            load_xp_channel_routed(&pool, "g").await.as_deref(),
            Some("99")
        );
    }

    #[tokio::test]
    async fn save_and_clear_cover_all_keys() {
        let pool = mem_pool().await;
        save_xp_channel_routed(&pool, "g", "42").await.unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.XP_LEVELING.xpchannels")
                .await
                .as_deref(),
            Some("42")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RANKS.channel")
                .await
                .as_deref(),
            Some("42")
        );
        assert!(clear_xp_channel_routed(&pool, "g").await.unwrap());
        assert_eq!(load_xp_channel_routed(&pool, "g").await, None);
        assert!(!clear_xp_channel_routed(&pool, "g").await.unwrap());
    }
}

use super::*;

// Snipe read. Mirrors utils !snipe.ts: the snapshot lives at
// `GUILD.SNIPE.<channel>` as `{snipe, snipeUserInfoTag, snipeUserInfoPp,
// snipeTimestamp}` and renders as a #474749 embed (author tag + avatar,
// description, creation timestamp). Read path only; the writer leg lives
// in `events_handler.rs`.
//
// Key-reunification note (E7): the early Rust port wrote/parsed its own
// `SNIPE.<channel>` `{author, content}` shape plus a
// `SNIPE.last_deleted_id` marker, which misses rows the TS writer owns.
// Interop wins, so the TS key is read first and the legacy shapes stay
// as fallbacks (the writer migration in `events_handler.rs` has landed:
// fresh deletes dual-write the TS shape at `GUILD.SNIPE.<channel>` and
// the legacy row, so the fallbacks below only serve pre-migration rows).
/// Show the last deleted message in this channel.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "snipe",
    aliases("s", "snp")
)]
pub async fn snipe(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let ch_id = match &channel {
        Some(c) => c.id.get(),
        None => match ctx.guild_channel().await {
            Some(c) => c.id.get(),
            None => {
                let code =
                    crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
                ctx.say(
                    crate::lang::get(&code, "msg_no_channel")
                        .unwrap_or_else(|| "No channel.".to_string()),
                )
                .await?;
                return Ok(());
            }
        },
    };
    let pool = &ctx.data().pool;
    // TS key first (interop), legacy Rust shapes as fallbacks.
    if let Some(raw) =
        crate::commands::owner::main::routed_get(pool, &gid, &gid, &format!("GUILD.SNIPE.{ch_id}"))
            .await
            .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
            .and_then(|v| parse_ts_snipe(&v))
    {
        ctx.send(poise::CreateReply::default().embed(render_snipe_embed(&raw)))
            .await?;
        return Ok(());
    }
    if let Some((author, content)) =
        crate::commands::owner::main::routed_get(pool, &gid, &gid, &format!("SNIPE.{ch_id}"))
            .await
            .and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok())
            .and_then(|v| parse_legacy_snipe(&v))
    {
        ctx.say(format!("{author}: {content}")).await?;
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors `!snipe.ts` (`if (!based || !message_content)`): with no
    // snapshot the reply is the TS fallback key — no invented text
    // (the legacy `last_deleted_id` marker never had a TS reader).
    ctx.say(
        crate::lang::get(&code, "snipe_no_previous_message_deleted")
            .unwrap_or_else(|| "No messages have been deleted in this channel!".to_string()),
    )
    .await?;
    Ok(())
}

/// TS snapshot at `GUILD.SNIPE.<channel>`. Mirrors snipeModule.ts field
/// names exactly (`snipe`, `snipeUserInfoTag`, `snipeUserInfoPp`,
/// `snipeTimestamp`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TsSnipeSnapshot {
    pub content: String,
    pub author_tag: String,
    pub avatar_url: String,
    pub timestamp_ms: i64,
}

/// Parse the TS snapshot shape. Pure, unit-tested below.
pub fn parse_ts_snipe(v: &serde_json::Value) -> Option<TsSnipeSnapshot> {
    Some(TsSnipeSnapshot {
        content: v.get("snipe")?.as_str()?.to_string(),
        author_tag: v.get("snipeUserInfoTag")?.as_str()?.to_string(),
        avatar_url: v.get("snipeUserInfoPp")?.as_str()?.to_string(),
        timestamp_ms: v.get("snipeTimestamp")?.as_i64()?,
    })
}

/// Parse the legacy Rust shape at `SNIPE.<channel>`
/// (`{author, content}`). Pure, unit-tested below.
pub fn parse_legacy_snipe(v: &serde_json::Value) -> Option<(String, String)> {
    Some((
        v.get("author")?.as_str()?.to_string(),
        v.get("content")?.as_str()?.to_string(),
    ))
}

/// Render the TS snipe embed: #474749, author tag + avatar, description,
/// creation timestamp. Mirrors !snipe.ts exactly.
pub fn render_snipe_embed(snap: &TsSnipeSnapshot) -> poise::serenity_prelude::CreateEmbed {
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0x474749)
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(snap.author_tag.clone())
                .icon_url(snap.avatar_url.clone()),
        )
        .description(snap.content.clone());
    if snap.timestamp_ms > 0 {
        if let Ok(ts) =
            poise::serenity_prelude::Timestamp::from_unix_timestamp(snap.timestamp_ms / 1000)
        {
            embed = embed.timestamp(ts);
        }
    }
    embed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ts_shape_parses_exact_ts_keys() {
        let v = serde_json::json!({
            "snipe": "hello [world](http://x)",
            "snipeUserInfoTag": "bob (123)",
            "snipeUserInfoPp": "https://cdn/avatar.png",
            "snipeTimestamp": 1728500000000_i64,
        });
        let snap = parse_ts_snipe(&v).expect("TS shape must parse");
        assert_eq!(snap.content, "hello [world](http://x)");
        assert_eq!(snap.author_tag, "bob (123)");
        assert_eq!(snap.timestamp_ms, 1728500000000);
        // Legacy `{author, content}` shape must NOT parse as TS.
        assert!(parse_ts_snipe(&serde_json::json!({"author": "b", "content": "hi"})).is_none());
    }

    #[test]
    fn legacy_shape_parses_and_ts_rejects_it() {
        let v = serde_json::json!({"author": "bob", "content": "hi"});
        assert_eq!(
            parse_legacy_snipe(&v).expect("legacy shape must parse"),
            ("bob".to_string(), "hi".to_string())
        );
        assert!(parse_legacy_snipe(&serde_json::json!({"snipe": "hi"})).is_none(),);
    }
}

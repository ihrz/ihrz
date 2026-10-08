// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/bot/* + utils/* (sample).

use crate::bot::Ctx;

/// Bot info. Mirrors the TS botinfo/about command shape.
#[poise::command(slash_command, prefix_command, category = "utils")]
pub async fn botinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say(format!(
        "iHorizon Rust v{} (serenity + poise)",
        env!("CARGO_PKG_VERSION")
    ))
    .await?;
    Ok(())
}

/// Move one member between voice channels. Mirrors utils move.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "move")]
pub async fn voicemove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "To channel"]
    #[channel_types("Voice")]
    to: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    match guild_id.move_member(ctx.http(), user.id, to.id).await {
        Ok(_) => ctx.say("Moved.").await?,
        Err(_) => ctx.say("Move failed (member not in voice?).").await?,
    };
    Ok(())
}

/// Server-mute a member + freeze list.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "freeze")]
pub async fn voicefreeze(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.VOICE_FREEZE").await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = user.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::db::kv_set(
            &ctx.data().pool,
            &gid,
            "UTILS.VOICE_FREEZE",
            &serde_json::to_string(&list)?,
        )
        .await?;
    }
    let mut member = guild_id.member(ctx.http(), user.id).await?;
    member
        .edit(
            ctx.http(),
            poise::serenity_prelude::EditMember::new().mute(true),
        )
        .await?;
    ctx.say("Frozen.").await?;
    Ok(())
}

/// Server-unmute a member + unfreeze. Mirrors utils unfreeze.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "unfreeze")]
pub async fn voiceunfreeze(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.VOICE_FREEZE").await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    list.retain(|x| x != &user.id.get().to_string());
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.VOICE_FREEZE",
        &serde_json::to_string(&list)?,
    )
    .await?;
    let mut member = guild_id.member(ctx.http(), user.id).await?;
    member
        .edit(
            ctx.http(),
            poise::serenity_prelude::EditMember::new().mute(false),
        )
        .await?;
    ctx.say("Unfrozen.").await?;
    Ok(())
}

/// Hide a channel from @everyone. Mirrors chanel !hide.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "hide")]
pub async fn chan_hide(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let ch_id = match &channel {
        Some(c) => c.id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    ch_id
        .create_permission(
            ctx.http(),
            poise::serenity_prelude::PermissionOverwrite {
                allow: poise::serenity_prelude::Permissions::empty(),
                deny: poise::serenity_prelude::Permissions::VIEW_CHANNEL,
                kind: poise::serenity_prelude::PermissionOverwriteType::Role(
                    poise::serenity_prelude::RoleId::new(guild_id.get()),
                ),
            },
        )
        .await?;
    ctx.say("Channel hidden.").await?;
    Ok(())
}

/// Unhide a channel. Mirrors chanel !unhide.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "unhide")]
pub async fn chan_unhide(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let ch_id = match &channel {
        Some(c) => c.id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    ch_id
        .delete_permission(
            ctx.http(),
            poise::serenity_prelude::PermissionOverwriteType::Role(
                poise::serenity_prelude::RoleId::new(guild_id.get()),
            ),
        )
        .await?;
    ctx.say("Channel unhidden.").await?;
    Ok(())
}

/// Unban everyone, storing the list for undo. Mirrors unbanall !all.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unban-all"
)]
pub async fn unban_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let bans = guild_id
        .bans(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    if bans.is_empty() {
        ctx.say("No banned members.").await?;
        return Ok(());
    }
    let mut unbanned = vec![];
    for ban in &bans {
        if guild_id.unban(ctx.http(), ban.user.id).await.is_ok() {
            unbanned.push(ban.user.id.get().to_string());
        }
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.unban_members",
        &serde_json::to_string(&unbanned)?,
    )
    .await?;
    ctx.say(format!("Unbanned {}.", unbanned.len())).await?;
    Ok(())
}

/// Re-ban the members unbanned by unban-all. Mirrors unbanall !undo.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unban-undo"
)]
pub async fn unban_undo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.unban_members").await;
    let list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let mut n = 0;
    for id in list {
        if let Ok(uid) = id.parse::<u64>() {
            if guild_id
                .ban(ctx.http(), poise::serenity_prelude::UserId::new(uid), 0)
                .await
                .is_ok()
            {
                n += 1;
            }
        }
    }
    ctx.say(format!("Re-banned {n}.")).await?;
    Ok(())
}

/// Whitelist roles for protected commands. Mirrors !wlroles.ts (flattened).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles-add"
)]
pub async fn wlroles_add(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.wlRoles").await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = role.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::db::kv_set(
            &ctx.data().pool,
            &gid,
            "UTILS.wlRoles",
            &serde_json::to_string(&list)?,
        )
        .await?;
    }
    ctx.say("Whitelist role added.").await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles-list"
)]
pub async fn wlroles_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.wlRoles").await;
    let list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    ctx.say(if list.is_empty() {
        "No whitelist roles.".to_string()
    } else {
        list.join(", ")
    })
    .await?;
    Ok(())
}

/// Media-only channel toggle. Mirrors !media-only.ts (flattened to a toggle).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "media-only"
)]
pub async fn media_only(
    ctx: Ctx<'_>,
    #[description = "Channel"] channel: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.picOnly").await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = channel.id.get().to_string();
    let msg = if let Some(pos) = list.iter().position(|c| c == &id) {
        list.remove(pos);
        "Media-only off."
    } else {
        list.push(id);
        "Media-only on."
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.picOnly",
        &serde_json::to_string(&list)?,
    )
    .await?;
    ctx.say(msg).await?;
    Ok(())
}

/// Nickname kicker config. Mirrors util !nick-kicker.ts
/// (UTILS.NICK_KICKER {enabled, words[]}).
pub fn nick_matches(words: &[String], username: &str, display: Option<&str>) -> bool {
    let username = username.to_ascii_lowercase();
    let display = display.map(|d| d.to_ascii_lowercase());
    words.iter().any(|w| {
        let w = w.to_ascii_lowercase();
        username.contains(&w) || display.as_ref().map(|d| d.contains(&w)).unwrap_or(false)
    })
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "nick-kicker"
)]
pub async fn nickkicker(
    ctx: Ctx<'_>,
    #[description = "Word to ban (omit to list)"] word: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.NICK_KICKER").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({"enabled": true, "words": []}));
    match word.map(|w| w.trim().to_string()).filter(|w| !w.is_empty()) {
        Some(w) => {
            if let Some(words) = cfg.get_mut("words").and_then(|x| x.as_array_mut()) {
                words.push(serde_json::Value::String(w));
            }
            crate::db::kv_set(
                &ctx.data().pool,
                &gid,
                "UTILS.NICK_KICKER",
                &cfg.to_string(),
            )
            .await?;
            ctx.say("Word added.").await?;
        }
        None => {
            let words: Vec<String> = cfg
                .get("words")
                .and_then(|x| serde_json::from_value(x.clone()).ok())
                .unwrap_or_default();
            ctx.say(if words.is_empty() {
                "No banned words.".to_string()
            } else {
                words.join(", ")
            })
            .await?;
        }
    }
    Ok(())
}

/// Slowmode. Mirrors util cooldown (!cooldown.ts) + unslowmode bridge.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "slowmode",
    aliases("unslowmode")
)]
pub async fn slowmode(
    ctx: Ctx<'_>,
    #[description = "Seconds (0-21600)"] seconds: Option<i64>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let secs = seconds.unwrap_or(0).clamp(0, 21600) as u16;
    let ch_id = match &channel {
        Some(c) => c.id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    ch_id
        .edit(
            ctx.http(),
            poise::serenity_prelude::EditChannel::new().rate_limit_per_user(secs),
        )
        .await?;
    ctx.say(format!("Slowmode {secs}s.")).await?;
    Ok(())
}

/// Steal a stock sticker by id. Mirrors sticker.ts (PNG best-effort).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "sticker")]
pub async fn sticker(
    ctx: Ctx<'_>,
    #[description = "Sticker id"] sticker_id: String,
    #[description = "Name"] name: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let id: u64 = sticker_id.trim().parse().unwrap_or(0);
    if id == 0 {
        ctx.say("Bad sticker id.").await?;
        return Ok(());
    }
    let bytes = match reqwest::Client::new()
        .get(format!("https://cdn.discordapp.com/stickers/{id}.png"))
        .send()
        .await
    {
        Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
        Err(_) => vec![],
    };
    if bytes.is_empty() {
        ctx.say("Fetch failed.").await?;
        return Ok(());
    }
    let name = name.unwrap_or_else(|| format!("sticker{id}"));
    match guild_id
        .create_sticker(
            ctx.http(),
            poise::serenity_prelude::CreateSticker::new(
                &name,
                poise::serenity_prelude::CreateAttachment::bytes(bytes, "sticker.png"),
            ),
        )
        .await
    {
        Ok(_) => ctx.say("Sticker added.").await?,
        Err(_) => ctx.say("Upload failed.").await?,
    };
    Ok(())
}

/// GitHub blob link unfurl. Mirrors githubLinesManager.ts:
/// https://github.com/o/r/blob/br/file#Lx[-Ly] -> raw snippet embed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GithubRef {
    pub owner: String,
    pub repo: String,
    pub branch: String,
    pub path: String,
    pub start: u32,
    pub end: u32,
}

pub fn parse_github_link(url: &str) -> Option<GithubRef> {
    let rest = url.strip_prefix("https://github.com/")?;
    let (repo_part, frag) = rest.split_once('#')?;
    let frag = frag.strip_prefix('L')?;
    let (start_s, end_s) = match frag.split_once("-L") {
        Some((a, b)) => (a, Some(b)),
        None => (frag, None),
    };
    let start: u32 = start_s.parse().ok()?;
    let end: u32 = end_s.map(|e| e.parse().ok()).unwrap_or(Some(start))?;
    let mut segs = repo_part.splitn(5, '/');
    let (owner, repo, blob, branch, path) = (
        segs.next()?,
        segs.next()?,
        segs.next()?,
        segs.next()?,
        segs.next()?,
    );
    if blob != "blob" || owner.is_empty() || repo.is_empty() || path.is_empty() {
        return None;
    }
    Some(GithubRef {
        owner: owner.to_string(),
        repo: repo.to_string(),
        branch: branch.to_string(),
        path: path.to_string(),
        start,
        end: end.max(start),
    })
}

pub fn raw_url(r: &GithubRef) -> String {
    format!(
        "https://raw.githubusercontent.com/{}/{}/{}/{}",
        r.owner, r.repo, r.branch, r.path
    )
}

/// Extract lines [start, end] (1-based, clamped).
pub fn snippet_lines(body: &str, start: u32, end: u32) -> String {
    let lines: Vec<&str> = body.lines().collect();
    if lines.is_empty() || start == 0 {
        return String::new();
    }
    let end = end.min(lines.len() as u32);
    if start > end {
        return String::new();
    }
    lines[(start - 1) as usize..end as usize].join("\n")
}

pub async fn fetch_snippet(r: &GithubRef) -> Option<String> {
    let body = reqwest::Client::new()
        .get(raw_url(r))
        .send()
        .await
        .ok()?
        .text()
        .await
        .ok()?;
    if body.len() > 200_000 {
        return None;
    }
    let snippet = snippet_lines(&body, r.start, r.end.min(r.start + 20));
    if snippet.is_empty() {
        return None;
    }
    Some(format!("```\n{snippet}\n```"))
}

/// Auto-renew a channel on a timer.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "autorenew"
)]
pub async fn autorenew(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text", "Voice")]
    channel: poise::serenity_prelude::GuildChannel,
    #[description = "Every (e.g. 1h, 7d) or off"] every: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = format!("UTILS.renew_channel.{}", channel.id.get());
    if every.trim().eq_ignore_ascii_case("off") {
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(&gid)
            .bind(&key)
            .execute(&ctx.data().pool)
            .await;
        ctx.say("Auto-renew off.").await?;
        return Ok(());
    }
    let Some(ms) = crate::commands::schedule::parse_duration_ms(&every) else {
        ctx.say("Bad duration.").await?;
        return Ok(());
    };
    let now = crate::commands::schedule::now_ms();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &key,
        &serde_json::json!({"timestamp": now, "maxTime": ms}).to_string(),
    )
    .await?;
    ctx.say("Auto-renew set.").await?;
    Ok(())
}

/// Remove all roles from a member. Mirrors !derank.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "derank")]
pub async fn derank(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let member = guild_id.member(ctx.http(), user.id).await?;
    let roles: Vec<poise::serenity_prelude::RoleId> = member.roles.to_vec();
    let mut n = 0;
    for role in roles {
        if member.remove_role(ctx.http(), role).await.is_ok() {
            n += 1;
        }
    }
    let _ = member;
    ctx.say(format!("Removed {n} roles from {}.", user.tag()))
        .await?;
    Ok(())
}

/// Add/remove a role for every member. Mirrors !massiverole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "massiverole"
)]
pub async fn massiverole(
    ctx: Ctx<'_>,
    #[description = "add or remove"] action: String,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let add = !matches!(
        action.to_ascii_lowercase().as_str(),
        "remove" | "del" | "off"
    );
    let members = guild_id
        .members(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let mut n = 0;
    for m in &members {
        if let Ok(full) = guild_id.member(ctx.http(), m.user.id).await {
            let ok = if add {
                full.add_role(ctx.http(), role.id).await.is_ok()
            } else {
                full.remove_role(ctx.http(), role.id).await.is_ok()
            };
            if ok {
                n += 1;
            }
        }
    }
    ctx.say(format!("Done for {n} members.")).await?;
    Ok(())
}

/// Move a member to your voice channel. Mirrors !wakeup.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "wakeup")]
pub async fn wakeup(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let target = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let Some(target) = target else {
        ctx.say("Join a voice channel first.").await?;
        return Ok(());
    };
    match guild_id.move_member(ctx.http(), user.id, target).await {
        Ok(_) => ctx.say("Moved.").await?,
        Err(_) => ctx.say("Move failed.").await?,
    };
    Ok(())
}

/// Derogation store (moderation exemptions). Mirrors !derogation.ts
/// (GUILD.UTILS.DEROGATION[] of user ids).
pub fn derogation_key() -> &'static str {
    "GUILD.UTILS.DEROGATION"
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "derogation"
)]
pub async fn derogation(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, derogation_key()).await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    match user {
        Some(u) => {
            let id = u.id.get().to_string();
            if !list.contains(&id) {
                list.push(id);
                crate::db::kv_set(
                    &ctx.data().pool,
                    &gid,
                    derogation_key(),
                    &serde_json::to_string(&list)?,
                )
                .await?;
            }
            ctx.say("Derogation added.").await?;
        }
        None => {
            ctx.say(if list.is_empty() {
                "No derogations.".to_string()
            } else {
                list.join(", ")
            })
            .await?;
        }
    }
    Ok(())
}

/// Voice channel member list. Mirrors !vc.ts (short mode).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "vc")]
pub async fn vc_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let lines: Vec<String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            let mut chans: Vec<(String, usize)> = vec![];
            for (id, ch) in g.channels.iter() {
                let n = g
                    .voice_states
                    .values()
                    .filter(|v| v.channel_id == Some(*id))
                    .count();
                if n > 0 {
                    chans.push((ch.name.clone(), n));
                }
            }
            chans.sort();
            chans.iter().map(|(n, c)| format!("{n}: {c}")).collect()
        })
        .unwrap_or_default();
    ctx.say(if lines.is_empty() {
        "Nobody in voice.".to_string()
    } else {
        lines.join("\n")
    })
    .await?;
    Ok(())
}

/// Bring everyone to your voice channel. Mirrors !bringall.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "bringall")]
pub async fn bringall(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let target = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let Some(target) = target else {
        ctx.say("Join a voice channel first.").await?;
        return Ok(());
    };
    let members: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id.is_some() && v.channel_id != Some(target))
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    let mut n = 0;
    for uid in members {
        if guild_id.move_member(ctx.http(), uid, target).await.is_ok() {
            n += 1;
        }
    }
    ctx.say(format!("Brought {n}.")).await?;
    Ok(())
}

/// Voice mute/unmute helpers. Mirrors talk/untalk (!talk.ts family).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "talk")]
pub async fn talk(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    voice_mute_flag(&ctx, user, false).await
}

#[poise::command(slash_command, prefix_command, category = "utils", rename = "untalk")]
pub async fn untalk(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    voice_mute_flag(&ctx, user, true).await
}

async fn voice_mute_flag(
    ctx: &Ctx<'_>,
    user: poise::serenity_prelude::User,
    mute: bool,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let mut member = guild_id.member(ctx.http(), user.id).await?;
    member
        .edit(
            ctx.http(),
            poise::serenity_prelude::EditMember::new().mute(mute),
        )
        .await?;
    ctx.say(if mute { "Muted." } else { "Unmuted." }).await?;
    Ok(())
}

/// List bots. Mirrors !allbots.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "allbots")]
pub async fn allbots(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let bots: Vec<String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| m.user.bot)
                .map(|m| m.user.tag())
                .collect()
        })
        .unwrap_or_default();
    ctx.say(if bots.is_empty() {
        "No bots.".to_string()
    } else {
        bots.join(", ")
    })
    .await?;
    Ok(())
}

/// List role members. Mirrors role-members.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "role-members"
)]
pub async fn role_members(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let members: Vec<String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| m.roles.contains(&role.id))
                .map(|m| m.user.tag())
                .collect()
        })
        .unwrap_or_default();
    ctx.say(if members.is_empty() {
        "Nobody has this role.".to_string()
    } else {
        members.join(", ")
    })
    .await?;
    Ok(())
}

/// Invite info. Mirrors !inviteinfo.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "inviteinfo"
)]
pub async fn inviteinfo(
    ctx: Ctx<'_>,
    #[description = "Invite code or URL"] invite: String,
) -> Result<(), anyhow::Error> {
    let code = invite
        .trim()
        .rsplit('/')
        .next()
        .unwrap_or_default()
        .to_string();
    match ctx.http().get_invite(&code, true, true, None).await {
        Ok(inv) => {
            ctx.say(format!(
                "Server: {} | Channel: {} | Members: {}",
                inv.guild
                    .as_ref()
                    .map(|g| g.name.clone())
                    .unwrap_or_else(|| "?".to_string()),
                inv.channel.name.clone(),
                inv.approximate_member_count.unwrap_or(0),
            ))
            .await?;
        }
        Err(_) => {
            ctx.say("Invalid invite.").await?;
        }
    }
    Ok(())
}

/// List webhooks. Mirrors !allwebhooks.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "allwebhooks"
)]
pub async fn allwebhooks(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let hooks = guild_id.webhooks(ctx.http()).await.unwrap_or_default();
    ctx.say(if hooks.is_empty() {
        "No webhooks.".to_string()
    } else {
        hooks
            .iter()
            .map(|w| {
                format!(
                    "{} ({})",
                    w.name.clone().unwrap_or_else(|| "?".to_string()),
                    w.id.get()
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

/// List admins. Mirrors admin-users/admin-roles (cache scan).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "admin-users"
)]
pub async fn admin_users(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let admins: Vec<String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| {
                    m.roles.iter().any(|r| {
                        g.roles
                            .get(r)
                            .map(|role| role.permissions.administrator())
                            .unwrap_or(false)
                    })
                })
                .map(|m| m.user.tag())
                .collect()
        })
        .unwrap_or_default();
    ctx.say(if admins.is_empty() {
        "No admins.".to_string()
    } else {
        admins.join(", ")
    })
    .await?;
    Ok(())
}

/// 67 meme. Mirrors fun !67.ts (FUN.states gated gif).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "67")]
pub async fn sixtyseven(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("https://www.ihorizon.org/assets/img/fun/67_command.gif")
        .await?;
    Ok(())
}

/// Nickname-role rule (GUILD.RANK_ROLES.nicknames).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "setmentionrole"
)]
pub async fn setmentionrole(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Role"] role: Option<poise::serenity_prelude::Role>,
    #[description = "Nickname part"] part: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    if action.trim().eq_ignore_ascii_case("off") {
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(&gid)
            .bind("GUILD.RANK_ROLES.nicknames")
            .execute(&ctx.data().pool)
            .await;
        ctx.say("Mention-role off.").await?;
        return Ok(());
    }
    let (Some(role), Some(part)) = (role, part) else {
        ctx.say("Give a role and a nickname part.").await?;
        return Ok(());
    };
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.RANK_ROLES.nicknames").await;
    let mut map: std::collections::HashMap<String, String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    map.insert(part.trim().to_string(), role.id.get().to_string());
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.RANK_ROLES.nicknames",
        &serde_json::to_string(&map)?,
    )
    .await?;
    ctx.say("Mention-role set.").await?;
    Ok(())
}

/// Recreate a channel now (clone + delete). Mirrors !renew.ts manual path.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "renew")]
pub async fn renew(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let ch = match channel {
        Some(c) => c,
        None => match ctx.guild_channel().await {
            Some(c) => c.clone(),
            None => return Ok(()),
        },
    };
    let mut builder = poise::serenity_prelude::CreateChannel::new(ch.name.clone()).kind(ch.kind);
    if let Some(parent) = ch.parent_id {
        builder = builder.category(parent);
    }
    let new_ch = guild_id.create_channel(ctx.http(), builder).await?;
    ch.id.delete(ctx.http()).await?;
    ctx.say(format!("Renewed as <#{}>.", new_ch.id.get()))
        .await?;
    Ok(())
}

/// Sync a category's overwrites to its children. Mirrors !sync.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "sync")]
pub async fn syncchan(
    ctx: Ctx<'_>,
    #[description = "Category"] category: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let Some(cat) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&category.id).cloned())
    else {
        return Ok(());
    };
    let overwrites = cat.permission_overwrites.clone();
    let children: Vec<poise::serenity_prelude::ChannelId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .filter(|c| c.parent_id == Some(category.id))
                .map(|c| c.id)
                .collect()
        })
        .unwrap_or_default();
    let mut n = 0;
    for child in children {
        let mut ok = true;
        for ow in &overwrites {
            if child
                .create_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwrite {
                        allow: ow.allow,
                        deny: ow.deny,
                        kind: ow.kind,
                    },
                )
                .await
                .is_err()
            {
                ok = false;
            }
        }
        if ok {
            n += 1;
        }
    }
    ctx.say(format!("Synced {n} channels.")).await?;
    Ok(())
}

/// Mass-assign a role by nickname match. Mirrors !nickrole.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "nickrole")]
pub async fn nickrole(
    ctx: Ctx<'_>,
    #[description = "add or remove"] action: String,
    #[description = "Nickname part"] nickname: String,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let add = !matches!(
        action.to_ascii_lowercase().as_str(),
        "remove" | "del" | "off"
    );
    let members = guild_id
        .members(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let part = nickname.to_ascii_lowercase();
    let mut n = 0;
    for m in &members {
        let nick = m.nick.clone().unwrap_or_default().to_ascii_lowercase();
        let name = m.user.name.to_ascii_lowercase();
        if nick.contains(&part) || name.contains(&part) {
            if let Ok(full) = guild_id.member(ctx.http(), m.user.id).await {
                let ok = if add {
                    full.add_role(ctx.http(), role.id).await.is_ok()
                } else {
                    full.remove_role(ctx.http(), role.id).await.is_ok()
                };
                if ok {
                    n += 1;
                }
            }
        }
    }
    ctx.say(format!("Done for {n} members.")).await?;
    Ok(())
}

/// Role member cap. Mirrors !rolelimit.ts (GUILD.UTILS.ROLE_LIMIT.<role>).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "rolelimit"
)]
pub async fn rolelimit(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
    #[description = "Max members (0 to clear)"] limit: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = format!("GUILD.UTILS.ROLE_LIMIT.{}", role.id.get());
    match limit.unwrap_or(0) {
        0 => {
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(&key)
                .execute(&ctx.data().pool)
                .await;
            ctx.say("Role limit cleared.").await?;
        }
        n => {
            crate::db::kv_set(&ctx.data().pool, &gid, &key, &n.max(1).to_string()).await?;
            ctx.say("Role limit set.").await?;
        }
    }
    Ok(())
}

/// Steal custom emojis from text. Mirrors !emojis.ts
/// (CDN fetch + guild upload).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "emojis")]
pub async fn emojis(
    ctx: Ctx<'_>,
    #[description = "Text containing <:name:id> emojis"] text: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let mut done = 0;
    for token in text.split_whitespace() {
        let (animated, name, id) = match parse_steal_token(token) {
            Some(v) => v,
            None => continue,
        };
        let ext = if animated { "gif" } else { "png" };
        let url = format!("https://cdn.discordapp.com/emojis/{id}.{ext}");
        let bytes = match reqwest::Client::new().get(&url).send().await {
            Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
            Err(_) => continue,
        };
        if bytes.is_empty() || bytes.len() > 256 * 1024 {
            continue;
        }
        let image = format!(
            "data:image/{ext};base64,{}",
            crate::emojis::base64_encode(&bytes)
        );
        if guild_id
            .create_emoji(ctx.http(), &name, &image)
            .await
            .is_ok()
        {
            done += 1;
        }
    }
    ctx.say(format!("Stole {done} emojis.")).await?;
    Ok(())
}

/// Parse `<:name:id>` / `<a:name:id>` into (animated, name, id).
pub fn parse_steal_token(token: &str) -> Option<(bool, String, String)> {
    let animated = token.starts_with("<a:");
    let inner = token
        .strip_prefix("<a:")
        .or_else(|| token.strip_prefix("<:"))?
        .strip_suffix('>')?;
    let mut parts = inner.split(':');
    let name = parts.next()?.to_string();
    let id = parts.next()?.to_string();
    if name.is_empty()
        || !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
        || id.is_empty()
        || !id.chars().all(|c| c.is_ascii_digit())
    {
        return None;
    }
    Some((animated, name, id))
}

/// Voice kick (disconnect). Mirrors !vkick.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "vkick")]
pub async fn vkick(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    match guild_id.disconnect_member(ctx.http(), user.id).await {
        Ok(_) => ctx.say("Voice kicked.").await?,
        Err(_) => ctx.say("Not in voice.").await?,
    };
    Ok(())
}

/// Download all guild emojis as a zip. Mirrors !zip-emojis.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "zip-emojis"
)]
pub async fn zip_emojis(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let emojis = guild_id.emojis(ctx.http()).await.unwrap_or_default();
    if emojis.is_empty() {
        ctx.say("No emojis.").await?;
        return Ok(());
    }
    let client = reqwest::Client::new();
    let mut buf = std::io::Cursor::new(Vec::<u8>::new());
    {
        let mut zip = zip::ZipWriter::new(&mut buf);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);
        for emoji in emojis.iter().take(50) {
            let ext = if emoji.animated { "gif" } else { "png" };
            let url = format!("https://cdn.discordapp.com/emojis/{}.{ext}", emoji.id.get());
            let bytes = match client.get(&url).send().await {
                Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
                Err(_) => continue,
            };
            if bytes.is_empty() || bytes.len() > 512 * 1024 {
                continue;
            }
            let name = sanitize_emoji_filename(&emoji.name, ext);
            if zip.start_file(name, options).is_err() {
                continue;
            }
            use std::io::Write;
            let _ = zip.write_all(&bytes);
        }
        let _ = zip.finish();
    }
    let data = buf.into_inner();
    ctx.channel_id()
        .send_message(
            ctx.http(),
            poise::serenity_prelude::CreateMessage::new().add_file(
                poise::serenity_prelude::CreateAttachment::bytes(data, "emojis.zip"),
            ),
        )
        .await?;
    Ok(())
}

/// Safe zip entry name. Mirrors the TS sanitize-then-upload flow.
pub fn sanitize_emoji_filename(name: &str, ext: &str) -> String {
    let clean: String = name
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .take(32)
        .collect();
    let clean = if clean.is_empty() {
        "emoji".to_string()
    } else {
        clean
    };
    format!("{clean}.{ext}")
}

/// Upload emojis from a zip attachment. Mirrors !unzip-emojis.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unzip-emojis"
)]
pub async fn unzip_emojis(
    ctx: Ctx<'_>,
    #[description = "Zip file"] attachment: poise::serenity_prelude::Attachment,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let bytes = match reqwest::Client::new().get(&attachment.url).send().await {
        Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
        Err(_) => {
            ctx.say("Download failed.").await?;
            return Ok(());
        }
    };
    let reader = std::io::Cursor::new(bytes);
    let mut archive = match zip::ZipArchive::new(reader) {
        Ok(a) => a,
        Err(_) => {
            ctx.say("Bad zip.").await?;
            return Ok(());
        }
    };
    let mut pending: Vec<(String, Vec<u8>)> = vec![];
    for i in 0..archive.len().min(20) {
        let mut file = match archive.by_index(i) {
            Ok(f) => f,
            Err(_) => continue,
        };
        let name = file.name().to_string();
        if !(name.ends_with(".png") || name.ends_with(".gif") || name.ends_with(".jpg")) {
            continue;
        }
        let mut data = vec![];
        use std::io::Read;
        if file.read_to_end(&mut data).is_err() || data.is_empty() || data.len() > 256 * 1024 {
            continue;
        }
        pending.push((name, data));
    }
    drop(archive);
    let mut done = 0;
    for (name, data) in pending {
        let stem = name.rsplit('/').next().unwrap_or(&name);
        let stem = stem.rsplit_once('.').map(|(s, _)| s).unwrap_or(stem);
        let ext = if name.ends_with(".gif") { "gif" } else { "png" };
        let image = format!(
            "data:image/{ext};base64,{}",
            crate::emojis::base64_encode(&data)
        );
        if guild_id
            .create_emoji(ctx.http(), stem, &image)
            .await
            .is_ok()
        {
            done += 1;
        }
    }
    ctx.say(format!("Uploaded {done} emojis.")).await?;
    Ok(())
}

/// Download all guild stickers as a zip. Mirrors !zip-stickers.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "zip-stickers"
)]
pub async fn zip_stickers(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let stickers = guild_id.stickers(ctx.http()).await.unwrap_or_default();
    if stickers.is_empty() {
        ctx.say("No stickers.").await?;
        return Ok(());
    }
    let client = reqwest::Client::new();
    let mut buf = std::io::Cursor::new(Vec::<u8>::new());
    {
        let mut zip = zip::ZipWriter::new(&mut buf);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);
        for sticker in stickers.iter().take(30) {
            // Sticker file via CDN is unreliable across formats; use the
            // preview url when present, else skip.
            let Some(url) = sticker_url(sticker) else {
                continue;
            };
            let bytes = match client.get(&url).send().await {
                Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
                Err(_) => continue,
            };
            if bytes.is_empty() || bytes.len() > 512 * 1024 {
                continue;
            }
            let name = sanitize_emoji_filename(&sticker.name, "png");
            if zip.start_file(name, options).is_err() {
                continue;
            }
            use std::io::Write;
            let _ = zip.write_all(&bytes);
        }
        let _ = zip.finish();
    }
    let data = buf.into_inner();
    ctx.channel_id()
        .send_message(
            ctx.http(),
            poise::serenity_prelude::CreateMessage::new().add_file(
                poise::serenity_prelude::CreateAttachment::bytes(data, "stickers.zip"),
            ),
        )
        .await?;
    Ok(())
}

/// Sticker CDN url best-effort (PNG preview).
pub fn sticker_url(sticker: &poise::serenity_prelude::Sticker) -> Option<String> {
    use poise::serenity_prelude::StickerFormatType;
    match sticker.format_type {
        StickerFormatType::Png | StickerFormatType::Apng => Some(format!(
            "https://cdn.discordapp.com/stickers/{}.png",
            sticker.id.get()
        )),
        _ => None,
    }
}

/// Renew your current voice channel now. Mirrors !renewvc.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "renewvc")]
pub async fn renewvc(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let target = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let Some(target) = target else {
        ctx.say("Join a voice channel first.").await?;
        return Ok(());
    };
    let Some(ch) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&target).cloned())
    else {
        return Ok(());
    };
    let mut builder = poise::serenity_prelude::CreateChannel::new(ch.name.clone()).kind(ch.kind);
    if let Some(parent) = ch.parent_id {
        builder = builder.category(parent);
    }
    let new_ch = guild_id.create_channel(ctx.http(), builder).await?;
    // Move occupants over, then delete the old channel.
    let occupants: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id == Some(target))
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    for uid in occupants {
        let _ = guild_id.move_member(ctx.http(), uid, new_ch.id).await;
    }
    let _ = target.delete(ctx.http()).await;
    ctx.say(format!("Renewed as <#{}>.", new_ch.id.get()))
        .await?;
    Ok(())
}

/// Voice freeze channel + allowed users.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "wlvc")]
pub async fn wlvc(
    ctx: Ctx<'_>,
    #[description = "Voice channel"]
    #[channel_types("Voice")]
    channel: poise::serenity_prelude::GuildChannel,
    #[description = "Allowed member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.VOICE_FREEZE").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    cfg["channelId"] = serde_json::Value::String(channel.id.get().to_string());
    if let Some(u) = user {
        let mut allowed: Vec<String> = cfg
            .get("allowedUsers")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default();
        let id = u.id.get().to_string();
        if !allowed.contains(&id) {
            allowed.push(id);
        }
        cfg["allowedUsers"] = serde_json::Value::from(allowed);
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.VOICE_FREEZE",
        &cfg.to_string(),
    )
    .await?;
    ctx.say("Voice freeze channel set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, category = "utils", rename = "unwlvc")]
pub async fn unwlvc(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind("UTILS.VOICE_FREEZE")
        .execute(&ctx.data().pool)
        .await;
    ctx.say("Voice freeze cleared.").await?;
    Ok(())
}

/// Hide/unhide every text channel. Mirrors chanel hideall/unhideall.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "hideall")]
pub async fn chan_hideall(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    hide_all_inner(&ctx, false).await
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unhideall"
)]
pub async fn chan_unhideall(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    hide_all_inner(&ctx, true).await
}

async fn hide_all_inner(ctx: &Ctx<'_>, unhide: bool) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let channels: Vec<poise::serenity_prelude::ChannelId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .filter(|c| c.kind == poise::serenity_prelude::ChannelType::Text)
                .map(|c| c.id)
                .collect()
        })
        .unwrap_or_default();
    let everyone = poise::serenity_prelude::RoleId::new(guild_id.get());
    for ch in channels {
        if unhide {
            let _ = ch
                .delete_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwriteType::Role(everyone),
                )
                .await;
        } else {
            let _ = ch
                .create_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwrite {
                        allow: poise::serenity_prelude::Permissions::empty(),
                        deny: poise::serenity_prelude::Permissions::VIEW_CHANNEL,
                        kind: poise::serenity_prelude::PermissionOverwriteType::Role(everyone),
                    },
                )
                .await;
        }
    }
    ctx.say(if unhide { "Unhid all." } else { "Hid all." })
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nick_kicker_matches() {
        let words = vec!["bad".to_string()];
        assert!(nick_matches(&words, "xBadx", None));
        assert!(nick_matches(&words, "ok", Some("myBADname")));
        assert!(!nick_matches(&words, "ok", Some("fine")));
        assert!(!nick_matches(&[], "bad", None));
    }

    #[test]
    fn github_link_parses() {
        let r = parse_github_link("https://github.com/o/r/blob/main/a/b.rs#L10-L20").unwrap();
        assert_eq!(r.owner, "o");
        assert_eq!(r.branch, "main");
        assert_eq!((r.start, r.end), (10, 20));
        assert_eq!(
            raw_url(&r),
            "https://raw.githubusercontent.com/o/r/main/a/b.rs"
        );
        assert_eq!(
            parse_github_link("https://github.com/o/r/blob/main/a.rs#L5")
                .unwrap()
                .end,
            5
        );
        assert!(parse_github_link("https://example.com/x#L1").is_none());
        assert_eq!(snippet_lines("a\nb\nc", 2, 3), "b\nc");
        assert_eq!(snippet_lines("a", 5, 9), "");
    }

    #[test]
    fn steal_tokens_parse() {
        assert_eq!(
            parse_steal_token("<:pepe:123>"),
            Some((false, "pepe".to_string(), "123".to_string()))
        );
        assert_eq!(parse_steal_token("<a:dance:456>").map(|v| v.0), Some(true));
        assert_eq!(parse_steal_token("hello"), None);
        assert_eq!(parse_steal_token("<:bad name:1>"), None);
    }

    #[test]
    fn emoji_filenames_sanitized() {
        assert_eq!(sanitize_emoji_filename("Pepe!", "png"), "Pepe.png");
        assert_eq!(sanitize_emoji_filename("", "gif"), "emoji.gif");
        assert_eq!(
            sanitize_emoji_filename("a".repeat(50).as_str(), "png").len(),
            36
        );
    }

    #[test]
    fn help_pages_cover_all() {
        let all = vec![
            ("b".to_string(), Some("x".to_string())),
            ("a".to_string(), None),
            ("c".to_string(), Some("y".to_string())),
        ];
        let p1 = help_page(&all, 1, 2);
        assert!(p1.contains("/a (?)"));
        assert!(p1.contains("/b (x)"));
        assert!(!p1.contains("/c"));
        assert_eq!(crate::executor::total_pages(all.len(), 2), 2);
    }
}

/// Help: dynamic command list grouped by category.
/// Mirrors bot help.ts (all-commands select menu, flattened to pages).
pub fn help_page(commands: &[(String, Option<String>)], page: usize, per_page: usize) -> String {
    let mut sorted = commands.to_vec();
    sorted.sort();
    let slice = crate::executor::paginate(&sorted, page, per_page);
    slice
        .iter()
        .map(|(name, cat)| {
            format!(
                "/{} ({})",
                name,
                cat.clone().unwrap_or_else(|| "?".to_string())
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Help command.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "help")]
pub async fn help_here(
    ctx: Ctx<'_>,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let all: Vec<(String, Option<String>)> = crate::commands::all()
        .iter()
        .map(|c| (c.name.clone(), c.category.clone()))
        .collect();
    let total = crate::executor::total_pages(all.len(), 20);
    let page = page.unwrap_or(1).clamp(1, total.max(1) as i64) as usize;
    let body = help_page(&all, page, 20);
    ctx.say(format!("Commands (p{page}/{total}):\n{body}"))
        .await?;
    Ok(())
}

/// Avatar. Mirrors utils avatar (attachment-free embed with URL).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "avatar")]
pub async fn avatar(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let url = u.face();
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(format!("{}'s avatar", u.tag()))
        .image(url);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// User info. Mirrors utils userinfo (embed, no html2png).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "userinfo")]
pub async fn userinfo(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let created = u.created_at().unix_timestamp();
    let face_url = u.face();
    let face_bytes = crate::commands::botcat::download_bytes(&face_url).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(u.tag())
        .field("ID", u.id.get().to_string(), true)
        .field("Bot", u.bot.to_string(), true)
        .field("Created", format!("<t:{created}:F>"), false);
    let embed = if face_bytes.is_some() {
        embed.thumbnail("attachment://avatar.png")
    } else {
        embed.thumbnail(face_url)
    };
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "avatar.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Server info. Mirrors utils serverinfo.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "serverinfo"
)]
pub async fn serverinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let (name, id, members, channels, roles, boosts) = {
        let Some(guild) = ctx.serenity_context().cache.guild(guild_id) else {
            ctx.say("Guild not cached.").await?;
            return Ok(());
        };
        (
            guild.name.clone(),
            guild.id.get().to_string(),
            guild.member_count.to_string(),
            guild.channels.len().to_string(),
            guild.roles.len().to_string(),
            guild.premium_subscription_count.unwrap_or(0).to_string(),
        )
    };
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(name)
        .field("ID", id, true)
        .field("Members", members, true)
        .field("Channels", channels, true)
        .field("Roles", roles, true)
        .field("Boosts", boosts, true);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Previous names. Mirrors utils !prevnames.ts (tracked in user_update).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "prevnames"
)]
pub async fn prevnames(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let raw = crate::db::kv_get(&ctx.data().pool, "0", &crate::events::prevnames_key(uid)).await;
    let history: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    ctx.say(if history.is_empty() {
        "No previous names.".to_string()
    } else {
        history.join(", ")
    })
    .await?;
    Ok(())
}

/// Member voice location. Mirrors utils where (voice states).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "where")]
pub async fn whereis(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let loc = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&user.id)
            .and_then(|v| v.channel_id)
            .map(|c| format!("<#{c}>"))
    });
    ctx.say(match loc {
        Some(c) => format!("{} is in {c}.", user.tag()),
        None => format!("{} is not in voice.", user.tag()),
    })
    .await?;
    Ok(())
}

/// Server icon. Mirrors utils serverpic.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "serverpic"
)]
pub async fn serverpic(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let url = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.icon_url());
    match url {
        Some(u) => {
            let embed = poise::serenity_prelude::CreateEmbed::default().image(u);
            ctx.send(poise::CreateReply::default().embed(embed)).await?;
        }
        None => {
            ctx.say("No server icon.").await?;
        }
    }
    Ok(())
}

/// Snipe read. Mirrors utils !snipe.ts (marker stored by events_handler).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "snipe")]
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
                ctx.say("No channel.").await?;
                return Ok(());
            }
        },
    };
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &format!("SNIPE.{ch_id}")).await;
    if let Some(v) = raw.and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok()) {
        let author = v.get("author").and_then(|a| a.as_str()).unwrap_or("?");
        let content = v.get("content").and_then(|c| c.as_str()).unwrap_or("");
        ctx.say(format!("{author}: {content}")).await?;
        return Ok(());
    }
    let last = crate::db::kv_get(&ctx.data().pool, &gid, "SNIPE.last_deleted_id").await;
    ctx.say(match last {
        Some(id) => format!("Last deleted message id: {id}"),
        None => "Nothing to snipe.".to_string(),
    })
    .await?;
    Ok(())
}

/// Add role. Mirrors utils !addrole.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "addrole")]
pub async fn addrole(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let member = guild_id.member(ctx.http(), user.id).await?;
    member.add_role(ctx.http(), role.id).await?;
    ctx.say(format!("{} got {}.", user.tag(), role.name))
        .await?;
    Ok(())
}

/// Remove role. Mirrors utils !delrole.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "delrole")]
pub async fn delrole(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let member = guild_id.member(ctx.http(), user.id).await?;
    member.remove_role(ctx.http(), role.id).await?;
    ctx.say(format!("{} lost {}.", user.tag(), role.name))
        .await?;
    Ok(())
}

/// Post an embed from title + description.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "embed-post"
)]
pub async fn embed_post(
    ctx: Ctx<'_>,
    #[description = "Title"] title: String,
    #[description = "Description"] description: String,
) -> Result<(), anyhow::Error> {
    let mut draft = crate::embed_builder::EmbedDraft::default();
    draft
        .set_title(&title)
        .map_err(|_| anyhow::anyhow!("title too long"))?;
    draft
        .set_description(&description)
        .map_err(|_| anyhow::anyhow!("description too long"))?;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(draft.title.clone())
        .description(draft.description.clone());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Mass-move voice members. Mirrors utils !massmove.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "massmove")]
pub async fn massmove(
    ctx: Ctx<'_>,
    #[description = "From channel"]
    #[channel_types("Voice")]
    from: poise::serenity_prelude::GuildChannel,
    #[description = "To channel"]
    #[channel_types("Voice")]
    to: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let members: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id == Some(from.id))
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    let mut moved = 0;
    for uid in members {
        if guild_id.move_member(ctx.http(), uid, to.id).await.is_ok() {
            moved += 1;
        }
    }
    ctx.say(format!("Moved {moved} members.")).await?;
    Ok(())
}

/// DM a member. Mirrors utils !dm.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "dm")]
pub async fn dm(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Message"] message: String,
) -> Result<(), anyhow::Error> {
    match user
        .direct_message(
            ctx.http(),
            poise::serenity_prelude::CreateMessage::new().content(&message),
        )
        .await
    {
        Ok(_) => ctx.say("DM sent.").await?,
        Err(_) => ctx.say("Could not DM (closed DMs?).").await?,
    };
    Ok(())
}

pub fn leash_key(follower_id: u64) -> String {
    format!("UTILS.LEASH.{follower_id}")
}

/// Leash a follower to a target. Mirrors utils !leash.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "leash")]
pub async fn leash(
    ctx: Ctx<'_>,
    #[description = "Target to follow"] target: poise::serenity_prelude::User,
    #[description = "Follower"] follower: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    // Confirm when the target is not in voice or the invoker is.
    // Mirrors the isInVoiceChannel-gated promptYesOrNo in !leash.ts
    // (danger=false, abort -> util_leash_canceled_leash).
    let in_voice = |user_id: poise::serenity_prelude::UserId| {
        ctx.guild_id()
            .and_then(|g| ctx.cache().guild(g))
            .and_then(|g| g.voice_states.get(&user_id).and_then(|v| v.channel_id))
            .is_some()
    };
    if !in_voice(target.id) || in_voice(ctx.author().id) {
        let content =
            crate::commands::lang_for(&ctx, "util_leash_confirm_message", "Leash anyway?").await;
        let yes = crate::commands::lang_for(&ctx, "var_yes", "Yes").await;
        let no = crate::commands::lang_for(&ctx, "var_no", "No").await;
        if !crate::commands::prompt_yes_or_no(&ctx, content, yes, no, false).await? {
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "util_leash_canceled_leash",
                    "Leash configurations canceled.",
                )
                .await,
            )
            .await?;
            return Ok(());
        }
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &leash_key(follower.id.get()),
        &target.id.get().to_string(),
    )
    .await?;
    ctx.say(format!("{} now follows {}.", follower.tag(), target.tag()))
        .await?;
    Ok(())
}

/// Remove a leash. Mirrors utils !unleash.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "unleash")]
pub async fn unleash(
    ctx: Ctx<'_>,
    #[description = "Follower"] follower: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(leash_key(follower.id.get()))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Leash removed.").await?;
    Ok(())
}

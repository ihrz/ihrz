// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/bot/* + utils/* (sample).

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

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
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "move",
    aliases("déplacer", "deplacer", "switch")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    match guild_id.move_member(ctx.http(), user.id, to.id).await {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "util_move_command_ok")
                    .map(|s| {
                        s.replace("${member?.toString()}", &format!("<@{}>", user.id.get()))
                            .replace("${channel.toString()}", &format!("<#{}>", to.id.get()))
                    })
                    .unwrap_or_else(|| "Moved.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "util_move_not_in_vc")
                    .unwrap_or_else(|| "Move failed (member not in voice?).".to_string()),
            )
            .await?
        }
    };
    Ok(())
}

/// Server-mute a member + freeze list.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "freeze",
    aliases("voicefreeze", "vcfreeze")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(crate::lang::get(&code, "msg_frozen").unwrap_or_else(|| "Frozen.".to_string()))
        .await?;
    Ok(())
}

/// Server-unmute a member + unfreeze. Mirrors utils unfreeze.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unfreeze",
    aliases("defreeze")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "util_unfreeze_command_work")
            .unwrap_or_else(|| "Unfrozen.".to_string()),
    )
    .await?;
    Ok(())
}

/// Hide a channel from @everyone. Mirrors chanel !hide.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "hide",
    aliases("masquer")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "channel_hide_success")
            .unwrap_or_else(|| "Channel hidden.".to_string()),
    )
    .await?;
    Ok(())
}

/// Unhide a channel. Mirrors chanel !unhide.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unhide",
    aliases("démasquer", "demasquer")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "channel_unhide_success")
            .unwrap_or_else(|| "Channel unhidden.".to_string()),
    )
    .await?;
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
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    if bans.is_empty() {
        ctx.say(
            crate::lang::get(&code, "action_unban_all_no_banned_members")
                .unwrap_or_else(|| "No banned members.".to_string()),
        )
        .await?;
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

// ---- vanity-generator ----
// Mirrors utils !vanity-generator.ts: code validation, local VANITY
// claim scan, permanent invite creation, gateway CreateCustomVanity
// registration. The local api table is read-only seed data in TS (no
// writer exists), mirrored as kv guild "0" key "api.VANITY".

/// Mirrors method.isValidDiscordInviteCode (`/^[a-z0-9]+(-[a-z0-9]+)*$/i`,
/// max 32 chars; ASCII-only either way).
pub fn is_valid_vanity_code(code: &str) -> bool {
    if code.is_empty() || code.len() > 32 {
        return false;
    }
    for segment in code.split('-') {
        if segment.is_empty() {
            return false;
        }
        if !segment.bytes().all(|b| b.is_ascii_alphanumeric()) {
            return false;
        }
    }
    true
}

/// Mirrors VanityCodeAlreadyExist (any table entry whose vanity equals
/// the code; missing/non-object table means no claim).
pub fn vanity_already_claimed(table: Option<&serde_json::Value>, code: &str) -> bool {
    let Some(map) = table.and_then(|v| v.as_object()) else {
        return false;
    };
    map.values()
        .any(|entry| entry.get("vanity").and_then(|v| v.as_str()) == Some(code))
}

/// Mirrors the invalid-code template fill (TS String.replace: first
/// occurrence of `${VanityCode}`).
pub fn vanity_invalid_text(template: &str, code: &str) -> String {
    template.replacen("${VanityCode}", code, 1)
}

/// Claim a custom vanity URL for this guild.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "vanity-generator",
    aliases("vanity", "vanity-gen", "customvanity"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn vanity_generator(
    ctx: Ctx<'_>,
    #[description = "Vanity code"] code: Option<String>,
) -> Result<(), anyhow::Error> {
    let code = code.unwrap_or_default();
    let invalid_tpl = crate::commands::lang_for(
        &ctx,
        "util_vanity_generator_invalid_code",
        "The URL Vanity code `${VanityCode}` is invalid.",
    )
    .await;
    let claimed = crate::commands::lang_for(
        &ctx,
        "util_vanity_generator_already_claimed",
        "The URL Vanity code is already taken! Choose another one.",
    )
    .await;
    let cmd_err = crate::commands::lang_for(
        &ctx,
        "util_vanity_generator_command_err",
        "An error has occurred while creating the vanity code. Please try again later.",
    )
    .await;
    if !is_valid_vanity_code(&code) {
        ctx.say(vanity_invalid_text(&invalid_tpl, &code)).await?;
        return Ok(());
    }
    let raw = crate::db::kv_get(&ctx.data().pool, "0", "api.VANITY").await;
    let table: Option<serde_json::Value> = raw.and_then(|s| serde_json::from_str(&s).ok());
    if vanity_already_claimed(table.as_ref(), &code) {
        ctx.say(claimed).await?;
        return Ok(());
    }
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let invite = match ctx
        .channel_id()
        .create_invite(
            ctx.http(),
            poise::serenity_prelude::CreateInvite::new()
                .max_age(0)
                .temporary(false),
        )
        .await
    {
        Ok(invite) => invite,
        Err(_) => {
            ctx.say(cmd_err).await?;
            return Ok(());
        }
    };
    // Deltas vs TS: no audit-log reason (ChannelId helper has no reason
    // slot); missing gateway/token config replies command_err like the
    // TS throw path's user-visible outcome.
    let (Some(endpoint), Some(token)) = (
        crate::commands::authrestore::gateway_endpoint(
            crate::funcs::GatewayMethod::CreateCustomVanity,
        ),
        crate::config::api_token(),
    ) else {
        ctx.say(cmd_err).await?;
        return Ok(());
    };
    let body = serde_json::json!({
        "adminKey": token,
        "guildId": guild_id.get().to_string(),
        "vanityCode": code,
        "inviteCode": invite.code,
    });
    let outcome = reqwest::Client::new()
        .post(endpoint)
        .json(&body)
        .send()
        .await;
    match outcome {
        Ok(resp) if resp.status() == reqwest::StatusCode::OK => {
            let message = resp
                .json::<serde_json::Value>()
                .await
                .ok()
                .and_then(|v| {
                    v.get("message")
                        .and_then(|m| m.as_str())
                        .map(str::to_string)
                })
                .unwrap_or_default();
            ctx.say(message).await?;
            Ok(())
        }
        _ => {
            ctx.say(cmd_err).await?;
            Ok(())
        }
    }
}

/// Whitelist roles for protected commands. Mirrors !wlroles.ts (flattened).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles-add",
    default_member_permissions = "ADMINISTRATOR"
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_whitelist_role_added")
            .unwrap_or_else(|| "Whitelist role added.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles-list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn wlroles_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    show_wlroles_list(&ctx).await
}

async fn show_wlroles_list(ctx: &Ctx<'_>) -> Result<(), anyhow::Error> {
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

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles",
    aliases("wlrole"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn wlroles(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    show_wlroles_list(&ctx).await
}

/// Media-only channel toggle. Mirrors !media-only.ts (flattened to a toggle).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "media-only",
    aliases("piconly", "mediaonly"),
    default_member_permissions = "ADMINISTRATOR"
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
    rename = "nick-kicker",
    aliases("nickkick", "nk")
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
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_word_added")
                    .unwrap_or_else(|| "Word added.".to_string()),
            )
            .await?;
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
    aliases("unslowmode", "setcooldown", "coldown", "slow")
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "util_cooldown_command_ok")
            .map(|s| s.replace("${duration_in_string}", &format!("{secs}s")))
            .unwrap_or_else(|| format!("Slowmode {secs}s.")),
    )
    .await?;
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
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_bad_sticker_id")
                .unwrap_or_else(|| "Bad sticker id.".to_string()),
        )
        .await?;
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
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_fetch_failed")
                .unwrap_or_else(|| "Fetch failed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let name = name.unwrap_or_else(|| format!("sticker{id}"));
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
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
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "msg_sticker_added")
                    .unwrap_or_else(|| "Sticker added.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "msg_upload_failed")
                    .unwrap_or_else(|| "Upload failed.".to_string()),
            )
            .await?
        }
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

fn strip_host<'a>(url: &'a str, host: &str) -> Option<&'a str> {
    url.strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .and_then(|rest| rest.strip_prefix(host))
}

/// `#L(\d+)[-~]?L?(\d*)` fragment (TS match[4]/match[5]).
pub fn parse_line_frag(frag: &str) -> Option<(u32, u32)> {
    let rest = frag.strip_prefix('L')?;
    let head_len = rest
        .find(|c: char| !c.is_ascii_digit())
        .unwrap_or(rest.len());
    let start: u32 = rest[..head_len].parse().ok()?;
    let mut tail = &rest[head_len..];
    tail = tail.strip_prefix(&['-', '~'][..]).unwrap_or(tail);
    tail = tail.strip_prefix('L').unwrap_or(tail);
    let end = if tail.is_empty() {
        start
    } else {
        let len = tail
            .find(|c: char| !c.is_ascii_digit())
            .unwrap_or(tail.len());
        // TS `(\d*)` matches empty: garbage tails default to start.
        tail[..len].parse().unwrap_or(start)
    };
    // Raw pair, no max(): slice_code normalizes reversed ranges
    // exactly like the TS min/max branch.
    Some((start, end))
}

pub fn parse_github_link(url: &str) -> Option<GithubRef> {
    let rest = strip_host(url, "github.com/")?;
    let (repo_part, frag) = rest.split_once('#')?;
    let (start, end) = parse_line_frag(frag)?;
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
        end,
    })
}

/// `gitlab.com/<owner>/<repo>/-/blob/<branch>/<path>#Lx-y?`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GitLabRef {
    pub owner: String,
    pub repo: String,
    pub branch: String,
    pub path: String,
    pub start: u32,
    pub end: u32,
}

pub fn parse_gitlab_link(url: &str) -> Option<GitLabRef> {
    let rest = strip_host(url, "gitlab.com/")?;
    let (repo_part, after) = rest.split_once("/-/blob/")?;
    let mut owner_repo = repo_part.split('/');
    let (owner, repo) = (owner_repo.next()?, owner_repo.next()?);
    if owner_repo.next().is_some() || owner.is_empty() || repo.is_empty() {
        return None;
    }
    let (branch_path, frag) = after.split_once('#')?;
    let (start, end) = parse_line_frag(frag)?;
    let (branch, path) = branch_path.split_once('/')?;
    if branch.is_empty() || path.is_empty() {
        return None;
    }
    Some(GitLabRef {
        owner: owner.to_string(),
        repo: repo.to_string(),
        branch: branch.to_string(),
        path: path.to_string(),
        start,
        end,
    })
}

/// Gist link with dash-encoded filename:
/// `gist.github.com/<user>/<hash>[/<rev>]#file-<name>-Lx`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GistRef {
    pub user: String,
    pub hash: String,
    pub rev: String,
    pub file_dash: String,
    pub start: u32,
    pub end: u32,
}

pub fn parse_gist_link(url: &str) -> Option<GistRef> {
    let rest = strip_host(url, "gist.github.com/")?;
    let (head, frag) = rest.split_once('#')?;
    let frag = frag.strip_prefix("file-")?;
    // Shortest name wins (TS lazy `(.+?)-L`), first parseable split.
    let mut found = None;
    let mut search = frag;
    while let Some(i) = search.find("-L") {
        let before = &frag[..frag.len() - search.len() + i];
        let after = &search[i + 1..];
        if let Some((start, end)) = parse_line_frag(after) {
            found = Some((before.to_string(), start, end));
            break;
        }
        search = &search[i + 1..];
    }
    let (file_dash, start, end) = found?;
    if file_dash.is_empty() {
        return None;
    }
    let mut segs = head.split('/');
    let (user, hash) = (segs.next()?, segs.next()?);
    if user.is_empty() || hash.is_empty() {
        return None;
    }
    Some(GistRef {
        user: user.to_string(),
        hash: hash.to_string(),
        rev: segs.next().unwrap_or("").to_string(),
        file_dash,
        start,
        end,
    })
}

/// Last `-part` becomes the extension (`name-js` -> `name.js`).
pub fn gist_dot_filename(file_dash: &str) -> String {
    match file_dash.rsplit_once('-') {
        Some((a, b)) => format!("{a}.{b}"),
        None => file_dash.to_string(),
    }
}

/// Lowercase + non-word runs collapse to one `-`
/// (TS `key.toLowerCase().replace(/\W+/g, "-")`).
pub fn gist_normalize(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    let mut dashed = true;
    for c in name.to_lowercase().chars() {
        if c.is_ascii_alphanumeric() || c == '_' {
            out.push(c);
            dashed = false;
        } else if !dashed {
            out.push('-');
            dashed = true;
        }
    }
    out
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GitTarget {
    GitHub(GithubRef),
    GitLab(GitLabRef),
    Gist(GistRef),
}

/// Candidate URL tokens for one host marker (TS matchAll scans the
/// whole content, so closers/punctuation are tolerated).
fn candidates_for(content: &str, marker: &str) -> Vec<String> {
    let mut out = vec![];
    let mut rest = content;
    while let Some(i) = rest.find(marker) {
        let mut token: &str = &rest[i..];
        if let Some(end) = token.find(|c: char| c.is_whitespace()) {
            token = &token[..end];
        }
        let token = token.trim_end_matches(['>', ')', ']', '"', '\'']);
        if !token.is_empty() {
            out.push(token.to_string());
        }
        rest = &rest[i + marker.len().min(token.len() + 1)..];
        if rest.is_empty() {
            break;
        }
    }
    out
}

/// All code-link targets in message order per host (GitHub, then
/// GitLab, then Gist — like the TS extractCodeLinks loops).
pub fn extract_git_targets(content: &str) -> Vec<GitTarget> {
    let mut out = vec![];
    let github: Vec<String> = ["https://github.com/", "http://github.com/"]
        .iter()
        .flat_map(|m| candidates_for(content, m))
        .collect();
    for token in github {
        if token.contains("gist.github.com/") {
            continue;
        }
        if let Some(r) = parse_github_link(&token) {
            out.push(GitTarget::GitHub(r));
        }
    }
    let gitlab: Vec<String> = ["https://gitlab.com/", "http://gitlab.com/"]
        .iter()
        .flat_map(|m| candidates_for(content, m))
        .collect();
    for token in gitlab {
        if let Some(r) = parse_gitlab_link(&token) {
            out.push(GitTarget::GitLab(r));
        }
    }
    let gists: Vec<String> = ["https://gist.github.com/", "http://gist.github.com/"]
        .iter()
        .flat_map(|m| candidates_for(content, m))
        .collect();
    for token in gists {
        if let Some(r) = parse_gist_link(&token) {
            out.push(GitTarget::Gist(r));
        }
    }
    out
}

/// Tabs to 4 spaces, then dedent by the smallest indent of
/// non-blank lines (blank lines kept as-is). Mirrors formatIndent.
pub fn format_indent(text: &str) -> String {
    let spaced = text.replace('\t', "    ");
    let lines: Vec<&str> = spaced.split('\n').collect();
    let mut min = usize::MAX;
    for line in &lines {
        if let Some(i) = line.find(|c: char| !c.is_whitespace()) {
            min = min.min(i);
        }
    }
    let min = if min == usize::MAX { 0 } else { min };
    lines
        .iter()
        .map(|line| {
            if line.find(|c: char| !c.is_whitespace()).is_none() {
                (*line).to_string()
            } else {
                line.get(min..).unwrap_or("").to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn escape_ticks(s: &str) -> String {
    s.replace("``", "`\u{200b}`")
}

/// Single-line (trim) or normalized-range slice. Returns
/// (display, lineLength); None when out of range. Mirrors the TS
/// handleMatch tail.
pub fn slice_code(lines: &[&str], start: u32, end: u32) -> Option<(String, usize)> {
    if start == 0 || start as usize > lines.len() {
        return None;
    }
    if start == end {
        let display = escape_ticks(lines[start as usize - 1].trim());
        return Some((display, 1));
    }
    let s = 1.max(start.min(end)) as usize;
    let e = (lines.len() as u32).min(start.max(end)) as usize;
    if s > e {
        return None;
    }
    let display = escape_ticks(&format_indent(&lines[s - 1..e].join("\n")));
    Some((display, e - s + 1))
}

/// ```` ```<ext|blank→" "> ```` block. Mirrors the TS messages map.
pub fn render_block(display: &str, extension: &str) -> String {
    let lang = if display.chars().any(|c| !c.is_whitespace()) {
        extension
    } else {
        " "
    };
    format!("```{lang}\n{display}\n```")
}

/// Extension after the last dot (query stripped); non-alnum → "".
pub fn code_extension(filename: &str) -> String {
    let ext = filename.rsplit_once('.').map(|(_, e)| e).unwrap_or("");
    let ext = ext.split('?').next().unwrap_or("");
    if ext.is_empty() || !ext.chars().all(|c| c.is_ascii_alphanumeric()) {
        String::new()
    } else {
        ext.to_string()
    }
}

/// The feature runs unless explicitly disabled (TS gate is
/// `UTILS.git_lines === false`; "0" is this bot's own off-write).
pub fn github_lines_enabled(stored: Option<&str>) -> bool {
    !matches!(stored, Some("false") | Some("0"))
}

pub struct GitLineData {
    pub line_length: usize,
    pub extension: String,
    pub display: String,
}

async fn fetch_text(url: &str, token: Option<&str>) -> Option<String> {
    let mut req = reqwest::Client::new().get(url);
    if let Some(t) = token {
        req = req.header("Authorization", format!("token {t}"));
    }
    let resp = req.send().await.ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let body = resp.text().await.ok()?;
    if body.len() > 200_000 {
        return None;
    }
    Some(body)
}

/// Fetch + slice one target (Gist API falls back to raw when a rev
/// is pinned; the API leg uses GITHUB_API_KEY like the TS ctor).
pub async fn fetch_git_target(target: &GitTarget) -> Option<GitLineData> {
    match target {
        GitTarget::GitHub(r) => {
            let body = fetch_text(&raw_url(r), None).await?;
            let lines: Vec<&str> = body.lines().collect();
            let (display, line_length) = slice_code(&lines, r.start, r.end)?;
            Some(GitLineData {
                line_length,
                extension: code_extension(&r.path),
                display,
            })
        }
        GitTarget::GitLab(r) => {
            let url = format!(
                "https://gitlab.com/{}/{}/-/raw/{}/{}",
                r.owner, r.repo, r.branch, r.path
            );
            let body = fetch_text(&url, None).await?;
            let lines: Vec<&str> = body.lines().collect();
            let (display, line_length) = slice_code(&lines, r.start, r.end)?;
            Some(GitLineData {
                line_length,
                extension: code_extension(&r.path),
                display,
            })
        }
        GitTarget::Gist(g) => {
            let dot = gist_dot_filename(&g.file_dash);
            let body = if !g.rev.is_empty() {
                let url = format!(
                    "https://gist.githubusercontent.com/{}/raw/{}/{}",
                    g.user, g.rev, dot
                );
                fetch_text(&url, None).await?
            } else {
                let token = std::env::var("GITHUB_API_KEY").ok();
                let url = format!("https://api.github.com/gists/{}", g.hash);
                let body = fetch_text(&url, token.as_deref()).await?;
                let json: serde_json::Value = serde_json::from_str(&body).ok()?;
                let files = json.get("files")?.as_object()?;
                let norm = gist_normalize(&g.file_dash);
                let content = files
                    .get(&dot)
                    .or_else(|| {
                        files
                            .iter()
                            .find(|(k, _)| gist_normalize(k) == norm)
                            .map(|(_, v)| v)
                    })?
                    .get("content")?
                    .as_str()?;
                content.to_string()
            };
            let lines: Vec<&str> = body.lines().collect();
            let (display, line_length) = slice_code(&lines, g.start, g.end)?;
            Some(GitLineData {
                line_length,
                extension: code_extension(&dot),
                display,
            })
        }
    }
}

pub fn raw_url(r: &GithubRef) -> String {
    format!(
        "https://raw.githubusercontent.com/{}/{}/{}/{}",
        r.owner, r.repo, r.branch, r.path
    )
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
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_auto_renew_off")
                .unwrap_or_else(|| "Auto-renew off.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(ms) = crate::commands::schedule::parse_duration_ms(&every) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_bad_duration")
                .unwrap_or_else(|| "Bad duration.".to_string()),
        )
        .await?;
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "util_autorenew_command_ok")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${channel.toString()}", &format!("<#{}>", channel.id.get()))
                    .replace("${time}", &every)
            })
            .unwrap_or_else(|| "Auto-renew set.".to_string()),
    )
    .await?;
    Ok(())
}

/// Remove all roles from a member. Mirrors !derank.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "derank",
    default_member_permissions = "ADMINISTRATOR"
)]
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
    rename = "massiverole",
    aliases("massrole", "massroles"),
    default_member_permissions = "ADMINISTRATOR"
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
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wakeup",
    aliases("wake")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(target) = target else {
        ctx.say(
            crate::lang::get(&code, "util_wakeup_not_in_vc")
                .map(|s| s.replace("${user.displayName}", &user.name))
                .unwrap_or_else(|| "Join a voice channel first.".to_string()),
        )
        .await?;
        return Ok(());
    };
    match guild_id.move_member(ctx.http(), user.id, target).await {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "util_wakeup_command_work")
                    .map(|s| s.replace("${user.toString()}", &format!("<@{}>", user.id.get())))
                    .unwrap_or_else(|| "Moved.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "util_move_not_in_vc")
                    .unwrap_or_else(|| "Move failed.".to_string()),
            )
            .await?
        }
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
    rename = "derogation",
    aliases("dero", "alldero")
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
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_derogation_added")
                    .unwrap_or_else(|| "Derogation added.".to_string()),
            )
            .await?;
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

/// Presence-bucket counts. Mirrors calculateMemberStats
/// (missing presence falls into invisible, like the TS default).
#[derive(Debug, Default, PartialEq)]
pub struct MemberStats {
    pub total: usize,
    pub online: usize,
    pub idle: usize,
    pub dnd: usize,
    pub invisible: usize,
}

pub fn count_member_stats(statuses: &[Option<&str>]) -> MemberStats {
    let mut stats = MemberStats {
        total: statuses.len(),
        ..Default::default()
    };
    for status in statuses {
        match *status {
            Some("online") => stats.online += 1,
            Some("idle") => stats.idle += 1,
            Some("dnd") => stats.dnd += 1,
            _ => stats.invisible += 1,
        }
    }
    stats
}

/// Voice counts over states with a channel. Mirrors
/// calculateVoiceStats (total = distinct users = rows here).
#[derive(Debug, Default, PartialEq)]
pub struct VoiceStats {
    pub total: usize,
    pub streaming: usize,
    pub self_deaf: usize,
    pub self_mute: usize,
    pub self_video: usize,
}

pub fn count_voice_stats(states: &[(bool, bool, bool, bool, bool)]) -> VoiceStats {
    // (in_channel, streaming, self_deaf, self_mute, self_video)
    let in_channel: Vec<&(bool, bool, bool, bool, bool)> = states.iter().filter(|s| s.0).collect();
    VoiceStats {
        total: in_channel.len(),
        streaming: in_channel.iter().filter(|s| s.1).count(),
        self_deaf: in_channel.iter().filter(|s| s.2).count(),
        self_mute: in_channel.iter().filter(|s| s.3).count(),
        self_video: in_channel.iter().filter(|s| s.4).count(),
    }
}

/// Server-stats embed description. Short mode drops emoji prefixes
/// and large-only rows, like the TS forEach.
pub fn vc_description(rows: &[(&str, &str, String, bool)], is_large: bool) -> String {
    rows.iter()
        .filter(|(_, _, _, large_only)| is_large || !large_only)
        .map(|(emoji, label, value, _)| {
            if is_large {
                format!("{emoji}  {label} : **{value}**\n")
            } else {
                format!("{label} : **{value}**\n")
            }
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// App-emoji markup with empty fallback (stat rows tolerate
/// missing synced emojis).
async fn stat_emoji(http: &std::sync::Arc<serenity::Http>, name: &str) -> String {
    crate::emojis::app_emoji_markup(http, name)
        .await
        .unwrap_or_default()
}

/// Server voice statistics.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "vc",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn vc_list(
    ctx: Ctx<'_>,
    #[description = "Display mode: short or large"] mode: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let http = ctx.serenity_context().http.clone();
    let is_large = mode.as_deref().unwrap_or("short") == "large";
    // TS fetches members when the cache is empty. The cache guard
    // is scoped so no !Send guard crosses an await.
    let snapshot = {
        let cache = &ctx.serenity_context().cache;
        cache.guild(guild_id).map(|g| {
            (
                g.members.keys().copied().collect::<Vec<_>>(),
                g.presences.clone(),
                g.voice_states.clone(),
                g.name.clone(),
                g.member_count,
                g.premium_subscription_count.unwrap_or(0),
                g.icon_url().map(|u| format!("{u}?size=4096")),
                g.icon_url(),
            )
        })
    };
    let Some((member_ids, presences, voice_rows, name, member_count, boosts, icon_png, icon_thumb)) =
        snapshot
    else {
        return Ok(());
    };
    let member_ids = if member_ids.is_empty() {
        guild_id
            .members(&http, Some(1000), None)
            .await
            .unwrap_or_default()
            .iter()
            .map(|m| m.user.id)
            .collect()
    } else {
        member_ids
    };
    let statuses: Vec<Option<&str>> = member_ids
        .iter()
        .map(|id| presences.get(id).map(|p| p.status.name()))
        .collect();
    let member_stats = count_member_stats(&statuses);
    let states: Vec<(bool, bool, bool, bool, bool)> = voice_rows
        .values()
        .map(|v| {
            (
                v.channel_id.is_some(),
                v.self_stream.unwrap_or(false),
                v.self_deaf,
                v.self_mute,
                v.self_video,
            )
        })
        .collect();
    let voice_stats = count_voice_stats(&states);
    let total_online = member_stats.dnd + member_stats.online + member_stats.idle;
    let mut dominant = "#010101".to_string();
    if let Some(url) = icon_png {
        if let Ok((c1, _)) = crate::funcs::image_dominant_color(&url).await {
            dominant = c1;
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let labels = [
        t("var_member"),
        t("var_online"),
        t("var_online_call"),
        t("var_stream"),
        t("var_boosts"),
        t("var_camera"),
        t("var_muted"),
    ];
    let emo_names = [
        "Server_Stats",
        "VC_Limit",
        "Desktop_Online",
        "Streaming",
        "Server_Booster",
        "Camera",
        "Mute",
    ];
    let values = [
        member_count.to_string(),
        total_online.to_string(),
        voice_stats.total.to_string(),
        voice_stats.streaming.to_string(),
        boosts.to_string(),
        voice_stats.self_video.to_string(),
        voice_stats.self_deaf.to_string(),
    ];
    let larges = [false, false, false, false, false, true, true];
    let mut owned: Vec<(String, String, String, bool)> = vec![];
    for i in 0..7 {
        owned.push((
            stat_emoji(&http, emo_names[i]).await,
            labels[i].clone(),
            values[i].clone(),
            larges[i],
        ));
    }
    let refs: Vec<(&str, &str, String, bool)> = owned
        .iter()
        .map(|(a, b, c, d)| (a.as_str(), b.as_str(), c.clone(), *d))
        .collect();
    let colour = u32::from_str_radix(dominant.trim_start_matches('#'), 16).unwrap_or(0x010101);
    let mut embed = serenity::CreateEmbed::default()
        .title(format!("{} {} !", name, t("var_vc_stats")))
        .colour(serenity::Colour::new(colour))
        .description(vc_description(&refs, is_large));
    if let Some(thumb) = icon_thumb {
        embed = embed.thumbnail(thumb);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    if matches!(ctx, poise::Context::Application(_)) {
        let tick = stat_emoji(&http, "GreenTick").await;
        ctx.send(poise::CreateReply::default().content(tick).ephemeral(true))
            .await?;
    }
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
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(target) = target else {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "renewvc_not_in_voice")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Join a voice channel first.".to_string()),
        )
        .await?;
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
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "talk",
    aliases("mutetalk")
)]
pub async fn talk(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    voice_mute_flag(&ctx, user, false).await
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "untalk",
    aliases("unmutetalk")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if mute {
        crate::lang::get(&code, "msg_muted").unwrap_or_else(|| "Muted.".to_string())
    } else {
        crate::lang::get(&code, "msg_unmuted").unwrap_or_else(|| "Unmuted.".to_string())
    })
    .await?;
    Ok(())
}

/// List bots. Mirrors !allbots.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "allbots",
    aliases("allb", "bots"),
    default_member_permissions = "ADMINISTRATOR"
)]
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
    rename = "role-members",
    aliases("rolemembers", "rolemember")
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if members.is_empty() {
        crate::lang::get(&code, "util_role_members_no_one")
            .unwrap_or_else(|| "Nobody has this role.".to_string())
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
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "util_inviteinfo_not_valid_invite")
                    .unwrap_or_else(|| "Invalid invite.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

/// List webhooks. Mirrors !allwebhooks.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "allwebhooks",
    aliases("webhooks", "webhook")
)]
pub async fn allwebhooks(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let hooks = guild_id.webhooks(ctx.http()).await.unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if hooks.is_empty() {
        crate::lang::get(&code, "util_no_webhooks").unwrap_or_else(|| "No webhooks.".to_string())
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
    rename = "admin-users",
    aliases("alladmin", "allperms", "alladmins", "adminusers"),
    default_member_permissions = "ADMINISTRATOR"
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if admins.is_empty() {
        crate::lang::get(&code, "all_admins_nobody_admins")
            .unwrap_or_else(|| "No admins.".to_string())
    } else {
        admins.join(", ")
    })
    .await?;
    Ok(())
}

/// Nickname-role rule (GUILD.RANK_ROLES.nicknames).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "setmentionrole",
    aliases("setrank", "setranks", "rankset"),
    default_member_permissions = "ADMINISTRATOR"
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
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "setrankroles_command_work_disable")
                .map(|s| s.replace("${interaction.user.id}", &ctx.author().id.get().to_string()))
                .unwrap_or_else(|| "Mention-role off.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let (Some(role), Some(part)) = (role, part) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "setrankroles_not_roles_typed")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Give a role and a nickname part.".to_string()),
        )
        .await?;
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "setrankroles_command_work")
            .map(|s| s.replace("${argsid}", &role.id.get().to_string()))
            .unwrap_or_else(|| "Mention-role set.".to_string()),
    )
    .await?;
    Ok(())
}

/// Recreate a channel now (clone + delete). Mirrors !renew.ts manual path.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "renew",
    aliases("r", "rnw"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    ctx.say(
        crate::lang::get(&code, "renew_channel_send_success")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
            })
            .unwrap_or_else(|| format!("Renewed as <#{}>.", new_ch.id.get())),
    )
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
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "nickrole",
    default_member_permissions = "ADMINISTRATOR"
)]
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
    rename = "rolelimit",
    aliases("limitrole", "limitoles", "roleslimit")
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match limit.unwrap_or(0) {
        0 => {
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(&key)
                .execute(&ctx.data().pool)
                .await;
            ctx.say(
                crate::lang::get(&code, "msg_role_limit_cleared")
                    .unwrap_or_else(|| "Role limit cleared.".to_string()),
            )
            .await?;
        }
        n => {
            crate::db::kv_set(&ctx.data().pool, &gid, &key, &n.max(1).to_string()).await?;
            ctx.say(
                crate::lang::get(&code, "msg_role_limit_set")
                    .unwrap_or_else(|| "Role limit set.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

/// Steal custom emojis from text. Mirrors !emojis.ts
/// (CDN fetch + guild upload).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "emojis",
    aliases("addemoji", "create", "addemojis", "emoji", "emote"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match guild_id.disconnect_member(ctx.http(), user.id).await {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "msg_voice_kicked")
                    .unwrap_or_else(|| "Voice kicked.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "vkick_not_in_vc")
                    .unwrap_or_else(|| "Not in voice.".to_string()),
            )
            .await?
        }
    };
    Ok(())
}

/// Download all guild emojis as a zip. Mirrors !zip-emojis.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "zip-emojis",
    aliases("zipemojis", "zip1"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn zip_emojis(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let emojis = guild_id.emojis(ctx.http()).await.unwrap_or_default();
    if emojis.is_empty() {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_no_emojis").unwrap_or_else(|| "No emojis.".to_string()),
        )
        .await?;
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
    rename = "unzip-emojis",
    aliases("unzipemojis", "unzip1")
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
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_download_failed")
                    .unwrap_or_else(|| "Download failed.".to_string()),
            )
            .await?;
            return Ok(());
        }
    };
    let reader = std::io::Cursor::new(bytes);
    let mut archive = match zip::ZipArchive::new(reader) {
        Ok(a) => a,
        Err(_) => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_bad_zip").unwrap_or_else(|| "Bad zip.".to_string()),
            )
            .await?;
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
    rename = "zip-stickers",
    aliases("zipstickers", "zip2")
)]
pub async fn zip_stickers(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let stickers = guild_id.stickers(ctx.http()).await.unwrap_or_default();
    if stickers.is_empty() {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_no_stickers")
                .unwrap_or_else(|| "No stickers.".to_string()),
        )
        .await?;
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
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "renewvc",
    aliases("rvc")
)]
pub async fn renewvc(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let target = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(target) = target else {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "renewvc_not_in_voice")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Join a voice channel first.".to_string()),
        )
        .await?;
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
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    ctx.say(
        crate::lang::get(&code, "renew_channel_send_success")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
            })
            .unwrap_or_else(|| format!("Renewed as <#{}>.", new_ch.id.get())),
    )
    .await?;
    Ok(())
}

/// Voice freeze channel + allowed users.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlvc",
    aliases("allowvc")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_voice_freeze_channel_set")
            .unwrap_or_else(|| "Voice freeze channel set.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unwlvc",
    aliases("removevcwl")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_voice_freeze_cleared")
            .unwrap_or_else(|| "Voice freeze cleared.".to_string()),
    )
    .await?;
    Ok(())
}

/// Hide/unhide every text channel. Mirrors chanel hideall/unhideall.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "hideall",
    aliases("masquer-tout")
)]
pub async fn chan_hideall(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    hide_all_inner(&ctx, false).await
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unhideall",
    aliases("démasquer-tout", "demasquer-tout")
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if unhide {
        crate::lang::get(&code, "msg_unhid_all").unwrap_or_else(|| "Unhid all.".to_string())
    } else {
        crate::lang::get(&code, "msg_hid_all").unwrap_or_else(|| "Hid all.".to_string())
    })
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
        // TS `#Lx[~-]?L?y` frag variants.
        assert_eq!(parse_line_frag("L10-L20"), Some((10, 20)));
        assert_eq!(parse_line_frag("L10~L20"), Some((10, 20)));
        assert_eq!(parse_line_frag("L10~20"), Some((10, 20)));
        assert_eq!(parse_line_frag("L10L20"), Some((10, 20)));
        assert_eq!(parse_line_frag("L5"), Some((5, 5)));
        assert_eq!(parse_line_frag("Lx"), None);
        // Reversed ranges stay raw: slice_code normalizes like TS min/max.
        assert_eq!(parse_line_frag("L7-L3"), Some((7, 3)));
        // Garbage tails default to start (TS empty digit match).
        assert_eq!(parse_line_frag("L5x"), Some((5, 5)));
        assert_eq!(parse_line_frag("L5-abc"), Some((5, 5)));
        assert_eq!(parse_line_frag("L5-"), Some((5, 5)));
    }

    #[test]
    fn gitlab_and_gist_parse() {
        let g = parse_gitlab_link("https://gitlab.com/o/r/-/blob/main/a/b.rs#L3-7").unwrap();
        assert_eq!((g.owner, g.branch.as_str()), ("o".to_string(), "main"));
        assert_eq!((g.start, g.end), (3, 7));
        assert!(parse_gitlab_link("https://gitlab.com/o/r/blob/main/a#L1").is_none());
        let gist = parse_gist_link("https://gist.github.com/u/abc123#file-hello-js-L2-L5").unwrap();
        assert_eq!(gist_dot_filename(&gist.file_dash), "hello.js");
        assert_eq!((gist.start, gist.end), (2, 5));
        let gist2 = parse_gist_link("https://gist.github.com/u/abc123/rev9#file-a-L1").unwrap();
        assert_eq!(gist2.rev, "rev9");
        assert_eq!(gist_normalize("Hello World.rs!"), "hello-world-rs-");
        // Non-word runs collapse to one dash (TS replace with /g).
        assert_eq!(gist_normalize("foo  bar.js"), "foo-bar-js");
        assert_eq!(gist_normalize("a__b"), "a__b");
    }

    #[test]
    fn extract_targets_scans_content() {
        let content = "see (https://github.com/o/r/blob/main/a.rs#L1) and https://gitlab.com/o/r/-/blob/main/b.rs#L2 plus https://gist.github.com/u/h#file-x-js-L3";
        let targets = extract_git_targets(content);
        assert_eq!(targets.len(), 3);
        assert!(matches!(targets[0], GitTarget::GitHub(_)));
        assert!(matches!(targets[1], GitTarget::GitLab(_)));
        assert!(matches!(targets[2], GitTarget::Gist(_)));
        assert!(extract_git_targets("no links here").is_empty());
    }

    #[test]
    fn vanity_code_rules_match_ts() {
        // Valid: alnum groups joined by single hyphens, max 32.
        assert!(is_valid_vanity_code("abc"));
        assert!(is_valid_vanity_code("ABC-123-x"));
        assert!(is_valid_vanity_code(&"a".repeat(32)));
        // Invalid: empty, too long, edge/double hyphens, bad chars.
        assert!(!is_valid_vanity_code(""));
        assert!(!is_valid_vanity_code(&"a".repeat(33)));
        assert!(!is_valid_vanity_code("-abc"));
        assert!(!is_valid_vanity_code("abc-"));
        assert!(!is_valid_vanity_code("a--b"));
        assert!(!is_valid_vanity_code("ab_c"));
        assert!(!is_valid_vanity_code("ab c"));
        assert!(!is_valid_vanity_code("caf\u{e9}"));
    }

    #[test]
    fn vanity_claim_scan_matches_ts() {
        let table = serde_json::json!({
            "111": { "vanity": "taken", "invite": "x" },
            "222": { "vanity": "other" },
            "333": "not-an-object",
        });
        assert!(vanity_already_claimed(Some(&table), "taken"));
        assert!(!vanity_already_claimed(Some(&table), "free"));
        assert!(!vanity_already_claimed(None, "taken"));
        assert!(!vanity_already_claimed(
            Some(&serde_json::json!([])),
            "taken"
        ));
        // Template fill replaces the first placeholder only.
        assert_eq!(
            vanity_invalid_text("`${VanityCode}` bad ${VanityCode}", "x-y"),
            "`x-y` bad ${VanityCode}"
        );
    }

    #[test]
    fn indent_and_slice_match_ts() {
        assert_eq!(
            format_indent("    a\n        b\n\n      c"),
            "a\n    b\n\n  c"
        );
        assert_eq!(format_indent("\ta"), "a");
        let lines = vec!["  first  ", "    second", "third"];
        assert_eq!(slice_code(&lines, 1, 1), Some(("first".to_string(), 1)));
        // Range keeps TS semantics: no trim, dedent by the
        // smallest indent (0 here because "third" is flush).
        assert_eq!(
            slice_code(&lines, 3, 1),
            Some(("  first  \n    second\nthird".to_string(), 3))
        );
        assert_eq!(slice_code(&lines, 0, 1), None);
        assert_eq!(slice_code(&lines, 9, 9), None);
        // Backtick escape + blank display language.
        assert_eq!(
            slice_code(&["``x``"], 1, 1).unwrap().0,
            "`\u{200b}`x`\u{200b}`"
        );
        assert_eq!(render_block("   ", "rs"), "``` \n   \n```");
        assert_eq!(render_block("let x = 1;", "rs"), "```rs\nlet x = 1;\n```");
        assert_eq!(code_extension("a/b.rs?x=1"), "rs");
        assert_eq!(code_extension("Makefile"), "");
        // Default-on gate: only explicit off writes disable.
        assert!(github_lines_enabled(None));
        assert!(github_lines_enabled(Some("1")));
        assert!(github_lines_enabled(Some("true")));
        assert!(!github_lines_enabled(Some("false")));
        assert!(!github_lines_enabled(Some("0")));
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
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "avatar",
    aliases("pfp", "pp", "pic")
)]
pub async fn avatar(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let url = u.face();
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title({
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            crate::lang::get(&code, "avatar_embed_title")
                .map(|s| s.replace("${mentionedUser.username}", &u.name))
                .unwrap_or_else(|| format!("{}'s avatar", u.tag()))
        })
        .image(url);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// User info. Mirrors utils userinfo (embed, no html2png).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "userinfo",
    aliases("ui")
)]
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

/// First message link.
// Mirrors MessageCommands utils top.ts (oldest message via
// after:"0", link reply or no-message text).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "top")]
pub async fn top(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let first = ctx
        .channel_id()
        .messages(
            ctx.http(),
            poise::serenity_prelude::GetMessages::new()
                .after(poise::serenity_prelude::MessageId::new(1))
                .limit(1),
        )
        .await
        .unwrap_or_default()
        .into_iter()
        .next();
    match first {
        Some(m) => {
            let link =
                crate::funcs::message_url(guild_id.get(), ctx.channel_id().get(), m.id.get());
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "utils_top_command_ok",
                    "The first message in this channel is [here](${link})",
                )
                .await
                .replace("${link}", &link),
            )
            .await?;
        }
        None => {
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "utils_top_no_message",
                    "No messages found in this channel",
                )
                .await,
            )
            .await?;
        }
    }
    Ok(())
}

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
    let (name, id, members, channels, roles, boosts) = {
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
        (
            guild.name.clone(),
            guild.id.get().to_string(),
            guild.member_count.to_string(),
            guild.channels.len().to_string(),
            guild.roles.len().to_string(),
            guild.premium_subscription_count.unwrap_or(0).to_string(),
        )
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let f = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(name)
        .field(f("serverinfo_embed_fields_id", "ID"), id, true)
        .field(
            f("serverinfo_embed_fields_members", "Members"),
            members,
            true,
        )
        .field(
            f("serverinfo_embed_fields_channels", "Channels"),
            channels,
            true,
        )
        .field(f("serverinfo_embed_fields_roles", "Roles"), roles, true)
        .field(f("var_boosts", "Boosts"), boosts, true);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Previous names. Mirrors utils !prevnames.ts (tracked in user_update).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "prevnames",
    aliases("pvnames", "pvname", "prevname")
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if history.is_empty() {
        crate::lang::get(&code, "prevnames_undetected")
            .unwrap_or_else(|| "No previous names.".to_string())
    } else {
        history.join(", ")
    })
    .await?;
    Ok(())
}

/// Member voice location. Mirrors utils where (voice states).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "where",
    aliases("whereis")
)]
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
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_no_server_icon")
                    .unwrap_or_else(|| "No server icon.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

/// Snipe read. Mirrors utils !snipe.ts (marker stored by events_handler).
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
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &format!("SNIPE.{ch_id}")).await;
    if let Some(v) = raw.and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok()) {
        let author = v.get("author").and_then(|a| a.as_str()).unwrap_or("?");
        let content = v.get("content").and_then(|c| c.as_str()).unwrap_or("");
        ctx.say(format!("{author}: {content}")).await?;
        return Ok(());
    }
    let last = crate::db::kv_get(&ctx.data().pool, &gid, "SNIPE.last_deleted_id").await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(match last {
        Some(id) => format!("Last deleted message id: {id}"),
        None => crate::lang::get(&code, "snipe_no_previous_message_deleted")
            .unwrap_or_else(|| "Nothing to snipe.".to_string()),
    })
    .await?;
    Ok(())
}

/// Add role. Mirrors utils !addrole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "addrole",
    default_member_permissions = "MANAGE_ROLES"
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    ctx.say(
        crate::lang::get(&code, "utils_addrole_command_ok")
            .map(|s| {
                s.replace("${author.toString()}", &ctx.author().to_string())
                    .replace("${role?.toString()}", &role.to_string())
                    .replace("${user.toString()}", &user.to_string())
            })
            .unwrap_or_else(|| format!("{} got {}.", user.tag(), role.name)),
    )
    .await?;
    Ok(())
}

/// Remove role. Mirrors utils !delrole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "delrole",
    default_member_permissions = "MANAGE_ROLES"
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    ctx.say(
        crate::lang::get(&code, "utils_delrole_command_ok")
            .map(|s| {
                s.replace("${author.toString()}", &ctx.author().to_string())
                    .replace("${role?.toString()}", &role.to_string())
                    .replace("${user.toString()}", &user.to_string())
            })
            .unwrap_or_else(|| format!("{} lost {}.", user.tag(), role.name)),
    )
    .await?;
    Ok(())
}

/// Post an embed from title + description.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "embed-post",
    default_member_permissions = "MANAGE_MESSAGES"
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
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "massmove",
    default_member_permissions = "MANAGE_GUILD"
)]
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
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "dm",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn dm(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Message"] message: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    match user
        .direct_message(
            ctx.http(),
            poise::serenity_prelude::CreateMessage::new().content(&message),
        )
        .await
    {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "utils_dm")
                    .map(|s| {
                        s.replace("${client.iHorizon_Emojis.Yes}", &yes).replace(
                            "${targetMember.toString()}",
                            &format!("<@{}>", user.id.get()),
                        )
                    })
                    .unwrap_or_else(|| "DM sent.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "utils_dm_cant")
                    .map(|s| {
                        s.replace("${client.iHorizon_Emojis.No}", &no).replace(
                            "${targetMember.toString()}",
                            &format!("<@{}>", user.id.get()),
                        )
                    })
                    .unwrap_or_else(|| "Could not DM (closed DMs?).".to_string()),
            )
            .await?
        }
    };
    Ok(())
}

pub fn leash_key(follower_id: u64) -> String {
    format!("UTILS.LEASH.{follower_id}")
}

/// Leash a follower to a target. Mirrors utils !leash.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "leash",
    default_member_permissions = "ADMINISTRATOR"
)]
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
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        let warn = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Warning_Icon")
            .await
            .unwrap_or_else(|| "⚠️".to_string());
        let content =
            crate::commands::lang_for(&ctx, "util_leash_confirm_message", "Leash anyway?")
                .await
                .replace("${client.iHorizon_Emojis.No}", &no)
                .replace("${client.iHorizon_Emojis.Warning_Icon}", &warn);
        let yes = crate::commands::lang_for(&ctx, "var_yes", "Yes").await;
        let no = crate::commands::lang_for(&ctx, "var_no", "No").await;
        if !crate::commands::prompt_yes_or_no(&ctx, content, yes, no, false).await? {
            let yes_mark = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
                .await
                .unwrap_or_else(|| "✅".to_string());
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "util_leash_canceled_leash",
                    "Leash configurations canceled.",
                )
                .await
                .replace("${client.iHorizon_Emojis.Yes}", &yes_mark),
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes_mark = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "util_leash_confirmed_leash")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes_mark))
            .unwrap_or_else(|| format!("{} now follows {}.", follower.tag(), target.tag())),
    )
    .await?;
    Ok(())
}

/// Remove a leash. Mirrors utils !unleash.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unleash",
    default_member_permissions = "ADMINISTRATOR"
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes_mark = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "util_unleash_command_ok")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes_mark))
            .unwrap_or_else(|| "Leash removed.".to_string()),
    )
    .await?;
    Ok(())
}

/// Fetch a user's banner hash via Discord REST.
/// Mirrors utils banner !user.ts (GET /users/{id} with the bot token).
pub async fn fetch_user_banner_hash(token: &str, user_id: u64) -> Option<String> {
    reqwest::Client::new()
        .get(format!("https://discord.com/api/v10/users/{user_id}"))
        .header("Authorization", format!("Bot {token}"))
        .send()
        .await
        .ok()?
        .json::<serde_json::Value>()
        .await
        .ok()?
        .get("banner")?
        .as_str()
        .map(|s| s.to_string())
}

/// User banner CDN URL. Mirrors the cdn.../banners/{id}/{hash} embed
/// image (gif for animated a_ hashes, png otherwise, size 1024).
pub fn user_banner_url(user_id: u64, banner_hash: &str) -> String {
    let ext = if banner_hash.starts_with("a_") {
        "gif"
    } else {
        "png"
    };
    format!("https://cdn.discordapp.com/banners/{user_id}/{banner_hash}.{ext}?size=1024")
}

/// Footer text plus optional footer_icon.png bytes.
/// Mirrors displayBotName footerBuilder/footerAttachmentBuilder
/// (stored BOT.botPFP base64 wins, else a bot avatar snapshot;
// TS attaches the avatar URL, we attach its bytes so the icon renders).
pub async fn footer_parts(ctx: &Ctx<'_>, guild_id: &str) -> (String, Option<Vec<u8>>) {
    let pool = &ctx.data().pool;
    let name = crate::commands::botcat::bot_footer_name(
        crate::db::kv_get(pool, guild_id, crate::commands::botcat::BOT_NAME_KEY)
            .await
            .as_deref(),
    );
    let stored = crate::db::kv_get(pool, guild_id, crate::commands::botcat::BOT_PFP_KEY).await;
    if let Some(bytes) = crate::commands::botcat::footer_icon_bytes(stored.as_deref()) {
        return (name, Some(bytes));
    }
    let face = ctx.serenity_context().cache.current_user().face();
    let bytes = crate::commands::botcat::download_bytes(&face).await;
    (name, bytes)
}

/// Apply the shared footer (text + optional icon attachment) to an embed.
pub fn embed_with_footer(
    embed: poise::serenity_prelude::CreateEmbed,
    name: &str,
    with_icon: bool,
) -> poise::serenity_prelude::CreateEmbed {
    embed.footer(
        poise::serenity_prelude::CreateEmbedFooter::new(name.to_string()).icon_url(if with_icon {
            "attachment://footer_icon.png".to_string()
        } else {
            String::new()
        }),
    )
}

/// Show a member's banner. Mirrors utils banner !user.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "banner-user",
    aliases("userbanner", "ubanner")
)]
pub async fn banner_user(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let token = crate::config::bot_token().unwrap_or_default();
    let hash = fetch_user_banner_hash(&token, u.id.get()).await;
    let Some(hash) = hash else {
        ctx.say(crate::commands::lang_for(&ctx, "banner_user_no_banner", "No banner.").await)
            .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xC4AFED)
        .title(
            crate::commands::lang_for(&ctx, "banner_user_embed", "${user?.username}")
                .await
                .replace("${user?.username}", &u.name),
        )
        .image(user_banner_url(u.id.get(), &hash));
    let embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
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

/// Show the server's banner. Mirrors utils banner !server.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "banner-server",
    aliases("serverbanner")
)]
pub async fn banner_server(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let banner_url = ctx.guild().as_ref().and_then(|g| g.banner_url());
    let Some(banner_url) = banner_url else {
        ctx.say(crate::commands::lang_for(&ctx, "banner_guild_no_banner", "No banner.").await)
            .await?;
        return Ok(());
    };
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xC4AFED)
        .title(crate::commands::lang_for(&ctx, "banner_guild_embed", "Server banner").await)
        .image(banner_url);
    let embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
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

/// Banner parent. Mirrors utils banner/banner.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "banner",
    subcommands("banner_user", "banner_server"),
    subcommand_required
)]
pub async fn banner(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// List administrator roles with owner-gated strip. Mirrors
/// utils/util !admin-roles.ts (5/page wrap-around pager + trash
/// button stripping Administrator with good/bad counts; the TS
/// 160s collector has no stateless equivalent).
pub const ADMIN_ROLES_PREFIX: &str = "admin-roles:";
pub const ADMIN_ROLES_PER_PAGE: usize = 5;

/// Pure pager. Mirrors the pages build (managed -> "🤖 (BOT)").
pub fn admin_role_pages(roles: &[(u64, bool)], title_tpl: &str) -> Vec<(String, String)> {
    let mut pages = Vec::new();
    for (i, chunk) in roles.chunks(ADMIN_ROLES_PER_PAGE).enumerate() {
        let title = title_tpl.replace("${i / rolesPerPage + 1}", &(i + 1).to_string());
        let desc = chunk
            .iter()
            .map(|(id, managed)| {
                if *managed {
                    format!("<@&{id}> 🤖 (BOT)")
                } else {
                    format!("<@&{id}>")
                }
            })
            .collect::<Vec<_>>()
            .join("\n");
        pages.push((title, desc));
    }
    pages
}

fn admin_roles_row(invoker: u64, page: usize, remove_lbl: &str) -> serenity::CreateActionRow {
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(format!("{ADMIN_ROLES_PREFIX}{invoker}:{page}:prev"))
            .label("<<<")
            .style(serenity::ButtonStyle::Secondary),
        serenity::CreateButton::new(format!("{ADMIN_ROLES_PREFIX}{invoker}:{page}:next"))
            .label(">>>")
            .style(serenity::ButtonStyle::Secondary),
        serenity::CreateButton::new(format!("{ADMIN_ROLES_PREFIX}{invoker}:{page}:trash"))
            .label(remove_lbl)
            .emoji(serenity::ReactionType::Unicode("🗑️".to_string()))
            .style(serenity::ButtonStyle::Danger),
    ])
}

/// Collect (role_id, managed) admin roles, sorted by id.
pub fn collect_admin_roles(
    roles: &std::collections::HashMap<serenity::RoleId, serenity::Role>,
) -> Vec<(u64, bool)> {
    let mut out: Vec<(u64, bool)> = roles
        .iter()
        .filter(|(_, r)| r.permissions.administrator())
        .map(|(id, r)| (id.get(), r.managed))
        .collect();
    out.sort_by_key(|(id, _)| *id);
    out
}

/// Post one pager page. Mirrors createEmbed + footer builders.
pub async fn post_admin_page(
    ctx: &Ctx<'_>,
    gid: &str,
    page: usize,
    pages: &[(String, String)],
) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (name, icon_bytes) = footer_parts(ctx, gid).await;
    let footer_text = crate::commands::botcat::footer_page_text(
        &name,
        &t("var_page"),
        (page + 1) as u64,
        pages.len() as u64,
    );
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(1, 1, 1))
        .title(pages[page].0.clone())
        .description(pages[page].1.clone())
        .footer(
            serenity::CreateEmbedFooter::new(footer_text).icon_url(if icon_bytes.is_some() {
                "attachment://footer_icon.png".to_string()
            } else {
                String::new()
            }),
        )
        .timestamp(serenity::Timestamp::now());
    let mut reply = poise::CreateReply::default()
        .embed(embed)
        .components(vec![admin_roles_row(
            ctx.author().id.get(),
            page,
            &t("admin_roles_remove_button_label"),
        )]);
    if let Some(bytes) = icon_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Pager entry. Mirrors the admin-roles list run.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "admin-roles",
    aliases("allrolesadmin", "adminroles", "adminrole", "allpa")
)]
pub async fn admin_roles(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let roles = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| collect_admin_roles(&g.roles))
        .unwrap_or_default();
    if roles.is_empty() {
        ctx.say(t("admin_roles_nobody_roles")).await?;
        return Ok(());
    }
    let pages = admin_role_pages(&roles, &t("admin_roles_embed_title"));
    post_admin_page(&ctx, &gid, 0, &pages).await
}

/// Route an admin-roles pager/strip interaction.
pub async fn handle_admin_roles_component(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let Some(rest) = comp.data.custom_id.strip_prefix(ADMIN_ROLES_PREFIX) else {
        return;
    };
    let mut parts = rest.splitn(3, ':');
    let (invoker, page, action) = match (parts.next(), parts.next(), parts.next()) {
        (Some(a), Some(b), Some(c)) => (
            a.parse::<u64>().unwrap_or(0),
            b.parse::<usize>().unwrap_or(0),
            c,
        ),
        _ => return,
    };
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if comp.user.id.get() != invoker {
        ephemeral_admin_roles(http, comp, t("help_not_for_you")).await;
        return;
    }
    // Fresh role snapshot over HTTP (stateless: no cached pages).
    let snapshot: Vec<(u64, serenity::Role)> = http
        .get_guild_roles(guild_id)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| (r.id.get(), r))
        .collect();
    let admin: Vec<(u64, bool)> = snapshot
        .iter()
        .filter(|(_, r)| r.permissions.administrator())
        .map(|(id, r)| (*id, r.managed))
        .collect();
    if admin.is_empty() {
        return;
    }
    let pages = admin_role_pages(&admin, &t("admin_roles_embed_title"));
    match action {
        "prev" | "next" => {
            let page = if action == "next" {
                (page + 1) % pages.len()
            } else {
                (page + pages.len() - 1) % pages.len()
            };
            update_admin_page(http, pool, &gid, comp, invoker, page, &pages).await;
        }
        _ => {
            // Trash: guild owner only. Mirrors the ownerId check.
            let owner = guild_id
                .to_partial_guild(http)
                .await
                .map(|g| g.owner_id.get())
                .unwrap_or(0);
            if comp.user.id.get() != owner {
                ephemeral_admin_roles(http, comp, t("admin_roles_remove_not_owner")).await;
                return;
            }
            strip_admin_roles(http, pool, comp, &snapshot).await;
        }
    }
}

async fn ephemeral_admin_roles(
    http: &serenity::Http,
    comp: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

async fn update_admin_page(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    gid: &str,
    comp: &serenity::ComponentInteraction,
    invoker: u64,
    page: usize,
    pages: &[(String, String)],
) {
    let code = crate::db::guild_lang(pool, comp.guild_id.map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let name = crate::commands::botcat::bot_footer_name(
        crate::db::kv_get(pool, gid, crate::commands::botcat::BOT_NAME_KEY)
            .await
            .as_deref(),
    );
    let footer_text = crate::commands::botcat::footer_page_text(
        &name,
        &t("var_page"),
        (page + 1) as u64,
        pages.len() as u64,
    );
    let stored = crate::db::kv_get(pool, gid, crate::commands::botcat::BOT_PFP_KEY).await;
    let with_icon = crate::commands::botcat::footer_icon_bytes(stored.as_deref()).is_some();
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(1, 1, 1))
        .title(pages[page].0.clone())
        .description(pages[page].1.clone())
        .footer(
            serenity::CreateEmbedFooter::new(footer_text).icon_url(if with_icon {
                "attachment://footer_icon.png".to_string()
            } else {
                String::new()
            }),
        )
        .timestamp(serenity::Timestamp::now());
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(embed)
                    .components(vec![admin_roles_row(
                        invoker,
                        page,
                        &t("admin_roles_remove_button_label"),
                    )]),
            ),
        )
        .await;
}

/// Strip Administrator from every admin role. Mirrors the trash flow
/// (loading state, good/bad counts, #007fff result embed).
async fn strip_admin_roles(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
    snapshot: &[(u64, serenity::Role)],
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let _ = comp
        .create_response(http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let mut good = 0u64;
    let mut bad = 0u64;
    for (id, role) in snapshot {
        if !role.permissions.administrator() {
            continue;
        }
        let mut perms = role.permissions;
        perms.remove(serenity::Permissions::ADMINISTRATOR);
        match guild_id
            .edit_role(
                http,
                serenity::RoleId::new(*id),
                serenity::EditRole::new()
                    .permissions(perms)
                    .audit_log_reason("[AdminRoles] removing admin permission from role"),
            )
            .await
        {
            Ok(_) => good += 1,
            Err(_) => bad += 1,
        }
    }
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let desc = t("admin_roles_remove_embed_desc")
        .replace(
            "${interaction.member?.user.toString()}",
            &comp.user.to_string(),
        )
        .replace("${good}", &good.to_string())
        .replace("${bad}", &bad.to_string());
    let icon = guild_id
        .to_partial_guild(http)
        .await
        .ok()
        .and_then(|g| g.icon_url())
        .unwrap_or_default();
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(0, 127, 255))
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    if !icon.is_empty() {
        embed = embed.thumbnail(icon);
    }
    let _ = comp
        .edit_response(
            http,
            serenity::EditInteractionResponse::new()
                .embed(embed)
                .components(vec![]),
        )
        .await;
}

#[cfg(test)]
mod admin_roles_tests {
    use super::{admin_role_pages, ADMIN_ROLES_PER_PAGE};

    #[test]
    fn pager_matches_ts_layout() {
        let roles: Vec<(u64, bool)> = (1u64..=7).map(|i| (i, i == 2)).collect();
        let pages = admin_role_pages(&roles, "List | Page ${i / rolesPerPage + 1}");
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "List | Page 1");
        assert_eq!(pages[1].0, "List | Page 2");
        assert_eq!(pages[0].1.lines().count(), ADMIN_ROLES_PER_PAGE);
        assert!(pages[0].1.contains("<@&2> 🤖 (BOT)"));
        assert!(pages[0].1.contains("<@&1>"));
        assert!(!pages[0].1.contains("<@&1> 🤖"));
        assert_eq!(pages[1].1.lines().count(), 2);
        assert!(admin_role_pages(&[], "T").is_empty());
    }
}

#[cfg(test)]
mod vc_stats_tests {
    use super::{count_member_stats, count_voice_stats, vc_description};

    #[test]
    fn member_buckets_match_ts() {
        let s = count_member_stats(&[
            Some("online"),
            Some("idle"),
            Some("dnd"),
            Some("offline"),
            None,
        ]);
        assert_eq!(s.total, 5);
        assert_eq!(s.online, 1);
        assert_eq!(s.idle, 1);
        assert_eq!(s.dnd, 1);
        // offline + missing presence fall into invisible (TS default).
        assert_eq!(s.invisible, 2);
    }

    #[test]
    fn voice_counts_skip_channeless() {
        let v = count_voice_stats(&[
            (true, true, false, false, true),
            (true, false, true, false, false),
            (false, true, true, true, true),
        ]);
        assert_eq!(v.total, 2);
        assert_eq!(v.streaming, 1);
        assert_eq!(v.self_deaf, 1);
        assert_eq!(v.self_mute, 0);
        assert_eq!(v.self_video, 1);
    }

    #[test]
    fn description_short_vs_large() {
        let rows = vec![
            ("E1", "Members", "10".to_string(), false),
            ("E2", "Camera", "3".to_string(), true),
        ];
        assert_eq!(vc_description(&rows, false), "Members : **10**");
        assert_eq!(
            vc_description(&rows, true),
            "E1  Members : **10**\nE2  Camera : **3**"
        );
    }
}

#[cfg(test)]
mod banner_tests {
    use super::user_banner_url;

    #[test]
    fn banner_url_picks_gif_for_animated_hashes() {
        assert_eq!(
            user_banner_url(7, "a_abc"),
            "https://cdn.discordapp.com/banners/7/a_abc.gif?size=1024"
        );
        assert_eq!(
            user_banner_url(7, "abc"),
            "https://cdn.discordapp.com/banners/7/abc.png?size=1024"
        );
    }
}

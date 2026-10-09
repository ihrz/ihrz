use super::*;

/// Unban everyone, storing the list for undo. Mirrors unbanall !all.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unban-all",
    default_member_permissions = "ADMINISTRATOR"
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
    rename = "unban-undo",
    default_member_permissions = "ADMINISTRATOR"
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
        crate::commands::authrestore::main::gateway_endpoint(
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

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "nick-kicker",
    aliases("nickkick", "nk"),
    default_member_permissions = "ADMINISTRATOR"
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

/// Auto-renew a channel on a timer.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "autorenew",
    default_member_permissions = "ADMINISTRATOR"
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
    let Some(ms) = crate::commands::shared::parse_duration_ms(&every) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_bad_duration")
                .unwrap_or_else(|| "Bad duration.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let now = crate::commands::shared::now_ms();
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

/// Move a member to your voice channel. Mirrors !wakeup.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wakeup",
    aliases("wake"),
    default_member_permissions = "MOVE_MEMBERS"
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

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "derogation",
    aliases("dero", "alldero"),
    default_member_permissions = "ADMINISTRATOR"
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

/// List webhooks. Mirrors !allwebhooks.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "allwebhooks",
    aliases("webhooks", "webhook"),
    default_member_permissions = "ADMINISTRATOR"
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

/// Upload emojis from a zip attachment. Mirrors !unzip-emojis.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unzip-emojis",
    aliases("unzipemojis", "unzip1"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
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
    aliases("zipstickers", "zip2"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
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

use crate::backup_types::{
    AfkData, BackupData, BackupInfos, BanData, CategoryData, ChannelPermissionData, ChannelsData,
    CreateOptions, EmojiData, GuildChannelData, MemberData, MessageData, MessageFileData, RoleData,
    TextChannelData, ThreadChannelData, VoiceChannelData, WidgetData,
};
use crate::bot::Ctx;

pub fn backup_key(backup_id: &str) -> String {
    format!("BACKUP.{backup_id}")
}

/// TS `role.hexColor` (`#RRGGBB` uppercase).
pub fn hex_color(colour: u32) -> String {
    format!("#{colour:06X}")
}

/// doNotBackup gate. Mirrors the per-section includes() checks.
pub fn should_backup(kind: &str, opts: &CreateOptions) -> bool {
    opts.do_not_backup
        .as_ref()
        .map(|list| !list.iter().any(|k| k == kind))
        .unwrap_or(true)
}

/// Message fetch budget. TS defaults NaN to 10 (index.ts default).
pub fn message_limit(opts: &CreateOptions) -> u64 {
    opts.max_messages_per_channel.unwrap_or(10)
}

/// System channels skipped in getChannels (rules/safety/widget/updates).
pub fn skip_system_channel(
    id: u64,
    rules: Option<u64>,
    safety: Option<u64>,
    widget: Option<u64>,
    updates: Option<u64>,
) -> bool {
    [rules, safety, widget, updates]
        .into_iter()
        .any(|sys| sys == Some(id))
}

/// Attachment reference. TS only inlines images when the full URL equals
/// a bare extension (`["png", ...].includes(a.url)`), which never holds,
/// so observable TS behavior is always the URL. Mirrored directly.
pub fn attachment_ref(url: &str) -> String {
    url.to_string()
}

/// TS `Number((size / 1024).toFixed(2))` (KB, 2 decimals).
pub fn backup_size_kb(bytes: u64) -> f64 {
    ((bytes as f64 / 1024.0) * 100.0).round() / 100.0
}

/// Channel shape routing. Mirrors the getChannels branches: text-ish
/// (text/announcement/forum/media) -> text, stage -> stage-voice shape,
/// categories skipped upstream, everything else -> voice shape with
/// forced GuildVoice type (fetchVoiceChannelData hardcodes it).
/// serenity 0.12 has no Media kind (discord.js GuildMedia falls into the
/// text branch in TS); unmapped kinds take the voice fallback here.
pub fn channel_class(kind: poise::serenity_prelude::ChannelType) -> &'static str {
    use poise::serenity_prelude::ChannelType as T;
    match kind {
        T::Text | T::News | T::Forum => "text",
        T::Stage => "stage",
        T::Category | T::NewsThread | T::PublicThread | T::PrivateThread => "skip",
        _ => "voice",
    }
}

fn role_name(
    roles: &std::collections::HashMap<
        poise::serenity_prelude::RoleId,
        poise::serenity_prelude::Role,
    >,
    id: poise::serenity_prelude::RoleId,
) -> Option<String> {
    roles.get(&id).map(|r| r.name.clone())
}

/// Mirrors getRoles (unmanaged only, position desc).
pub fn collect_roles(guild: &poise::serenity_prelude::Guild) -> Vec<RoleData> {
    let mut roles: Vec<&poise::serenity_prelude::Role> =
        guild.roles.values().filter(|r| !r.managed).collect();
    roles.sort_by_key(|a| std::cmp::Reverse(a.position));
    roles
        .into_iter()
        .map(|r| RoleData {
            name: r.name.clone(),
            color: hex_color(r.colour.0),
            hoist: r.hoist,
            permissions: r.permissions.bits().to_string(),
            mentionable: r.mentionable,
            position: r.position as i64,
            is_everyone: guild.id.get() == r.id.get(),
        })
        .collect()
}

/// Mirrors fetchChannelPermissions (role overwrites only; member
/// overwrites skipped like TS, unknown roles skipped).
pub fn collect_permissions(
    guild: &poise::serenity_prelude::Guild,
    overwrites: &[poise::serenity_prelude::PermissionOverwrite],
) -> Vec<ChannelPermissionData> {
    overwrites
        .iter()
        .filter_map(|o| match o.kind {
            poise::serenity_prelude::PermissionOverwriteType::Role(rid) => {
                role_name(&guild.roles, rid).map(|role_name| ChannelPermissionData {
                    role_name,
                    allow: o.allow.bits().to_string(),
                    deny: o.deny.bits().to_string(),
                })
            }
            _ => None,
        })
        .collect()
}

fn channel_parent_name(
    guild: &poise::serenity_prelude::Guild,
    parent_id: Option<poise::serenity_prelude::ChannelId>,
) -> Option<String> {
    parent_id.and_then(|pid| guild.channels.get(&pid).map(|c| c.name.clone()))
}

/// Fetch one image as base64 (saveImages legs). None on any error,
/// mirroring the TS per-image try/catch that keeps the other field.
pub async fn fetch_image_base64(url: &str) -> Option<String> {
    let bytes = reqwest::Client::new()
        .get(url)
        .send()
        .await
        .ok()?
        .bytes()
        .await
        .ok()?;
    Some(crate::emojis::base64_encode(&bytes))
}

/// Mirrors the getEmojis loop (parallel in TS; sequential here).
pub async fn collect_emojis(
    guild: &poise::serenity_prelude::Guild,
    opts: &CreateOptions,
) -> Vec<EmojiData> {
    let mut out = vec![];
    for emoji in guild.emojis.values() {
        let url = emoji.url();
        if opts.save_images == Some(true) {
            match fetch_image_base64(&url).await {
                Some(base64) => out.push(EmojiData {
                    name: emoji.name.clone(),
                    url: None,
                    base64: Some(base64),
                }),
                // Fetch failed: URL fallback, like the TS catch leg.
                None => out.push(EmojiData {
                    name: emoji.name.clone(),
                    url: Some(url),
                    base64: None,
                }),
            }
        } else {
            out.push(EmojiData {
                name: emoji.name.clone(),
                url: Some(url),
                base64: None,
            });
        }
    }
    out
}

/// Mirrors getMembers (cache only).
pub fn collect_members(guild: &poise::serenity_prelude::Guild) -> Vec<MemberData> {
    guild
        .members
        .values()
        .map(|m| MemberData {
            user_id: m.user.id.get().to_string(),
            username: m.user.name.clone(),
            discriminator: m
                .user
                .discriminator
                .map(|d| d.get().to_string())
                .unwrap_or_else(|| "0".to_string()),
            avatar_url: m.user.avatar_url(),
            joined_timestamp: m.joined_at.map(|t| t.timestamp()),
            roles: m.roles.iter().map(|r| r.get().to_string()).collect(),
            bot: m.user.bot,
        })
        .collect()
}

/// Mirrors getBans (empty when the bot may not see bans).
pub async fn collect_bans(
    http: &poise::serenity_prelude::Http,
    guild_id: poise::serenity_prelude::GuildId,
) -> Vec<BanData> {
    guild_id
        .bans(http, None, None)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|b| BanData {
            id: b.user.id.get().to_string(),
            reason: b.reason,
        })
        .collect()
}

/// Paged message fetch, newest-first like channel.messages.fetch.
/// Stops at the budget (TS breaks when messages.length >= messageCount).
pub async fn collect_channel_messages(
    http: &poise::serenity_prelude::Http,
    channel_id: poise::serenity_prelude::ChannelId,
    budget: u64,
) -> Vec<MessageData> {
    let mut out = vec![];
    let mut before: Option<poise::serenity_prelude::MessageId> = None;
    while (out.len() as u64) < budget {
        let mut builder = poise::serenity_prelude::GetMessages::new().limit(100);
        if let Some(id) = before {
            builder = builder.before(id);
        }
        let fetched = channel_id.messages(http, builder).await.unwrap_or_default();
        if fetched.is_empty() {
            break;
        }
        before = fetched.last().map(|m| m.id);
        for msg in &fetched {
            if (out.len() as u64) >= budget {
                break;
            }
            out.push(MessageData {
                username: msg.author.name.clone(),
                avatar: msg.author.avatar_url(),
                content: Some(msg.content.clone()),
                embeds: Some(
                    msg.embeds
                        .iter()
                        .filter_map(|e| serde_json::to_value(e).ok())
                        .collect(),
                ),
                files: Some(
                    msg.attachments
                        .iter()
                        .map(|a| MessageFileData {
                            name: a.filename.clone(),
                            attachment: attachment_ref(&a.url),
                        })
                        .collect(),
                ),
                pinned: Some(msg.pinned),
                sent_at: msg.timestamp.to_string(),
            });
        }
        if fetched.len() < 100 {
            break;
        }
    }
    out
}

fn collect_thread(
    thread: &poise::serenity_prelude::GuildChannel,
    messages: Vec<MessageData>,
) -> ThreadChannelData {
    let meta = thread.thread_metadata;
    ThreadChannelData {
        channel_type: u8::from(thread.kind),
        name: thread.name.clone(),
        archived: meta.map(|m| m.archived),
        auto_archive_duration: meta.map(|m| u16::from(m.auto_archive_duration) as u64),
        locked: meta.map(|m| m.locked),
        rate_limit_per_user: thread.rate_limit_per_user.map(|r| r as u64),
        messages,
    }
}

async fn collect_text_channel(
    http: &poise::serenity_prelude::Http,
    guild: &poise::serenity_prelude::Guild,
    channel: &poise::serenity_prelude::GuildChannel,
    threads: &[&poise::serenity_prelude::GuildChannel],
    opts: &CreateOptions,
) -> TextChannelData {
    use poise::serenity_prelude::ChannelType as T;
    let budget = message_limit(opts);
    let mut thread_data = vec![];
    for thread in threads {
        let messages = collect_channel_messages(http, thread.id, budget).await;
        thread_data.push(collect_thread(thread, messages));
    }
    TextChannelData {
        channel_type: u8::from(channel.kind),
        name: channel.name.clone(),
        parent: channel_parent_name(guild, channel.parent_id),
        permissions: collect_permissions(guild, &channel.permission_overwrites),
        nsfw: channel.nsfw,
        topic: channel.topic.clone(),
        // TS sets rateLimitPerUser for GuildText only (undefined for News).
        rate_limit_per_user: if channel.kind == T::Text {
            channel.rate_limit_per_user.map(|r| r as u64)
        } else {
            None
        },
        is_news: channel.kind == T::News,
        messages: collect_channel_messages(http, channel.id, budget).await,
        threads: thread_data,
    }
}

fn collect_voice_channel(
    guild: &poise::serenity_prelude::Guild,
    channel: &poise::serenity_prelude::GuildChannel,
    force_voice_type: bool,
) -> VoiceChannelData {
    VoiceChannelData {
        channel_type: if force_voice_type {
            2
        } else {
            u8::from(channel.kind)
        },
        name: channel.name.clone(),
        parent: channel_parent_name(guild, channel.parent_id),
        permissions: collect_permissions(guild, &channel.permission_overwrites),
        bitrate: channel.bitrate.unwrap_or(64000) as u64,
        // TS forces userLimit 0 for stage channels.
        user_limit: if channel.kind == poise::serenity_prelude::ChannelType::Stage {
            0
        } else {
            channel.user_limit.unwrap_or(0) as u64
        },
    }
}

/// Mirrors getChannels (categories by position, children by position,
/// system channels skipped, active threads grouped under parents).
/// Archived threads have no cached equivalent (documented delta).
pub async fn collect_channels(
    http: &poise::serenity_prelude::Http,
    guild: &poise::serenity_prelude::Guild,
    opts: &CreateOptions,
) -> ChannelsData {
    let mut categories: Vec<&poise::serenity_prelude::GuildChannel> = guild
        .channels
        .values()
        .filter(|c| c.kind == poise::serenity_prelude::ChannelType::Category)
        .collect();
    categories.sort_by_key(|c| c.position);
    let active_threads = guild
        .id
        .get_active_threads(http)
        .await
        .map(|t| t.threads)
        .unwrap_or_default();
    let mut by_parent: std::collections::HashMap<
        poise::serenity_prelude::ChannelId,
        Vec<&poise::serenity_prelude::GuildChannel>,
    > = std::collections::HashMap::new();
    for thread in &active_threads {
        if let Some(parent) = thread.parent_id {
            by_parent.entry(parent).or_default().push(thread);
        }
    }
    let sys = |id: u64| {
        skip_system_channel(
            id,
            guild.rules_channel_id.map(|c| c.get()),
            guild.safety_alerts_channel_id.map(|c| c.get()),
            guild.widget_channel_id.map(|c| c.get()),
            guild.public_updates_channel_id.map(|c| c.get()),
        )
    };
    let mut out = ChannelsData {
        categories: vec![],
        others: vec![],
    };
    for category in categories {
        let mut children: Vec<&poise::serenity_prelude::GuildChannel> = guild
            .channels
            .values()
            .filter(|c| c.parent_id == Some(category.id))
            .collect();
        children.sort_by_key(|c| c.position);
        let mut data = CategoryData {
            name: category.name.clone(),
            permissions: collect_permissions(guild, &category.permission_overwrites),
            children: vec![],
        };
        for child in children {
            if sys(child.id.get()) {
                continue;
            }
            match channel_class(child.kind) {
                "text" => {
                    let empty: Vec<&poise::serenity_prelude::GuildChannel> = vec![];
                    let threads = by_parent
                        .get(&child.id)
                        .map(|v| v.as_slice())
                        .unwrap_or(&empty);
                    data.children.push(GuildChannelData::Text(
                        collect_text_channel(http, guild, child, threads, opts).await,
                    ));
                }
                _ => data
                    .children
                    .push(GuildChannelData::Voice(collect_voice_channel(
                        guild,
                        child,
                        child.kind != poise::serenity_prelude::ChannelType::Voice
                            && child.kind != poise::serenity_prelude::ChannelType::Stage,
                    ))),
            }
        }
        out.categories.push(data);
    }
    let mut others: Vec<&poise::serenity_prelude::GuildChannel> = guild
        .channels
        .values()
        .filter(|c| {
            c.parent_id.is_none()
                && !matches!(
                    c.kind,
                    poise::serenity_prelude::ChannelType::Category
                        | poise::serenity_prelude::ChannelType::NewsThread
                        | poise::serenity_prelude::ChannelType::PublicThread
                        | poise::serenity_prelude::ChannelType::PrivateThread
                )
        })
        .collect();
    others.sort_by_key(|c| c.position);
    for channel in others {
        if sys(channel.id.get()) {
            continue;
        }
        match channel_class(channel.kind) {
            "text" => {
                let empty: Vec<&poise::serenity_prelude::GuildChannel> = vec![];
                let threads = by_parent
                    .get(&channel.id)
                    .map(|v| v.as_slice())
                    .unwrap_or(&empty);
                out.others.push(GuildChannelData::Text(
                    collect_text_channel(http, guild, channel, threads, opts).await,
                ));
            }
            "skip" => {}
            _ => out
                .others
                .push(GuildChannelData::Voice(collect_voice_channel(
                    guild,
                    channel,
                    channel.kind != poise::serenity_prelude::ChannelType::Voice
                        && channel.kind != poise::serenity_prelude::ChannelType::Stage,
                ))),
        }
    }
    out
}

/// Full guild snapshot. Mirrors client.backup.create (basic info, images
/// as base64 when saveImages, members/bans/roles/emojis/channels gated by
/// backupMembers/doNotBackup; every section degrades to its TS default on
/// error instead of failing the backup).
pub async fn collect_backup_data(
    http: &poise::serenity_prelude::Http,
    guild: &poise::serenity_prelude::Guild,
    opts: &CreateOptions,
    backup_id: &str,
    now_ms: i64,
) -> BackupData {
    let mut data = BackupData {
        name: if guild.name.is_empty() {
            "Unknown Server".to_string()
        } else {
            guild.name.clone()
        },
        icon_url: None,
        icon_base64: None,
        verification_level: u8::from(guild.verification_level),
        explicit_content_filter: u8::from(guild.explicit_content_filter),
        default_message_notifications: u8::from(guild.default_message_notifications) as i64,
        afk: None,
        widget: WidgetData {
            enabled: guild.widget_enabled.unwrap_or(false),
            channel: guild
                .widget_channel_id
                .and_then(|id| guild.channels.get(&id).map(|c| c.name.clone())),
        },
        splash_url: None,
        splash_base64: None,
        banner_url: None,
        banner_base64: None,
        channels: ChannelsData {
            categories: vec![],
            others: vec![],
        },
        roles: vec![],
        bans: vec![],
        emojis: vec![],
        members: vec![],
        created_timestamp: now_ms,
        guild_id: guild.id.get().to_string(),
        id: backup_id.to_string(),
    };
    // serenity 0.12 carries AFK as optional metadata (discord.js has
    // direct afkChannel/afkTimeout fields).
    if let Some(afk) = &guild.afk_metadata {
        if let Some(ch) = guild.channels.get(&afk.afk_channel_id) {
            data.afk = Some(AfkData {
                name: ch.name.clone(),
                timeout: u16::from(afk.afk_timeout) as u64,
            });
        }
    }
    // Image URLs are the full CDN links (TS quirk stores the raw hash in
    // the URL fields; the CDN link is load-compatible either way).
    if let Some(url) = guild.icon_url() {
        data.icon_url = Some(url.clone());
        if opts.save_images == Some(true) {
            data.icon_base64 = fetch_image_base64(&url).await;
        }
    }
    if let Some(url) = guild.splash_url() {
        data.splash_url = Some(url.clone());
        if opts.save_images == Some(true) {
            data.splash_base64 = fetch_image_base64(&url).await;
        }
    }
    if let Some(url) = guild.banner_url() {
        data.banner_url = Some(url.clone());
        if opts.save_images == Some(true) {
            data.banner_base64 = fetch_image_base64(&url).await;
        }
    }
    if opts.backup_members == Some(true) {
        data.members = collect_members(guild);
    }
    if should_backup("bans", opts) {
        data.bans = collect_bans(http, guild.id).await;
    }
    if should_backup("roles", opts) {
        data.roles = collect_roles(guild);
    }
    if should_backup("emojis", opts) {
        data.emojis = collect_emojis(guild, opts).await;
    }
    if should_backup("channels", opts) {
        data.channels = collect_channels(http, guild, opts).await;
    }
    data
}

pub fn gen_backup_id() -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    format!("{nanos:016x}")
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "backup",
    rename = "backup",
    subcommands(
        "backup_create",
        "backup_list",
        "backup_load",
        "backup_delete",
        "backup_manage"
    )
)]
pub async fn backup(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "create",
    aliases("bcreate"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn backup_create(
    ctx: Ctx<'_>,
    #[description = "Save messages (yes/no)"] save_messages: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Owner gate. Mirrors !create.ts: the onlyOwner flag defaults to
    // deny, so creation is effectively owner-only either way.
    // Clone out of the cache guard: the guard is not Send across awaits.
    let (is_owner, guild) = match ctx.guild() {
        Some(g) => (g.owner_id.get() == ctx.author().id.get(), Some(g.clone())),
        None => (false, None),
    };
    if !is_owner {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "backup_manage_nique_tes_mort",
                "Access denied. This command is reserved for the server owner.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let Some(guild) = guild else {
        return legacy_config_backup(&ctx, &gid).await;
    };
    // TS !create.ts: save-message "yes" -> 100 msgs/channel, else 0.
    let save_yes = save_messages
        .as_deref()
        .map(|s| s.eq_ignore_ascii_case("yes"))
        .unwrap_or(false);
    let opts = CreateOptions {
        backup_id: None,
        max_messages_per_channel: Some(if save_yes { 100 } else { 0 }),
        json_save: Some(true),
        json_beautify: Some(true),
        do_not_backup: Some(vec![]),
        backup_members: Some(false),
        save_images: Some(true),
    };
    let id = gen_backup_id();
    let data = collect_backup_data(
        ctx.http(),
        &guild,
        &opts,
        &id,
        crate::commands::schedule::main::now_ms(),
    )
    .await;
    let json = serde_json::to_string(&data).unwrap_or_default();
    let infos = BackupInfos {
        id: id.clone(),
        size: backup_size_kb(json.len() as u64),
        data,
    };
    let stored = serde_json::to_string(&infos).unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &format!("{gid}-backups"),
        &backup_key(&id),
        &stored,
    )
    .await?;
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            "backup_command_work_on_creation",
            ":white_check_mark: Backup successfully created.",
        )
        .await,
    )
    .await?;
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            "backup_command_work_info_on_creation",
            "The backup has been created! ID: `${backupData.id}`!",
        )
        .await
        .replace("${backupData.id}", &id),
    )
    .await?;
    Ok(())
}

/// Legacy config-only snapshot (kv dump) when no cached guild is
/// available. Kept so create still works outside the cache path.
async fn legacy_config_backup(ctx: &Ctx<'_>, gid: &str) -> Result<(), anyhow::Error> {
    let rows: Vec<(String, String)> =
        sqlx::query_as::<_, (String, String)>("SELECT key_name, value FROM kv WHERE guild_id = ?")
            .bind(gid)
            .fetch_all(&ctx.data().pool)
            .await
            .unwrap_or_default();
    let id = gen_backup_id();
    let snap = serde_json::json!({
        "guild": gid,
        "at": crate::commands::schedule::main::now_ms(),
        "entries": rows.iter().map(|(k, v)| serde_json::json!({"k": k, "v": v})).collect::<Vec<_>>(),
    })
    .to_string();
    crate::db::kv_set(
        &ctx.data().pool,
        &format!("{gid}-backups"),
        &backup_key(&id),
        &snap,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let n = rows.len();
    ctx.say(
        crate::lang::get(&code, "msg_backup_id_created_keys")
            .map(|s| s.replace("{id}", &id).replace("{count}", &n.to_string()))
            .unwrap_or_else(|| format!("Backup `{id}` created ({n} keys).")),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn backup_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'BACKUP.%'",
    )
    .bind(format!("{gid}-backups"))
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No backups.".to_string()
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "load",
    aliases("restore"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn backup_load(
    ctx: Ctx<'_>,
    #[description = "Backup id"] backup_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(
        &ctx.data().pool,
        &format!("{gid}-backups"),
        &backup_key(backup_id.trim()),
    )
    .await;
    let Some(raw) = raw else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "backup_backup_doesnt_exist")
                .unwrap_or_else(|| "Backup not found.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let snap: serde_json::Value = serde_json::from_str(&raw).unwrap_or(serde_json::Value::Null);
    // Destructive restore needs an explicit yes. Mirrors the
    // promptYesOrNo gate in backup/!load.ts (abort -> backup_not_load).
    let content = crate::commands::lang_for(
        &ctx,
        "backup_load_confirm",
        "EXTREMELY DANGEROUS ACTION. Load this backup?",
    )
    .await
    .replace(
        "${interaction.member.user.toString()}",
        &ctx.author().to_string(),
    );
    let yes = crate::commands::lang_for(&ctx, "var_confirm", "Confirm").await;
    let no = crate::commands::lang_for(&ctx, "embed_btn_cancel", "Cancel").await;
    if !crate::commands::prompt_yes_or_no(&ctx, content, yes, no, true).await? {
        ctx.say(crate::commands::lang_for(&ctx, "backup_not_load", "Backup not loaded.").await)
            .await?;
        return Ok(());
    }
    let entries = snap
        .get("entries")
        .and_then(|e| e.as_array())
        .cloned()
        .unwrap_or_default();
    if entries.is_empty() {
        // Full guild snapshots (BackupInfos) restore Discord objects via
        // U-BACKUP-LOAD recreation (never a kv merge).
        if let Ok(infos) = serde_json::from_value::<BackupInfos>(snap.clone()) {
            let Some(guild_id) = ctx.guild_id() else {
                return Ok(());
            };
            let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
                .await
                .unwrap_or_else(|| "✅".to_string());
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "backup_waiting_on_load",
                    "${client.iHorizon_Emojis.Yes} - Loading...",
                )
                .await
                .replace("${client.iHorizon_Emojis.Yes}", &yes),
            )
            .await?;
            let opts = crate::commands::backup_restore::default_load_options();
            let (roles, channels, emojis, bans) = crate::commands::backup_restore::restore_backup(
                ctx.http(),
                guild_id,
                &infos.data,
                &opts,
            )
            .await;
            ctx.say(format!(
                "Restored {roles} roles, {channels} channels, {emojis} emojis, {bans} bans."
            ))
            .await?;
            return Ok(());
        }
    }
    let mut restored = 0;
    for e in entries {
        if let (Some(k), Some(v)) = (
            e.get("k").and_then(|x| x.as_str()),
            e.get("v").and_then(|x| x.as_str()),
        ) {
            crate::db::kv_set(&ctx.data().pool, &gid, k, v).await?;
            restored += 1;
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_restored_keys")
            .map(|s| s.replace("{restored}", &restored.to_string()))
            .unwrap_or_else(|| format!("Restored {restored} keys.")),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn backup_delete(
    ctx: Ctx<'_>,
    #[description = "Backup id"] backup_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(format!("{gid}-backups"))
        .bind(backup_key(backup_id.trim()))
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "backup_embed_title_succefully_deleted")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| "Backup deleted.".to_string()),
    )
    .await?;
    Ok(())
}

/// Restrict backups to guild owner. Mirrors !manage.ts (onlyOwner).
#[poise::command(slash_command, prefix_command, rename = "manage")]
pub async fn backup_manage(
    ctx: Ctx<'_>,
    #[description = "owner or admin"] scope: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let owner_only = matches!(scope.to_ascii_lowercase().as_str(), "owner");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.BACKUP.onlyOwner",
        if owner_only { "1" } else { "0" },
    )
    .await?;
    ctx.say(if owner_only {
        "Backups restricted to guild owner."
    } else {
        "Backups open to admins."
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn id_is_hex_16() {
        let id = gen_backup_id();
        assert_eq!(id.len(), 16);
        assert!(id.chars().all(|c| c.is_ascii_hexdigit()));
        assert_eq!(backup_key("abc"), "BACKUP.abc");
    }

    #[test]
    fn save_helpers_match_ts() {
        assert_eq!(hex_color(0xFF0000), "#FF0000");
        assert_eq!(hex_color(0), "#000000");
        let all = CreateOptions {
            do_not_backup: Some(vec!["bans".to_string()]),
            ..Default::default()
        };
        assert!(!should_backup("bans", &all));
        assert!(should_backup("roles", &all));
        assert!(should_backup("bans", &CreateOptions::default()));
        assert_eq!(message_limit(&CreateOptions::default()), 10);
        assert_eq!(
            message_limit(&CreateOptions {
                max_messages_per_channel: Some(100),
                ..Default::default()
            }),
            100
        );
        assert!(skip_system_channel(5, Some(5), None, None, None));
        assert!(!skip_system_channel(6, Some(5), None, None, None));
        // The dead TS image condition means attachments stay URLs.
        assert_eq!(attachment_ref("https://x/y.png"), "https://x/y.png");
        // KB with 2 decimals, like Number((size/1024).toFixed(2)).
        assert_eq!(backup_size_kb(1024), 1.0);
        assert_eq!(backup_size_kb(1536), 1.5);
        assert_eq!(backup_size_kb(1000), 0.98);
        use poise::serenity_prelude::ChannelType as T;
        assert_eq!(channel_class(T::Text), "text");
        assert_eq!(channel_class(T::News), "text");
        assert_eq!(channel_class(T::Forum), "text");
        assert_eq!(channel_class(T::Stage), "stage");
        assert_eq!(channel_class(T::Voice), "voice");
        assert_eq!(channel_class(T::Category), "skip");
        assert_eq!(channel_class(T::PublicThread), "skip");
    }

    #[test]
    fn saved_snapshot_parses_as_backup_infos() {
        // What create stores must load-recognize as a full snapshot
        // (not a zero-entry legacy kv dump).
        let infos = BackupInfos {
            id: "abc".to_string(),
            size: 1.5,
            data: BackupData {
                name: "g".to_string(),
                icon_url: None,
                icon_base64: None,
                verification_level: 0,
                explicit_content_filter: 0,
                default_message_notifications: 0,
                afk: None,
                widget: WidgetData {
                    enabled: false,
                    channel: None,
                },
                splash_url: None,
                splash_base64: None,
                banner_url: None,
                banner_base64: None,
                channels: ChannelsData {
                    categories: vec![],
                    others: vec![],
                },
                roles: vec![],
                bans: vec![],
                emojis: vec![],
                members: vec![],
                created_timestamp: 0,
                guild_id: "7".to_string(),
                id: "abc".to_string(),
            },
        };
        let stored = serde_json::to_string(&infos).unwrap();
        let snap: serde_json::Value = serde_json::from_str(&stored).unwrap();
        assert!(snap.get("entries").is_none());
        let back: BackupInfos = serde_json::from_value(snap).unwrap();
        assert_eq!(back.data.guild_id, "7");
    }
}

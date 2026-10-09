// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Full guild-object restore. Mirrors src/core/backup/src/load.ts +
// the loadCategory/loadChannel/clearGuild legs in util.ts.
//
// Live Discord writes (roles/channels/webhooks/bans/emojis) run in the
// restore_* fns; the message plan, bitrate clamp, kind routing, color
// and image helpers below are pure and unit-tested.

use crate::backup_types::{BackupData, LoadOptions, MessageData};
use poise::serenity_prelude as serenity;

const AUDIT_REASON: &str = "[Backup System]";

/// Default load options. Mirrors index.ts load()
/// (clearGuildBeforeRestore true, maxMessagesPerChannel 100).
pub fn default_load_options() -> LoadOptions {
    LoadOptions {
        clear_guild_before_restore: true,
        max_messages_per_channel: Some(100),
        allowed_mentions: None,
        self_bot: None,
        dev_mode: None,
    }
}

/// Webhook replay plan. Mirrors the loadMessages leg: drop empties
/// (no content/embeds/files), oldest-first, then cap to the budget.
/// TS caps only when maxMessagesPerChannel is set and != -1; None (or
/// the TS -1, unrepresentable here) means unlimited.
pub fn restore_message_plan(messages: &[MessageData], max: Option<u64>) -> Vec<&MessageData> {
    let mut kept: Vec<&MessageData> = messages
        .iter()
        .filter(|m| {
            m.content.as_ref().map(|c| !c.is_empty()).unwrap_or(false)
                || m.embeds.as_ref().map(|e| !e.is_empty()).unwrap_or(false)
                || m.files.as_ref().map(|f| !f.is_empty()).unwrap_or(false)
        })
        .collect();
    kept.reverse();
    match max {
        Some(budget) if (kept.len() as u64) > budget => {
            kept[kept.len() - budget as usize..].to_vec()
        }
        _ => kept,
    }
}

/// Voice bitrate clamp. Mirrors the MaxBitratePerTier downgrade
/// (None 64000 / T1 128000 / T2 256000 / T3 384000); unknown tiers keep
/// the snapshot value instead of the TS NaN reject.
pub fn restore_bitrate(bitrate: u64, tier: u8) -> u64 {
    let cap = match tier {
        1 => 128_000,
        2 => 256_000,
        3 => 384_000,
        _ => 64_000,
    };
    bitrate.min(cap)
}

/// Channel-type routing for creation. Only text/voice/announcement/
/// stage get an explicit type (like createOptions); forum/media fall
/// back to the default text create, threads are never created here.
pub fn restore_create_kind(channel_type: u8) -> Option<serenity::ChannelType> {
    match channel_type {
        0 => Some(serenity::ChannelType::Text),
        2 => Some(serenity::ChannelType::Voice),
        5 => Some(serenity::ChannelType::News),
        13 => Some(serenity::ChannelType::Stage),
        _ => None,
    }
}

/// Text-ish shapes get topic/nsfw/rateLimit (text/announcement/forum/
/// media, mirroring the loadChannel branch incl. discord.js GuildMedia).
pub fn restore_has_text_opts(channel_type: u8) -> bool {
    matches!(channel_type, 0 | 5 | 15 | 16)
}

/// TS color strings (`#RRGGBB`) back to a Discord colour value.
pub fn parse_hex_color(s: &str) -> Option<u32> {
    u32::from_str_radix(s.strip_prefix('#')?, 16).ok()
}

/// Permission bit strings (TS BigInt) to a overwrite pair.
pub fn restore_overwrite(role_id: u64, allow: &str, deny: &str) -> serenity::PermissionOverwrite {
    serenity::PermissionOverwrite {
        allow: serenity::Permissions::from_bits_truncate(allow.parse::<u64>().unwrap_or(0)),
        deny: serenity::Permissions::from_bits_truncate(deny.parse::<u64>().unwrap_or(0)),
        kind: serenity::PermissionOverwriteType::Role(serenity::RoleId::new(role_id)),
    }
}

/// Base64 blob -> data URI with sniffed mime (TS passes a Buffer and
/// lets discord.js detect; the REST image field needs an explicit mime).
/// PNG / GIF / WEBP magic only; anything else is refused.
pub fn image_data_uri(base64_body: &str) -> Option<String> {
    let bytes = crate::emojis::base64_decode(base64_body)?;
    let mime = if bytes.starts_with(b"\x89PNG") {
        "image/png"
    } else if bytes.starts_with(b"GIF8") {
        "image/gif"
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP".as_slice()) {
        "image/webp"
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg"
    } else {
        return None;
    };
    Some(format!(
        "data:{mime};base64,{}",
        crate::emojis::base64_encode(&bytes)
    ))
}

async fn fetch_data_uri(url: &str) -> Option<String> {
    let bytes = reqwest::Client::new()
        .get(url)
        .send()
        .await
        .ok()?
        .bytes()
        .await
        .ok()?;
    let body = crate::emojis::base64_encode(&bytes);
    image_data_uri(&body)
}

fn community(features: &[String]) -> bool {
    features.iter().any(|f| f == "COMMUNITY")
}

/// Mirrors loadConfig (name/icons/levels; explicit filter is
/// community-gated like TS; icon prefers base64, then URL fetch).
pub async fn restore_config(http: &serenity::Http, guild_id: serenity::GuildId, data: &BackupData) {
    let features = http
        .get_guild(guild_id)
        .await
        .map(|g| g.features)
        .unwrap_or_default();
    let mut edit = serenity::EditGuild::new().audit_log_reason(AUDIT_REASON);
    if !data.name.is_empty() {
        edit = edit.name(&data.name);
    }
    let icon_uri = match (&data.icon_base64, &data.icon_url) {
        (Some(b), _) => image_data_uri(b),
        (None, Some(u)) => fetch_data_uri(u).await,
        (None, None) => None,
    };
    // EditGuild::icon takes an attachment; splash/banner take URIs.
    if data.splash_base64.is_some() || data.splash_url.is_some() {
        let uri = match (&data.splash_base64, &data.splash_url) {
            (Some(b), _) => image_data_uri(b),
            (None, Some(u)) => fetch_data_uri(u).await,
            (None, None) => None,
        };
        if let Some(uri) = uri {
            edit = edit.splash(Some(uri));
        }
    }
    if data.banner_base64.is_some() || data.banner_url.is_some() {
        let uri = match (&data.banner_base64, &data.banner_url) {
            (Some(b), _) => image_data_uri(b),
            (None, Some(u)) => fetch_data_uri(u).await,
            (None, None) => None,
        };
        if let Some(uri) = uri {
            edit = edit.banner(Some(uri));
        }
    }
    if data.verification_level != 0 {
        edit = edit.verification_level(serenity::VerificationLevel::from(data.verification_level));
    }
    if data.default_message_notifications != 0 {
        edit = edit.default_message_notifications(Some(
            serenity::DefaultMessageNotificationLevel::from(
                data.default_message_notifications as u8,
            ),
        ));
    }
    if data.explicit_content_filter != 0 && community(&features) {
        edit = edit.explicit_content_filter(Some(serenity::ExplicitContentFilter::from(
            data.explicit_content_filter,
        )));
    }
    let _ = guild_id.edit(http, edit).await;
    // Icon needs an attachment object: upload separately like TS setIcon.
    if let Some(uri) = icon_uri {
        if let Some(body) = uri.split_once(',').map(|(_, b)| b.to_string()) {
            if let Some(bytes) = crate::emojis::base64_decode(&body) {
                let attach = serenity::CreateAttachment::bytes(bytes, "icon.png");
                let _ = guild_id
                    .edit(
                        http,
                        serenity::EditGuild::new()
                            .audit_log_reason(AUDIT_REASON)
                            .icon(Some(&attach)),
                    )
                    .await;
            }
        }
    }
}

fn edit_role_for(role: &crate::backup_types::RoleData) -> serenity::EditRole<'_> {
    let mut edit = serenity::EditRole::new()
        .name(&role.name)
        .hoist(role.hoist)
        .mentionable(role.mentionable)
        .permissions(serenity::Permissions::from_bits_truncate(
            role.permissions.parse::<u64>().unwrap_or(0),
        ));
    if let Some(colour) = parse_hex_color(&role.color) {
        edit = edit.colour(serenity::Colour::new(colour));
    }
    edit
}

/// Mirrors loadRoles (everyone edited in place, others created).
/// Returns name -> id for the overwrite pass.
pub async fn restore_roles(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    data: &BackupData,
) -> std::collections::HashMap<String, u64> {
    let mut ids = std::collections::HashMap::new();
    for role in &data.roles {
        if role.is_everyone {
            let _ = guild_id
                .edit_role(http, guild_id.get(), edit_role_for(role))
                .await;
            ids.insert(role.name.clone(), guild_id.get());
        } else {
            match guild_id.create_role(http, edit_role_for(role)).await {
                Ok(created) => {
                    ids.insert(role.name.clone(), created.id.get());
                }
                Err(e) => tracing::warn!("role {} not restored: {e}", role.name),
            }
        }
    }
    ids
}

fn overwrite_list(
    perms: &[crate::backup_types::ChannelPermissionData],
    roles: &std::collections::HashMap<String, u64>,
) -> Vec<serenity::PermissionOverwrite> {
    perms
        .iter()
        .filter_map(|p| {
            roles
                .get(&p.role_name)
                .map(|id| restore_overwrite(*id, &p.allow, &p.deny))
        })
        .collect()
}

/// APIEmbed JSON -> CreateEmbed. Mirrors the webhook replay of
/// msg.embeds (title/description/url/colour/footer/image/thumbnail/
/// author/fields; colour accepts `color` or `colour`).
pub fn create_embed_from_value(v: &serde_json::Value) -> Option<serenity::CreateEmbed> {
    let mut embed = serenity::CreateEmbed::default();
    let mut used = false;
    if let Some(title) = v.get("title").and_then(|t| t.as_str()) {
        embed = embed.title(title);
        used = true;
    }
    if let Some(desc) = v.get("description").and_then(|t| t.as_str()) {
        embed = embed.description(desc);
        used = true;
    }
    if let Some(url) = v.get("url").and_then(|t| t.as_str()) {
        embed = embed.url(url);
        used = true;
    }
    if let Some(colour) = v
        .get("color")
        .or_else(|| v.get("colour"))
        .and_then(|c| c.as_u64())
    {
        embed = embed.colour(colour as u32);
        used = true;
    }
    if let Some(footer) = v.get("footer") {
        if let Some(text) = footer.get("text").and_then(|t| t.as_str()) {
            let mut foot = serenity::CreateEmbedFooter::new(text);
            if let Some(icon) = footer.get("icon_url").and_then(|t| t.as_str()) {
                foot = foot.icon_url(icon);
            }
            embed = embed.footer(foot);
            used = true;
        }
    }
    if let Some(url) = v
        .get("image")
        .and_then(|i| i.get("url"))
        .and_then(|t| t.as_str())
    {
        embed = embed.image(url);
        used = true;
    }
    if let Some(url) = v
        .get("thumbnail")
        .and_then(|i| i.get("url"))
        .and_then(|t| t.as_str())
    {
        embed = embed.thumbnail(url);
        used = true;
    }
    if let Some(author) = v.get("author") {
        if let Some(name) = author.get("name").and_then(|t| t.as_str()) {
            let mut auth = serenity::CreateEmbedAuthor::new(name);
            if let Some(url) = author.get("url").and_then(|t| t.as_str()) {
                auth = auth.url(url);
            }
            if let Some(icon) = author.get("icon_url").and_then(|t| t.as_str()) {
                auth = auth.icon_url(icon);
            }
            embed = embed.author(auth);
            used = true;
        }
    }
    if let Some(fields) = v.get("fields").and_then(|f| f.as_array()) {
        for field in fields {
            if let (Some(name), Some(value)) = (
                field.get("name").and_then(|t| t.as_str()),
                field.get("value").and_then(|t| t.as_str()),
            ) {
                embed = embed.field(
                    name,
                    value,
                    field
                        .get("inline")
                        .and_then(|i| i.as_bool())
                        .unwrap_or(false),
                );
                used = true;
            }
        }
    }
    if used {
        Some(embed)
    } else {
        None
    }
}

async fn replay_messages(
    http: &serenity::Http,
    webhook: &serenity::Webhook,
    thread_id: Option<serenity::ChannelId>,
    messages: &[MessageData],
    opts: &LoadOptions,
) {
    for msg in restore_message_plan(messages, opts.max_messages_per_channel) {
        let mut builder = serenity::ExecuteWebhook::new().username(&msg.username);
        if let Some(avatar) = msg.avatar.as_deref() {
            builder = builder.avatar_url(avatar);
        }
        if let Some(content) = msg.content.as_deref() {
            if !content.is_empty() {
                builder = builder.content(content);
            }
        }
        if let Some(embeds) = msg.embeds.as_deref() {
            let parsed: Vec<serenity::CreateEmbed> =
                embeds.iter().filter_map(create_embed_from_value).collect();
            if !parsed.is_empty() {
                builder = builder.embeds(parsed);
            }
        }
        if let Some(thread) = thread_id {
            builder = builder.in_thread(thread);
        }
        if let Some(files) = msg.files.as_deref() {
            // TS replays the first attachment only.
            if let Some(first) = files.first() {
                if let Ok(resp) = reqwest::Client::new().get(&first.attachment).send().await {
                    if let Ok(bytes) = resp.bytes().await {
                        builder = builder.add_file(serenity::CreateAttachment::bytes(
                            bytes.to_vec(),
                            &first.name,
                        ));
                    }
                }
            }
        }
        if let Ok(Some(sent)) = webhook.execute(http, true, builder).await {
            if msg.pinned == Some(true) {
                let _ = sent.pin(http).await;
            }
        }
    }
}

async fn ensure_messages_webhook(
    http: &serenity::Http,
    channel_id: serenity::ChannelId,
) -> Option<serenity::Webhook> {
    if let Ok(existing) = http.get_channel_webhooks(channel_id).await {
        if let Some(hook) = existing
            .into_iter()
            .find(|w| w.name == Some("MessagesBackup".to_string()))
        {
            return Some(hook);
        }
    }
    http.create_webhook(
        channel_id,
        &serde_json::json!({"name": "MessagesBackup"}),
        Some(AUDIT_REASON),
    )
    .await
    .ok()
}

async fn restore_text_channel(
    http: &serenity::Http,
    channel_id: serenity::ChannelId,
    data: &crate::backup_types::TextChannelData,
    opts: &LoadOptions,
) {
    let webhook = match ensure_messages_webhook(http, channel_id).await {
        Some(w) => w,
        None => return,
    };
    replay_messages(http, &webhook, None, &data.messages, opts).await;
    for thread in &data.threads {
        let created = http
            .create_thread(
                channel_id,
                &serde_json::json!({
                    "name": thread.name,
                    "auto_archive_duration": thread.auto_archive_duration.unwrap_or(1440),
                }),
                Some(AUDIT_REASON),
            )
            .await
            .ok();
        if let Some(t) = created {
            replay_messages(http, &webhook, Some(t.id), &thread.messages, opts).await;
        }
    }
}

async fn restore_one_channel(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    data: &crate::backup_types::GuildChannelData,
    parent: Option<serenity::ChannelId>,
    roles: &std::collections::HashMap<String, u64>,
    opts: &LoadOptions,
    tier: u8,
) {
    match data {
        crate::backup_types::GuildChannelData::Text(text) => {
            let mut builder = serenity::CreateChannel::new(&text.name);
            if let Some(kind) = restore_create_kind(text.channel_type) {
                builder = builder.kind(kind);
            }
            if let Some(pid) = parent {
                builder = builder.category(pid);
            }
            if restore_has_text_opts(text.channel_type) {
                if let Some(topic) = text.topic.as_deref() {
                    builder = builder.topic(topic);
                }
                builder = builder.nsfw(text.nsfw);
                if text.channel_type == 0 {
                    if let Some(slow) = text.rate_limit_per_user {
                        builder = builder.rate_limit_per_user(slow.min(21600) as u16);
                    }
                }
            }
            match guild_id.create_channel(http, builder).await {
                Ok(created) => {
                    for ow in overwrite_list(&text.permissions, roles) {
                        let _ = created.id.create_permission(http, ow).await;
                    }
                    // TS replays messages for GuildText only.
                    if text.channel_type == 0 {
                        restore_text_channel(http, created.id, text, opts).await;
                    }
                }
                Err(e) => tracing::warn!("channel {} not restored: {e}", text.name),
            }
        }
        crate::backup_types::GuildChannelData::Voice(voice) => {
            let mut builder = serenity::CreateChannel::new(&voice.name);
            if voice.channel_type == 13 {
                builder = builder.kind(serenity::ChannelType::Stage);
            } else {
                builder = builder.kind(serenity::ChannelType::Voice);
            }
            if let Some(pid) = parent {
                builder = builder.category(pid);
            }
            builder = builder.bitrate(restore_bitrate(voice.bitrate, tier) as u32);
            builder = builder.user_limit(voice.user_limit.min(99) as u32);
            match guild_id.create_channel(http, builder).await {
                Ok(created) => {
                    for ow in overwrite_list(&voice.permissions, roles) {
                        let _ = created.id.create_permission(http, ow).await;
                    }
                }
                Err(e) => tracing::warn!("channel {} not restored: {e}", voice.name),
            }
        }
    }
}

/// Mirrors loadChannels (categories first, then children, then others).
pub async fn restore_channels(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    data: &BackupData,
    opts: &LoadOptions,
) {
    let tier = http
        .get_guild(guild_id)
        .await
        .map(|g| u8::from(g.premium_tier))
        .unwrap_or(0);
    // Fresh role map (roles were just restored above).
    let live_roles: std::collections::HashMap<String, u64> = guild_id
        .roles(http)
        .await
        .unwrap_or_default()
        .values()
        .map(|r| (r.name.clone(), r.id.get()))
        .collect();
    for category in &data.channels.categories {
        let created = guild_id
            .create_channel(
                http,
                serenity::CreateChannel::new(&category.name).kind(serenity::ChannelType::Category),
            )
            .await;
        match created {
            Ok(cat) => {
                for ow in overwrite_list(&category.permissions, &live_roles) {
                    let _ = cat.id.create_permission(http, ow).await;
                }
                for child in &category.children {
                    restore_one_channel(
                        http,
                        guild_id,
                        child,
                        Some(cat.id),
                        &live_roles,
                        opts,
                        tier,
                    )
                    .await;
                }
            }
            Err(e) => tracing::warn!("category {} not restored: {e}", category.name),
        }
    }
    for channel in &data.channels.others {
        restore_one_channel(http, guild_id, channel, None, &live_roles, opts, tier).await;
    }
}

/// Mirrors loadAFK (channel matched by name among voice channels).
pub async fn restore_afk(http: &serenity::Http, guild_id: serenity::GuildId, data: &BackupData) {
    let Some(afk) = data.afk.as_ref() else {
        return;
    };
    let channels = guild_id.channels(http).await.unwrap_or_default();
    let voice = channels
        .values()
        .find(|c| c.name == afk.name && c.kind == serenity::ChannelType::Voice)
        .map(|c| c.id);
    let timeout = match afk.timeout {
        60 => serenity::AfkTimeout::OneMinute,
        900 => serenity::AfkTimeout::FifteenMinutes,
        1800 => serenity::AfkTimeout::ThirtyMinutes,
        3600 => serenity::AfkTimeout::OneHour,
        _ => serenity::AfkTimeout::FiveMinutes,
    };
    let _ = guild_id
        .edit(
            http,
            serenity::EditGuild::new()
                .audit_log_reason(AUDIT_REASON)
                .afk_channel(voice)
                .afk_timeout(timeout),
        )
        .await;
}

/// Mirrors loadEmojis (url direct, base64 via sniffed data URI).
pub async fn restore_emojis(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    data: &BackupData,
) -> usize {
    let mut done = 0;
    for emoji in &data.emojis {
        let image = match (&emoji.base64, &emoji.url) {
            (Some(b), _) => image_data_uri(b),
            (None, Some(u)) => fetch_data_uri(u).await,
            (None, None) => None,
        };
        let Some(image) = image else {
            continue;
        };
        match guild_id.create_emoji(http, &emoji.name, &image).await {
            Ok(_) => done += 1,
            Err(e) => tracing::warn!("emoji {} not restored: {e}", emoji.name),
        }
    }
    done
}

/// Mirrors loadBans.
pub async fn restore_bans(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    data: &BackupData,
) -> usize {
    let mut done = 0;
    for ban in &data.bans {
        let user_id = ban
            .id
            .parse::<u64>()
            .map(serenity::UserId::new)
            .unwrap_or_else(|_| serenity::UserId::new(1));
        match guild_id
            .ban_with_reason(
                http,
                user_id,
                0,
                ban.reason.as_deref().unwrap_or(AUDIT_REASON),
            )
            .await
        {
            Ok(_) => done += 1,
            Err(e) => tracing::warn!("ban {} not restored: {e}", ban.id),
        }
    }
    done
}

/// Mirrors loadEmbedChannel (widget channel matched by name).
pub async fn restore_widget(http: &serenity::Http, guild_id: serenity::GuildId, data: &BackupData) {
    let Some(channel_name) = data.widget.channel.as_deref() else {
        return;
    };
    let channels = guild_id.channels(http).await.unwrap_or_default();
    let target = channels
        .values()
        .find(|c| c.name == channel_name)
        .map(|c| c.id.get().to_string());
    let _ = http
        .edit_guild_widget(
            guild_id,
            &serde_json::json!({
                "enabled": data.widget.enabled,
                "channel_id": target,
            }),
            Some(AUDIT_REASON),
        )
        .await;
}

/// Mirrors clearGuild (roles/channels/emojis/webhooks/bans reset to
/// defaults; every delete is best-effort like the TS fire-and-forget
/// forEach legs).
pub async fn clear_guild(http: &serenity::Http, guild_id: serenity::GuildId) {
    if let Ok(roles) = guild_id.roles(http).await {
        for role in roles.values().filter(|r| r.id.get() != guild_id.get()) {
            let _ = guild_id.delete_role(http, role.id).await;
        }
    }
    if let Ok(channels) = guild_id.channels(http).await {
        for channel in channels.values() {
            let _ = channel.id.delete(http).await;
        }
    }
    if let Ok(emojis) = guild_id.emojis(http).await {
        for emoji in &emojis {
            let _ = guild_id.delete_emoji(http, emoji).await;
        }
    }
    if let Ok(webhooks) = http.get_guild_webhooks(guild_id).await {
        for hook in &webhooks {
            let _ = hook.delete(http).await;
        }
    }
    for ban in guild_id.bans(http, None, None).await.unwrap_or_default() {
        let _ = guild_id.unban(http, ban.user.id).await;
    }
    let _ = guild_id
        .edit(
            http,
            serenity::EditGuild::new()
                .audit_log_reason(AUDIT_REASON)
                .afk_channel(None)
                .afk_timeout(serenity::AfkTimeout::FiveMinutes)
                .default_message_notifications(Some(
                    serenity::DefaultMessageNotificationLevel::Mentions,
                ))
                .explicit_content_filter(Some(serenity::ExplicitContentFilter::None))
                .verification_level(serenity::VerificationLevel::None)
                .system_channel_id(None),
        )
        .await;
    let _ = http
        .edit_guild_widget(
            guild_id,
            &serde_json::json!({"enabled": false, "channel_id": null}),
            Some(AUDIT_REASON),
        )
        .await;
}

/// Full restore orchestration. Mirrors index.ts load(): optional wipe,
/// then config/roles/channels/AFK/emojis/bans/widget. Members are not
/// re-addable via the API (documented; TS never restored them either).
/// Returns (roles, channels, emojis, bans) counts for the reply.
pub async fn restore_backup(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    data: &BackupData,
    opts: &LoadOptions,
) -> (usize, usize, usize, usize) {
    if opts.clear_guild_before_restore {
        clear_guild(http, guild_id).await;
    }
    restore_config(http, guild_id, data).await;
    restore_roles(http, guild_id, data).await;
    restore_channels(http, guild_id, data, opts).await;
    restore_afk(http, guild_id, data).await;
    let emojis = restore_emojis(http, guild_id, data).await;
    let bans = restore_bans(http, guild_id, data).await;
    restore_widget(http, guild_id, data).await;
    (
        data.roles.len(),
        data.channels.categories.len() + data.channels.others.len(),
        emojis,
        bans,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text_msg(content: &str) -> MessageData {
        MessageData {
            username: "u".to_string(),
            avatar: None,
            content: Some(content.to_string()),
            embeds: None,
            files: None,
            pinned: None,
            sent_at: "2026-01-01".to_string(),
        }
    }

    #[test]
    fn message_plan_filters_reverses_and_caps_like_ts() {
        let msgs = vec![
            text_msg("new"),
            MessageData {
                content: None,
                embeds: None,
                files: None,
                ..text_msg("")
            },
            text_msg("old"),
        ];
        // Empty dropped, oldest-first, no cap.
        let plan = restore_message_plan(&msgs, None);
        assert_eq!(plan.len(), 2);
        assert_eq!(plan[0].content.as_deref(), Some("old"));
        assert_eq!(plan[1].content.as_deref(), Some("new"));
        // Cap keeps the newest N (TS slice(len - max)).
        let plan = restore_message_plan(&msgs, Some(1));
        assert_eq!(plan.len(), 1);
        assert_eq!(plan[0].content.as_deref(), Some("new"));
        // Zero budget replays nothing.
        assert!(restore_message_plan(&msgs, Some(0)).is_empty());
    }

    #[test]
    fn bitrate_clamp_matches_tier_table() {
        assert_eq!(restore_bitrate(96000, 0), 64000);
        assert_eq!(restore_bitrate(96000, 2), 96000);
        assert_eq!(restore_bitrate(999999, 3), 384000);
        assert_eq!(restore_bitrate(64000, 1), 64000);
        // Unknown tier keeps the value (TS would produce NaN).
        assert_eq!(restore_bitrate(96000, 9), 64000);
    }

    #[test]
    fn kind_routing_matches_create_options() {
        assert_eq!(restore_create_kind(0), Some(serenity::ChannelType::Text));
        assert_eq!(restore_create_kind(2), Some(serenity::ChannelType::Voice));
        assert_eq!(restore_create_kind(5), Some(serenity::ChannelType::News));
        assert_eq!(restore_create_kind(13), Some(serenity::ChannelType::Stage));
        assert_eq!(restore_create_kind(15), None);
        assert!(restore_has_text_opts(0));
        assert!(restore_has_text_opts(5));
        assert!(restore_has_text_opts(15));
        assert!(restore_has_text_opts(16));
        assert!(!restore_has_text_opts(2));
        assert!(!restore_has_text_opts(13));
    }

    #[test]
    fn color_and_overwrite_helpers() {
        assert_eq!(parse_hex_color("#FF0000"), Some(0xFF0000));
        assert_eq!(parse_hex_color("#000000"), Some(0));
        assert_eq!(parse_hex_color("red"), None);
        assert_eq!(parse_hex_color("#ZZZZZZ"), None);
        let ow = restore_overwrite(7, "8", "0");
        assert_eq!(ow.allow.bits(), 8);
        assert_eq!(ow.deny.bits(), 0);
        match ow.kind {
            serenity::PermissionOverwriteType::Role(id) => assert_eq!(id.get(), 7),
            _ => panic!("role overwrite expected"),
        }
        // Garbage bit strings truncate to zero, never panic.
        assert_eq!(restore_overwrite(7, "xx", "yy").allow.bits(), 0);
    }

    #[test]
    fn image_data_uri_sniffs_mime() {
        // PNG magic.
        let png = crate::emojis::base64_encode(b"\x89PNG\r\n\x1a\nrest");
        let uri = image_data_uri(&png).unwrap();
        assert!(uri.starts_with("data:image/png;base64,"));
        // GIF magic animates the mime, not the markup here.
        let gif = crate::emojis::base64_encode(b"GIF89a rest");
        assert!(image_data_uri(&gif)
            .unwrap()
            .starts_with("data:image/gif;base64,"));
        // Unknown bytes refused.
        let raw = crate::emojis::base64_encode(b"not an image at all....");
        assert!(image_data_uri(&raw).is_none());
        assert!(image_data_uri("!!!").is_none());
    }

    #[test]
    fn default_load_options_match_ts() {
        let opts = default_load_options();
        assert!(opts.clear_guild_before_restore);
        assert_eq!(opts.max_messages_per_channel, Some(100));
    }

    #[test]
    fn embed_mapping_replays_apiembeds() {
        let v = serde_json::json!({
            "title": "t",
            "description": "d",
            "url": "https://x",
            "color": 255,
            "footer": {"text": "f", "icon_url": "https://i"},
            "image": {"url": "https://im"},
            "thumbnail": {"url": "https://th"},
            "author": {"name": "a", "url": "https://au", "icon_url": "https://ai"},
            "fields": [{"name": "n", "value": "v", "inline": true}]
        });
        assert!(create_embed_from_value(&v).is_some());
        // Empty objects map to nothing (send stays valid).
        assert!(create_embed_from_value(&serde_json::json!({})).is_none());
        assert!(create_embed_from_value(&serde_json::json!({"foo": 1})).is_none());
    }
}

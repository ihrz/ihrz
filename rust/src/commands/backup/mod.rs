// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/backup/* via src/core/backup/*.
//
// TS stores full guild snapshots (roles/channels/messages/threads/emojis)
// in metasTable BACKUPS.<user>.<id> + files. The Rust port snapshots the
// bot-side kv state per guild (config backup) with the same command shape:
// create/list/load/delete. Full Discord-object restore is pending.

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

/// Message fetch budget. TS `fetchChannelMessages` (util.ts:176) uses
/// `isNaN(maxMessagesPerChannel) ? 10 : max`; JSON has no NaN, so the
/// Rust `Option<u64>` None leg covers both TS undefined and NaN with
/// the same stored result (10). Documented, no behavior change.
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

/// Mention-clean message text. Mirrors discord.js `cleanContent`
/// (util.ts:222 stores `msg.cleanContent`, not the raw content):
/// user/channel/role mentions render as readable `@name`/`#name`.
/// Nicknames are not resolved (cache-only snapshot); usernames stand in.
pub fn clean_content(
    msg: &poise::serenity_prelude::Message,
    guild: &poise::serenity_prelude::Guild,
) -> String {
    let mut out = msg.content.clone();
    for user in &msg.mentions {
        let plain = format!("@{}", user.name);
        out = out.replace(&format!("<@{}>", user.id.get()), &plain);
        out = out.replace(&format!("<@!{}>", user.id.get()), &plain);
    }
    for id in &msg.mention_roles {
        if let Some(role) = guild.roles.get(id) {
            out = out.replace(&format!("<@&{}>", id.get()), &format!("@{}", role.name));
        }
    }
    for ch in &msg.mention_channels {
        out = out.replace(&format!("<#{}>", ch.id.get()), &format!("#{}", ch.name));
    }
    for (id, channel) in &guild.channels {
        out = out.replace(&format!("<#{}>", id.get()), &format!("#{}", channel.name));
    }
    out
}

/// Paged message fetch, newest-first like channel.messages.fetch.
/// Stops at the budget (TS breaks when messages.length >= messageCount).
pub async fn collect_channel_messages(
    http: &poise::serenity_prelude::Http,
    guild: &poise::serenity_prelude::Guild,
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
                // Always a URL string like displayAvatarURL(): the
                // default avatar when the user has none (util.ts:221).
                avatar: Some(
                    msg.author
                        .avatar_url()
                        .unwrap_or_else(|| msg.author.default_avatar_url()),
                ),
                // cleanContent, not raw content (util.ts:222).
                content: Some(clean_content(msg, guild)),
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
                // Timestamp Display is RFC 3339 (ISO), like
                // msg.createdAt.toISOString() (util.ts:226).
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
        let messages = collect_channel_messages(http, guild, thread.id, budget).await;
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
        messages: collect_channel_messages(http, guild, channel.id, budget).await,
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
/// system channels skipped, threads grouped under parents).
/// Thread-source delta (documented, kept): TS walks the cached
/// `channel.threads.cache` (util.ts:264, includes cached archived
/// threads), while the port groups `get_active_threads` results by
/// parent. Archived threads have no cached equivalent in serenity, so
/// they are absent from snapshots either way here.
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

/// Legacy config-only snapshot (kv dump) when no cached guild is
/// available. Kept deliberately (not a TS path): create must still
/// answer outside the guild-cache path instead of erroring, and load
/// already knows how to restore these `{entries}` dumps.
async fn legacy_config_backup(ctx: &Ctx<'_>, gid: &str) -> Result<(), anyhow::Error> {
    let rows: Vec<(String, String)> = crate::db::kv_scan(&ctx.data().pool, gid).await;
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

#[allow(clippy::module_inception)]
pub mod backup;
pub mod create;
pub mod delete;
pub mod list;
pub mod load;
pub mod manage;

/// Old registry path (`backup::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::backup::*;
    pub use super::create::*;
    pub use super::delete::*;
    pub use super::list::*;
    pub use super::load::*;
    pub use super::manage::*;
    pub use super::*;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clean_content_renders_mentions_like_ts() {
        use poise::serenity_prelude as serenity;
        let mut guild = serenity::Guild::default();
        let mut role = serenity::Role::default();
        role.name = "Mods".to_string();
        guild.roles.insert(serenity::RoleId::new(7), role);
        let mut msg = serenity::Message::default();
        msg.content = "hi <@123> and <@!123> <@&7> <#9>".to_string();
        let mut user = serenity::User::default();
        user.id = serenity::UserId::new(123);
        user.name = "Kisa".to_string();
        msg.mentions = vec![user];
        msg.mention_roles = vec![serenity::RoleId::new(7)];
        assert_eq!(clean_content(&msg, &guild), "hi @Kisa and @Kisa @Mods <#9>");
    }

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

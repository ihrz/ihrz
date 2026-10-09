// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/backup/src/types/*.ts (discord-backup fork schemas).
//
// All structs use camelCase JSON so blobs stay byte-compatible with the
// TypeScript writer/reader: discord.js serializes numeric enums
// (ChannelType, VerificationLevel, ...) as numbers, `SEND` optionals as
// missing-or-null. Every Option field carries `#[serde(default)]` so a
// missing TS key deserializes instead of failing the whole backup.

use serde::{Deserialize, Serialize};

/// Mirrors AfkData.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AfkData {
    pub name: String,
    pub timeout: u64,
}

/// Mirrors BanData (`reason?` = missing-or-null).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BanData {
    pub id: String,
    #[serde(default)]
    pub reason: Option<String>,
}

/// Mirrors ChannelPermissionsData (allow/deny are bit strings).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelPermissionData {
    pub role_name: String,
    pub allow: String,
    pub deny: String,
}

/// Shared channel fields. Mirrors BaseChannelData (`type` is the numeric
/// discord.js ChannelType).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaseChannelData {
    #[serde(rename = "type")]
    pub channel_type: u8,
    pub name: String,
    #[serde(default)]
    pub parent: Option<String>,
    pub permissions: Vec<ChannelPermissionData>,
}

/// Mirrors MessageData file entries.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageFileData {
    pub name: String,
    pub attachment: String,
}

/// Mirrors MessageData (embeds are passthrough APIEmbed JSON).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageData {
    pub username: String,
    #[serde(default)]
    pub avatar: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub embeds: Option<Vec<serde_json::Value>>,
    #[serde(default)]
    pub files: Option<Vec<MessageFileData>>,
    #[serde(default)]
    pub pinned: Option<bool>,
    pub sent_at: String,
}

/// Mirrors ThreadChannelData (`type` is the numeric ThreadChannelType).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadChannelData {
    #[serde(rename = "type")]
    pub channel_type: u8,
    pub name: String,
    #[serde(default)]
    pub archived: Option<bool>,
    #[serde(default)]
    pub auto_archive_duration: Option<u64>,
    #[serde(default)]
    pub locked: Option<bool>,
    #[serde(default)]
    pub rate_limit_per_user: Option<u64>,
    pub messages: Vec<MessageData>,
}

/// Mirrors TextChannelData (extends BaseChannelData).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextChannelData {
    #[serde(rename = "type")]
    pub channel_type: u8,
    pub name: String,
    #[serde(default)]
    pub parent: Option<String>,
    pub permissions: Vec<ChannelPermissionData>,
    pub nsfw: bool,
    #[serde(default)]
    pub topic: Option<String>,
    #[serde(default)]
    pub rate_limit_per_user: Option<u64>,
    pub is_news: bool,
    pub messages: Vec<MessageData>,
    pub threads: Vec<ThreadChannelData>,
}

/// Mirrors VoiceChannelData (extends BaseChannelData).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceChannelData {
    #[serde(rename = "type")]
    pub channel_type: u8,
    pub name: String,
    #[serde(default)]
    pub parent: Option<String>,
    pub permissions: Vec<ChannelPermissionData>,
    pub bitrate: u64,
    pub user_limit: u64,
}

/// Category children / uncategorized channels: text or voice shapes in
/// one array (TS `Array<TextChannelData | VoiceChannelData>`).
/// Untagged: text requires messages/threads/isNews, so voice blobs
/// fall through to the Voice variant.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GuildChannelData {
    Text(TextChannelData),
    Voice(VoiceChannelData),
}

/// Mirrors CategoryData.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryData {
    pub name: String,
    pub permissions: Vec<ChannelPermissionData>,
    pub children: Vec<GuildChannelData>,
}

/// Mirrors ChannelsData.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelsData {
    pub categories: Vec<CategoryData>,
    pub others: Vec<GuildChannelData>,
}

/// Mirrors RoleData (color is `#hex`, permissions a bit string).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleData {
    pub name: String,
    pub color: String,
    pub hoist: bool,
    pub permissions: String,
    pub mentionable: bool,
    pub position: i64,
    pub is_everyone: bool,
}

/// Mirrors EmojiData.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmojiData {
    pub name: String,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub base64: Option<String>,
}

/// Mirrors MemberData.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberData {
    pub user_id: String,
    pub username: String,
    pub discriminator: String,
    #[serde(default)]
    pub avatar_url: Option<String>,
    #[serde(default)]
    pub joined_timestamp: Option<i64>,
    pub roles: Vec<String>,
    pub bot: bool,
}

/// Mirrors WidgetData.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetData {
    pub enabled: bool,
    #[serde(default)]
    pub channel: Option<String>,
}

/// Mirrors BackupData. verificationLevel / explicitContentFilter /
/// defaultMessageNotifications are numeric discord.js enums in JSON.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupData {
    pub name: String,
    #[serde(default)]
    pub icon_url: Option<String>,
    #[serde(default)]
    pub icon_base64: Option<String>,
    pub verification_level: u8,
    pub explicit_content_filter: u8,
    pub default_message_notifications: i64,
    #[serde(default)]
    pub afk: Option<AfkData>,
    pub widget: WidgetData,
    #[serde(default)]
    pub splash_url: Option<String>,
    #[serde(default)]
    pub splash_base64: Option<String>,
    #[serde(default)]
    pub banner_url: Option<String>,
    #[serde(default)]
    pub banner_base64: Option<String>,
    pub channels: ChannelsData,
    pub roles: Vec<RoleData>,
    pub bans: Vec<BanData>,
    pub emojis: Vec<EmojiData>,
    pub members: Vec<MemberData>,
    pub created_timestamp: i64,
    /// TS spells this `guildID` (not camelCase `guildId`).
    #[serde(rename = "guildID")]
    pub guild_id: String,
    pub id: String,
}

/// Mirrors BackupInfos (`size` is KB with 2 decimals in TS).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfos {
    pub id: String,
    pub size: f64,
    pub data: BackupData,
}

/// Mirrors CreateOptions (all optional).
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOptions {
    /// TS spells this `backupID` (not camelCase `backupId`).
    #[serde(default, rename = "backupID")]
    pub backup_id: Option<String>,
    #[serde(default)]
    pub max_messages_per_channel: Option<u64>,
    #[serde(default)]
    pub json_save: Option<bool>,
    #[serde(default)]
    pub json_beautify: Option<bool>,
    #[serde(default)]
    pub do_not_backup: Option<Vec<String>>,
    #[serde(default)]
    pub backup_members: Option<bool>,
    #[serde(default)]
    pub save_images: Option<bool>,
}

/// Mirrors LoadOptions (allowedMentions passthrough).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadOptions {
    pub clear_guild_before_restore: bool,
    #[serde(default)]
    pub max_messages_per_channel: Option<u64>,
    #[serde(default)]
    pub allowed_mentions: Option<serde_json::Value>,
    #[serde(default)]
    pub self_bot: Option<bool>,
    #[serde(default)]
    pub dev_mode: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_backup() -> BackupData {
        BackupData {
            name: "guild".to_string(),
            icon_url: None,
            icon_base64: None,
            verification_level: 1,
            explicit_content_filter: 0,
            default_message_notifications: 0,
            afk: Some(AfkData {
                name: "afk".to_string(),
                timeout: 300,
            }),
            widget: WidgetData {
                enabled: false,
                channel: None,
            },
            splash_url: None,
            splash_base64: None,
            banner_url: None,
            banner_base64: None,
            channels: ChannelsData {
                categories: vec![CategoryData {
                    name: "cat".to_string(),
                    permissions: vec![],
                    children: vec![
                        GuildChannelData::Text(TextChannelData {
                            channel_type: 0,
                            name: "general".to_string(),
                            parent: None,
                            permissions: vec![],
                            nsfw: false,
                            topic: Some("hi".to_string()),
                            rate_limit_per_user: None,
                            is_news: false,
                            messages: vec![MessageData {
                                username: "u".to_string(),
                                avatar: None,
                                content: Some("hello".to_string()),
                                embeds: None,
                                files: None,
                                pinned: Some(true),
                                sent_at: "2026-01-01".to_string(),
                            }],
                            threads: vec![ThreadChannelData {
                                channel_type: 11,
                                name: "thread".to_string(),
                                archived: None,
                                auto_archive_duration: Some(1440),
                                locked: Some(false),
                                rate_limit_per_user: None,
                                messages: vec![],
                            }],
                        }),
                        GuildChannelData::Voice(VoiceChannelData {
                            channel_type: 2,
                            name: "vc".to_string(),
                            parent: None,
                            permissions: vec![],
                            bitrate: 64000,
                            user_limit: 0,
                        }),
                    ],
                }],
                others: vec![],
            },
            roles: vec![RoleData {
                name: "@everyone".to_string(),
                color: "#000000".to_string(),
                hoist: false,
                permissions: "0".to_string(),
                mentionable: false,
                position: 0,
                is_everyone: true,
            }],
            bans: vec![BanData {
                id: "1".to_string(),
                reason: None,
            }],
            emojis: vec![],
            members: vec![MemberData {
                user_id: "2".to_string(),
                username: "m".to_string(),
                discriminator: "0".to_string(),
                avatar_url: None,
                joined_timestamp: None,
                roles: vec![],
                bot: false,
            }],
            created_timestamp: 1,
            guild_id: "7".to_string(),
            id: "abc".to_string(),
        }
    }

    #[test]
    fn backup_data_roundtrip_uses_ts_camel_keys() {
        let json = serde_json::to_string(&sample_backup()).unwrap();
        // TS-side key shapes, not snake_case.
        for key in [
            "verificationLevel",
            "explicitContentFilter",
            "defaultMessageNotifications",
            "createdTimestamp",
            "guildID",
            "isEveryone",
            "userLimit",
            "rateLimitPerUser",
            "isNews",
            "sentAt",
            "autoArchiveDuration",
        ] {
            assert!(json.contains(key), "missing TS key {key}");
        }
        let back: BackupData = serde_json::from_str(&json).unwrap();
        assert_eq!(back, sample_backup());
    }

    #[test]
    fn untagged_channels_split_text_and_voice() {
        let back: BackupData =
            serde_json::from_str(&serde_json::to_string(&sample_backup()).unwrap()).unwrap();
        assert!(matches!(
            back.channels.categories[0].children[0],
            GuildChannelData::Text(_)
        ));
        assert!(matches!(
            back.channels.categories[0].children[1],
            GuildChannelData::Voice(_)
        ));
    }

    #[test]
    fn missing_and_null_optionals_tolerated_like_ts() {
        // TS optionals arrive missing or null; neither may fail the blob.
        let ban: BanData = serde_json::from_str(r#"{"id":"9"}"#).unwrap();
        assert_eq!(ban.reason, None);
        let ban_null: BanData = serde_json::from_str(r#"{"id":"9","reason":null}"#).unwrap();
        assert_eq!(ban_null.reason, None);
        let member: MemberData = serde_json::from_str(
            r#"{"userId":"2","username":"m","discriminator":"0","roles":[],"bot":false}"#,
        )
        .unwrap();
        assert_eq!(member.avatar_url, None);
        assert_eq!(member.joined_timestamp, None);
        let opts: CreateOptions = serde_json::from_str("{}").unwrap();
        assert_eq!(opts, CreateOptions::default());
        let load: LoadOptions =
            serde_json::from_str(r#"{"clearGuildBeforeRestore":true}"#).unwrap();
        assert!(load.clear_guild_before_restore);
        assert_eq!(load.dev_mode, None);
    }

    #[test]
    fn backup_infos_wraps_data_with_size() {
        let infos = BackupInfos {
            id: "abc".to_string(),
            size: 42.5,
            data: sample_backup(),
        };
        let json = serde_json::to_string(&infos).unwrap();
        let back: BackupInfos = serde_json::from_str(&json).unwrap();
        assert_eq!(back.size, 42.5);
        assert_eq!(back.data.guild_id, "7");
    }
}

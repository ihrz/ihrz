// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Protection structure backup: 60s channels/roles snapshot feeding the
// avoidChannelDelete / avoidRoleDelete restore paths.
// Mirrors src/Events/protection/ready.ts (backupGuildStructure +
// GuildBackup/BackupChannel/BackupRole/BackupCategory shapes) with the
// same JSON key shapes, persisted per guild under BACKUP_KEY.

use poise::serenity_prelude::{ChannelType, GuildChannel, PermissionOverwrite};
use std::collections::{HashMap, HashSet};

/// kv key holding the per-guild structure snapshot (guild_id column = guild).
pub const BACKUP_KEY: &str = "PROTECTION.BACKUP";

/// Mirrors TS BackupChannel: {id, name, type, position, permissions, parent}.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct BackupChannel {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: ChannelType,
    pub position: u16,
    pub permissions: Vec<PermissionOverwrite>,
    pub parent: Option<String>,
}

/// Mirrors TS BackupRole: {id, members}.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct BackupRole {
    pub id: String,
    pub members: Vec<String>,
}

/// Mirrors TS BackupCategory: {id, name, position, channels}.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct BackupCategory {
    pub id: String,
    pub name: String,
    pub position: u16,
    pub channels: Vec<BackupChannel>,
}

/// Mirrors TS GuildBackup: {categories, channels, roles}.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct GuildBackup {
    pub categories: Vec<BackupCategory>,
    pub channels: Vec<BackupChannel>,
    pub roles: Vec<BackupRole>,
}

/// Live channel row decoupled from Discord so the partition logic is
/// testable without a connection. Build via [`RawChannel::from`].
#[derive(Debug, Clone)]
pub struct RawChannel {
    pub id: String,
    pub name: String,
    pub kind: ChannelType,
    pub position: u16,
    pub permissions: Vec<PermissionOverwrite>,
    pub parent: Option<String>,
}

impl From<&GuildChannel> for RawChannel {
    // serenity passes the API `position` straight through (no sorted-position
    // computation like discord.js `position`), so this IS the TS
    // `rawPosition` used for children and top-level channels in ready.ts.
    // Category rows get the discord.js sorted `position` computed in
    // build_backup (audit P7); RawChannel keeps the raw value only.
    fn from(c: &GuildChannel) -> Self {
        Self {
            id: c.id.get().to_string(),
            name: c.name.clone(),
            kind: c.kind,
            position: c.position,
            permissions: c.permission_overwrites.clone(),
            parent: c.parent_id.map(|p| p.get().to_string()),
        }
    }
}

/// TS `channel.type === GuildText || channel.isTextBased()` approximation
/// for top-level (non-category) channels. discord.js `isTextBased()` is
/// `'messages' in channel`, i.e. text, announcement, voice, stage and
/// thread channels (forum/media live under ThreadOnlyChannel with no
/// message manager, directory/DMs never occur as guild snapshot rows).
/// This intentionally mirrors `GuildChannel::is_text_based` in serenity
/// 0.12, which encodes the same set.
pub fn is_text_like(kind: ChannelType) -> bool {
    matches!(
        kind,
        ChannelType::Text
            | ChannelType::News
            | ChannelType::Voice
            | ChannelType::Stage
            | ChannelType::PublicThread
            | ChannelType::PrivateThread
            | ChannelType::NewsThread
    )
}

fn to_backup_channel(raw: &RawChannel) -> BackupChannel {
    BackupChannel {
        id: raw.id.clone(),
        name: raw.name.clone(),
        kind: raw.kind,
        position: raw.position,
        permissions: raw.permissions.clone(),
        parent: raw.parent.clone(),
    }
}

/// Partition live channels into the TS GuildBackup shape.
/// Mirrors backupGuildStructure: categories nest their children, and every
/// text-based guild channel is also listed top-level (TS pushes category
/// children into `backup.channels` as well since they appear separately in
/// `guild.channels.cache`).
/// Positions mirror TS exactly (audit P7): a category stores the
/// discord.js sorted `position` (index among categories ordered by raw
/// position, then id); category children and top-level channels store
/// the API `rawPosition`.
pub fn build_backup(channels: &[RawChannel], roles: Vec<BackupRole>) -> GuildBackup {
    let mut backup = GuildBackup {
        categories: Vec::new(),
        channels: Vec::new(),
        roles,
    };
    // discord.js category `position`: rank among same-kind channels by
    // (rawPosition, id). Computed here since serenity only carries the
    // API position.
    let mut cat_order: Vec<&RawChannel> = channels
        .iter()
        .filter(|c| c.kind == ChannelType::Category)
        .collect();
    cat_order.sort_by(|a, b| a.position.cmp(&b.position).then_with(|| a.id.cmp(&b.id)));
    let sorted_pos: std::collections::HashMap<&str, u16> = cat_order
        .iter()
        .enumerate()
        .map(|(i, c)| (c.id.as_str(), i as u16))
        .collect();
    for raw in channels.iter().filter(|c| c.kind == ChannelType::Category) {
        backup.categories.push(BackupCategory {
            id: raw.id.clone(),
            name: raw.name.clone(),
            position: sorted_pos
                .get(raw.id.as_str())
                .copied()
                .unwrap_or(raw.position),
            channels: channels
                .iter()
                .filter(|c| c.parent.as_deref() == Some(raw.id.as_str()))
                .map(to_backup_channel)
                .collect(),
        });
    }
    for raw in channels
        .iter()
        .filter(|c| c.kind != ChannelType::Category && is_text_like(c.kind))
    {
        backup.channels.push(to_backup_channel(raw));
    }
    backup
}

/// Categories from the snapshot missing live. Mirrors the
/// existingCategory / create-category branch of avoidChannelDelete.
pub fn missing_categories<'a>(
    backup: &'a GuildBackup,
    live_ids: &HashSet<String>,
) -> Vec<&'a BackupCategory> {
    backup
        .categories
        .iter()
        .filter(|c| !live_ids.contains(&c.id))
        .collect()
}

/// Snapshot children of one category missing live. Mirrors the
/// existingChannel / create-channel branch of avoidChannelDelete.
pub fn category_children_to_create<'a>(
    backup: &'a GuildBackup,
    category_id: &str,
    live_ids: &HashSet<String>,
) -> Vec<&'a BackupChannel> {
    backup
        .categories
        .iter()
        .find(|c| c.id == category_id)
        .map(|c| {
            c.channels
                .iter()
                .filter(|ch| !live_ids.contains(&ch.id))
                .collect()
        })
        .unwrap_or_default()
}

/// Live channels whose parent drifted from the snapshot, with the snapshot
/// parent id and position to restore. Mirrors the setParent/setPosition
/// branch of avoidChannelDelete. The caller resolves snapshot category ids
/// to live category ids (TS `categoryMap`).
pub fn channels_to_reparent<'a>(
    backup: &'a GuildBackup,
    live_parent: &HashMap<String, Option<String>>,
) -> Vec<(&'a BackupChannel, String, u16)> {
    let mut out = Vec::new();
    for cat in &backup.categories {
        for ch in &cat.channels {
            match live_parent.get(&ch.id) {
                // Channel still exists but is no longer under its category.
                Some(parent) if parent.as_deref() != ch.parent.as_deref() => {
                    if let Some(want) = ch.parent.clone() {
                        out.push((ch, want, ch.position));
                    }
                }
                _ => {}
            }
        }
    }
    out
}

/// Member ids holding a role at snapshot time. Mirrors the
/// `protectionCache.data.get(guild)?.roles.find(id)?.members` lookup in
/// avoidRoleDelete used to re-add members to the recreated role.
pub fn role_members<'a>(backup: &'a GuildBackup, role_id: &str) -> &'a [String] {
    backup
        .roles
        .iter()
        .find(|r| r.id == role_id)
        .map(|r| r.members.as_slice())
        .unwrap_or(&[])
}

pub async fn save_backup(
    pool: &crate::db::Pool,
    guild_id: &str,
    backup: &GuildBackup,
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        BACKUP_KEY,
        &serde_json::to_string(backup)?,
    )
    .await
}

pub async fn load_backup(pool: &crate::db::Pool, guild_id: &str) -> Option<GuildBackup> {
    let raw =
        crate::commands::owner::main::routed_get(pool, guild_id, guild_id, BACKUP_KEY).await?;
    serde_json::from_str(&raw).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn raw(
        id: &str,
        name: &str,
        kind: ChannelType,
        position: u16,
        parent: Option<&str>,
    ) -> RawChannel {
        RawChannel {
            id: id.to_string(),
            name: name.to_string(),
            kind,
            position,
            permissions: Vec::new(),
            parent: parent.map(str::to_string),
        }
    }

    fn sample() -> GuildBackup {
        build_backup(
            &[
                raw("cat1", "lobby", ChannelType::Category, 0, None),
                raw("ch1", "general", ChannelType::Text, 1, Some("cat1")),
                raw("ch2", "top", ChannelType::Text, 0, None),
                raw("v1", "voice", ChannelType::Voice, 2, Some("cat1")),
                raw("f1", "forum", ChannelType::Forum, 3, None),
                raw("t1", "thread", ChannelType::PublicThread, 4, None),
            ],
            vec![BackupRole {
                id: "r1".to_string(),
                members: vec!["u1".to_string(), "u2".to_string()],
            }],
        )
    }

    #[test]
    fn text_like_matches_serenity_is_text_based() {
        // Mirrors GuildChannel::is_text_based (serenity 0.12) and the TS
        // `GuildText || isTextBased()` snapshot gate: voice/stage/threads
        // count, forum/media/directory do not.
        for kind in [
            ChannelType::Text,
            ChannelType::News,
            ChannelType::Voice,
            ChannelType::Stage,
            ChannelType::PublicThread,
            ChannelType::PrivateThread,
            ChannelType::NewsThread,
        ] {
            assert!(is_text_like(kind), "text-like: {kind:?}");
        }
        for kind in [
            ChannelType::Category,
            ChannelType::Forum,
            ChannelType::Directory,
            ChannelType::Private,
            ChannelType::GroupDm,
            ChannelType::Unknown(16),
        ] {
            assert!(!is_text_like(kind), "not text-like: {kind:?}");
        }
    }

    #[test]
    fn snapshot_partitions_like_ts() {
        let b = sample();
        assert_eq!(b.categories.len(), 1);
        // Category children nest regardless of kind (TS maps
        // channel.children.cache wholesale, voice included).
        assert_eq!(b.categories[0].channels.len(), 2);
        assert_eq!(b.categories[0].channels[0].id, "ch1");
        assert_eq!(b.categories[0].channels[1].id, "v1");
        // TS also lists category children top-level (separate cache entries
        // passing the text gate).
        let top: Vec<&str> = b.channels.iter().map(|c| c.id.as_str()).collect();
        assert!(top.contains(&"ch1"));
        assert!(top.contains(&"ch2"));
        // Voice/stage/thread channels are text-like like TS isTextBased.
        assert!(top.contains(&"v1"));
        assert!(top.contains(&"t1"));
        // Forum/media rows are dropped like TS (not text-based).
        assert!(!top.contains(&"f1"));
        assert_eq!(b.roles.len(), 1);
    }

    #[test]
    fn snapshot_json_uses_ts_key_shapes() {
        let b = sample();
        let v = serde_json::to_value(&b).unwrap();
        assert!(v.get("categories").is_some());
        assert!(v.get("channels").is_some());
        assert!(v.get("roles").is_some());
        let ch = &v["categories"][0]["channels"][0];
        for key in ["id", "name", "type", "position", "permissions", "parent"] {
            assert!(ch.get(key).is_some(), "missing key {key}");
        }
        assert_eq!(ch["parent"], serde_json::Value::String("cat1".to_string()));
        assert_eq!(v["roles"][0]["members"], serde_json::json!(["u1", "u2"]));
    }

    #[test]
    fn restore_mapping_finds_missing_and_drifted() {
        let b = sample();
        let live: HashSet<String> = ["cat1".to_string(), "ch2".to_string()]
            .into_iter()
            .collect();
        assert!(missing_categories(&b, &live).is_empty());
        let gone: HashSet<String> = ["ch2".to_string()].into_iter().collect();
        assert_eq!(missing_categories(&b, &gone).len(), 1);

        let to_create = category_children_to_create(&b, "cat1", &live);
        assert_eq!(to_create.len(), 2);
        assert_eq!(to_create[0].id, "ch1");
        assert_eq!(to_create[1].id, "v1");

        // ch1 live but moved out of its category -> reparent.
        let parents: HashMap<String, Option<String>> =
            [("ch1".to_string(), None), ("ch2".to_string(), None)]
                .into_iter()
                .collect();
        let drift = channels_to_reparent(&b, &parents);
        assert_eq!(drift.len(), 1);
        assert_eq!(drift[0].0.id, "ch1");
        assert_eq!(drift[0].1, "cat1");
        assert_eq!(drift[0].2, 1);

        // No drift when parents match.
        let ok: HashMap<String, Option<String>> = [
            ("ch1".to_string(), Some("cat1".to_string())),
            ("ch2".to_string(), None),
        ]
        .into_iter()
        .collect();
        assert!(channels_to_reparent(&b, &ok).is_empty());
    }

    #[test]
    fn categories_carry_sorted_position_channels_carry_raw() {
        // Audit P7: TS stores discord.js `position` (sorted rank) on the
        // category but `rawPosition` on children/top-level channels.
        let b = build_backup(
            &[
                raw("catB", "b", ChannelType::Category, 1, None),
                raw("catA", "a", ChannelType::Category, 9, None),
                raw("ch1", "general", ChannelType::Text, 7, Some("catA")),
                raw("ch2", "top", ChannelType::Text, 3, None),
            ],
            Vec::new(),
        );
        let pos = |id: &str| b.categories.iter().find(|c| c.id == id).map(|c| c.position);
        // Sorted by (raw, id): catB(raw 1) -> 0, catA(raw 9) -> 1.
        assert_eq!(pos("catB"), Some(0));
        assert_eq!(pos("catA"), Some(1));
        // Children and top-level rows keep the raw API position.
        let child = &b.categories[1].channels[0];
        assert_eq!(child.id, "ch1");
        assert_eq!(child.position, 7);
        let top = b.channels.iter().find(|c| c.id == "ch2").unwrap();
        assert_eq!(top.position, 3);
    }

    #[test]
    fn role_members_lookup_matches_avoid_role_delete() {
        let b = sample();
        assert_eq!(
            role_members(&b, "r1"),
            &["u1".to_string(), "u2".to_string()]
        );
        assert!(role_members(&b, "unknown").is_empty());
    }

    #[tokio::test]
    async fn backup_roundtrips_through_kv() {
        let pool = crate::db::memory_pool().await;
        let b = sample();
        save_backup(&pool, "g1", &b).await.unwrap();
        assert_eq!(load_backup(&pool, "g1").await, Some(b));
        assert!(load_backup(&pool, "other").await.is_none());
    }
}

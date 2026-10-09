// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Command permission gate. Mirrors src/core/functions/permissonsCalculator.ts
// (normalize + hasCommandPermissionRequirements + checkCommandPermission +
// getCmdPermData + the 5 sub-checks) as pure offline logic.
//
// Level mapping: TS PermCommandLevel = 1..9 | 0 | null.
// Here None = null (no level gate), Some(0) = explicit 0.
// DB reads go through the existing kv helpers (crate::db::kv_get):
// guild UTILS JSON at key "UTILS", owner flag at "OWNER.{member}.owner".

use std::collections::HashMap;

/// Normalized per-command permission record. Mirrors `command` type.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct CommandPerm {
    pub users: Vec<String>,
    pub roles: Vec<String>,
    pub level: Option<u8>,
}

/// Normalize partial permission data. Mirrors normalizeCommandPermissionData().
/// level 0 + custom targets collapses to None (open to listed targets only).
pub fn normalize(users: Vec<String>, roles: Vec<String>, level: Option<u8>) -> CommandPerm {
    let has_targets = !users.is_empty() || !roles.is_empty();
    let level = match level {
        Some(0) if has_targets => None,
        other => other.or(if has_targets { None } else { Some(0) }),
    };
    CommandPerm {
        users,
        roles,
        level,
    }
}

/// Default record (no requirements). Mirrors normalizeCommandPermissionData().
pub fn default_perm() -> CommandPerm {
    CommandPerm {
        users: vec![],
        roles: vec![],
        level: Some(0),
    }
}

/// True when the command actually requires something.
/// Mirrors hasCommandPermissionRequirements().
pub fn has_requirements(perm: Option<&CommandPerm>) -> bool {
    match perm {
        None => false,
        Some(p) => !p.users.is_empty() || !p.roles.is_empty() || p.level.unwrap_or(0) > 0,
    }
}

/// Stored per-command value: legacy plain level or full record.
/// Mirrors UtilsPermsData values (PermLevel | PermCommandData).
#[derive(Debug, Clone)]
pub enum StoredPerm {
    Level(u8),
    Full(CommandPerm),
}

/// Look up a command's permission record with category fallback
/// (first token before space) and legacy-number conversion.
/// Mirrors getCmdPermData().
pub fn get_cmd_perm_data(command: &str, perms: &HashMap<String, StoredPerm>) -> CommandPerm {
    let mut found = perms.get(command);
    if found.is_none() {
        if let Some(head) = command.split(' ').next() {
            found = perms.get(head);
        }
    }
    match found {
        None => default_perm(),
        Some(StoredPerm::Level(lvl)) => normalize(vec![], vec![], Some(*lvl)),
        Some(StoredPerm::Full(p)) => normalize(p.users.clone(), p.roles.clone(), p.level),
    }
}

/// Explicit user allowlist. Mirrors checkExplicitUserPermission().
pub fn check_explicit_user(user_id: &str, perm: &CommandPerm) -> bool {
    if perm.users.iter().any(|u| u == user_id) {
        return true;
    }
    // Special case: users listed but level 0/null -> listed users only.
    // (First branch already returned true for members, so this is false.)
    if !perm.users.is_empty() && perm.level.unwrap_or(0) == 0 {
        return perm.users.iter().any(|u| u == user_id);
    }
    false
}

/// Role-hierarchy gate: member's highest level-role must reach cmd level.
/// `level_roles` maps perm level 1..=9 to role id. Mirrors checkRoleHierarchy().
pub fn check_role_hierarchy(
    member_roles: &[String],
    level_roles: &HashMap<u8, String>,
    perm: &CommandPerm,
) -> bool {
    let need = match perm.level {
        None | Some(0) => return false,
        Some(l) => l,
    };
    let mut highest: u8 = 0;
    for lvl in 1u8..=9 {
        if let Some(role_id) = level_roles.get(&lvl) {
            if member_roles.iter().any(|r| r == role_id) {
                highest = highest.max(lvl);
            }
        }
    }
    highest >= need
}

/// Explicit role allowlist. Mirrors checkExplicitRolePermission().
pub fn check_explicit_role(member_roles: &[String], perm: &CommandPerm) -> bool {
    perm.roles
        .iter()
        .any(|r| member_roles.iter().any(|m| m == r))
}

/// Per-user level gate. Mirrors checkUserPermLevel().
pub fn check_user_level(
    user_id: &str,
    user_levels: &HashMap<String, u8>,
    perm: &CommandPerm,
) -> bool {
    let need = match perm.level {
        None | Some(0) => return false,
        Some(l) => l,
    };
    user_levels.get(user_id).copied().unwrap_or(0) >= need
}

/// Full snapshot needed for one gate evaluation.
#[derive(Debug, Clone, Default)]
pub struct GateSnapshot {
    pub user_id: String,
    pub member_roles: Vec<String>,
    pub perm: CommandPerm,
    pub level_roles: HashMap<u8, String>,
    pub user_levels: HashMap<String, u8>,
    pub is_owner: bool,
}

/// OR over the 5 sub-checks in TS priority order. Mirrors the
/// Promise.all(...).some() tail of checkCommandPermission().
pub fn check_permission(snap: &GateSnapshot) -> bool {
    check_explicit_user(&snap.user_id, &snap.perm)
        || check_role_hierarchy(&snap.member_roles, &snap.level_roles, &snap.perm)
        || check_explicit_role(&snap.member_roles, &snap.perm)
        || check_user_level(&snap.user_id, &snap.user_levels, &snap.perm)
        || snap.is_owner
}

/// Owner-list flag via the existing kv store.
/// TS key `${guildId}.OWNER.${memberId}.owner` === true.
pub async fn is_owner(pool: &crate::db::Pool, guild_id: &str, member_id: &str) -> bool {
    crate::db::kv_get(pool, guild_id, &format!("OWNER.{member_id}.owner"))
        .await
        .is_some_and(|v| v == "true")
}

/// Raw UTILS JSON via the existing kv store (key "UTILS", None when unset).
/// Callers parse it into maps and feed get_cmd_perm_data()/GateSnapshot.
pub async fn load_utils_json(pool: &crate::db::Pool, guild_id: &str) -> Option<String> {
    crate::db::kv_get(pool, guild_id, "UTILS").await
}

/// Parse the UTILS JSON blob into (perms, level_roles, user_levels).
/// Unknown shapes fall back to empty maps (deny-by-default at the gate).
pub fn parse_utils_json(
    raw: Option<&str>,
) -> (
    HashMap<String, StoredPerm>,
    HashMap<u8, String>,
    HashMap<String, u8>,
) {
    let mut perms = HashMap::new();
    let mut level_roles: HashMap<u8, String> = HashMap::new();
    let mut user_levels: HashMap<String, u8> = HashMap::new();
    let Some(raw) = raw else {
        return (perms, level_roles, user_levels);
    };
    let Ok(v) = serde_json::from_str::<serde_json::Value>(raw) else {
        return (perms, level_roles, user_levels);
    };
    if let Some(map) = v.get("PERMS").and_then(|p| p.as_object()) {
        for (k, val) in map {
            if let Some(n) = val.as_u64() {
                perms.insert(k.clone(), StoredPerm::Level(n as u8));
            } else if val.is_object() {
                let users = val
                    .get("users")
                    .and_then(|u| u.as_array())
                    .map(|a| {
                        a.iter()
                            .filter_map(|x| x.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();
                let roles = val
                    .get("roles")
                    .and_then(|r| r.as_array())
                    .map(|a| {
                        a.iter()
                            .filter_map(|x| x.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();
                let level = val.get("level").and_then(|l| {
                    if l.is_null() {
                        None
                    } else {
                        l.as_u64().map(|n| n as u8)
                    }
                });
                perms.insert(
                    k.clone(),
                    StoredPerm::Full(CommandPerm {
                        users,
                        roles,
                        level,
                    }),
                );
            }
        }
    }
    if let Some(roles) = v.get("roles").and_then(|r| r.as_object()) {
        for (k, val) in roles {
            if let (Ok(lvl), Some(id)) = (k.parse::<u8>(), val.as_str()) {
                if (1..=9).contains(&lvl) {
                    level_roles.insert(lvl, id.to_string());
                }
            }
        }
    }
    if let Some(users) = v.get("USER_PERMS").and_then(|u| u.as_object()) {
        for (k, val) in users {
            if let Some(n) = val.as_u64() {
                user_levels.insert(k.clone(), n as u8);
            }
        }
    }
    (perms, level_roles, user_levels)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn full(users: &[&str], roles: &[&str], level: Option<u8>) -> CommandPerm {
        CommandPerm {
            users: users.iter().map(|s| s.to_string()).collect(),
            roles: roles.iter().map(|s| s.to_string()).collect(),
            level,
        }
    }

    fn snap(perm: CommandPerm) -> GateSnapshot {
        GateSnapshot {
            user_id: "u1".into(),
            member_roles: vec![],
            perm,
            ..Default::default()
        }
    }

    #[test]
    fn normalize_collapses_zero_with_targets() {
        // Adversarial: level 0 + targets must become None (targets-only gate).
        let p = normalize(vec!["u1".into()], vec![], Some(0));
        assert_eq!(p.level, None);
        let p = normalize(vec![], vec![], None);
        assert_eq!(p.level, Some(0));
        // No targets, no level -> open (Some(0)).
        let p = normalize(vec![], vec![], None);
        assert!(!has_requirements(Some(&p)));
    }

    #[test]
    fn has_requirements_matrix() {
        assert!(!has_requirements(None));
        assert!(!has_requirements(Some(&default_perm())));
        assert!(has_requirements(Some(&full(&["u1"], &[], None))));
        assert!(has_requirements(Some(&full(&[], &[], Some(3)))));
    }

    #[test]
    fn cmd_lookup_category_fallback_and_legacy() {
        let mut m = HashMap::new();
        m.insert("mod".into(), StoredPerm::Level(4));
        // Exact miss -> category head "mod" wins.
        let p = get_cmd_perm_data("mod ban", &m);
        assert_eq!(p.level, Some(4));
        // Exact hit beats category.
        m.insert("mod ban".into(), StoredPerm::Level(7));
        let p = get_cmd_perm_data("mod ban", &m);
        assert_eq!(p.level, Some(7));
        // Missing -> open default.
        let p = get_cmd_perm_data("nope", &m);
        assert!(!has_requirements(Some(&p)));
    }

    #[test]
    fn explicit_user_beats_level_zero_lockout() {
        // Adversarial: listed user passes even with level None ...
        let p = full(&["u1"], &[], None);
        assert!(check_explicit_user("u1", &p));
        // ... while an unlisted user is denied by the same record.
        assert!(!check_explicit_user("u2", &p));
        let mut s = snap(p);
        s.user_id = "u2".into();
        assert!(!check_permission(&s));
    }

    #[test]
    fn owner_is_last_resort_allow() {
        // Adversarial: no requirements at all, but owner flag still allows.
        let mut s = snap(default_perm());
        assert!(!check_permission(&s));
        s.is_owner = true;
        assert!(check_permission(&s));
    }

    #[test]
    fn hierarchy_uses_highest_role_only() {
        let mut levels = HashMap::new();
        levels.insert(2, "r2".into());
        levels.insert(5, "r5".into());
        let p = full(&[], &[], Some(4));
        // Member with only r2 (level 2) < 4 -> deny.
        assert!(!check_role_hierarchy(&["r2".into()], &levels, &p));
        // Member with r2+r5 -> highest 5 >= 4 -> allow.
        assert!(check_role_hierarchy(
            &["r2".into(), "r5".into()],
            &levels,
            &p
        ));
        // No level gate -> hierarchy never fires (even holding roles).
        let open = full(&[], &["r2"], None);
        assert!(!check_role_hierarchy(&["r2".into()], &levels, &open));
        // ... but the explicit-role check still fires for that record.
        assert!(check_explicit_role(&["r2".into()], &open));
    }

    #[test]
    fn user_level_gate() {
        let mut ul = HashMap::new();
        ul.insert("u1".into(), 3u8);
        let p = full(&[], &[], Some(3));
        assert!(check_user_level("u1", &ul, &p));
        assert!(!check_user_level("u9", &ul, &p));
        assert!(!check_user_level("u1", &ul, &full(&[], &[], None)));
    }

    #[test]
    fn authz_priority_any_single_pass_allows() {
        // Adversarial: each vector alone must flip a locked-down record.
        let locked = full(&["other"], &["other-role"], Some(9));
        let mut base = snap(locked);
        base.user_id = "u1".into();
        assert!(!check_permission(&base));

        let mut s = base.clone();
        s.user_id = "other".into();
        assert!(check_permission(&s)); // explicit user

        let mut s = base.clone();
        s.member_roles = vec!["other-role".into()];
        assert!(check_permission(&s)); // explicit role

        let mut s = base.clone();
        s.user_levels.insert("u1".into(), 9);
        assert!(check_permission(&s)); // user level

        let mut s = base.clone();
        s.level_roles.insert(9, "r9".into());
        s.member_roles = vec!["r9".into()];
        assert!(check_permission(&s)); // hierarchy

        let mut s = base.clone();
        s.is_owner = true;
        assert!(check_permission(&s)); // owner
    }

    #[test]
    fn parse_utils_json_tolerates_garbage() {
        let (p, r, u) = parse_utils_json(None);
        assert!(p.is_empty() && r.is_empty() && u.is_empty());
        let (p, _, _) = parse_utils_json(Some("not json{{"));
        assert!(p.is_empty());
        let raw = r#"{"PERMS":{"ban":5,"kick":{"users":["u1"],"roles":[],"level":null}},"roles":{"3":"r3"},"USER_PERMS":{"u1":3}}"#;
        let (p, r, u) = parse_utils_json(Some(raw));
        assert_eq!(get_cmd_perm_data("ban", &p).level, Some(5));
        assert!(check_explicit_user("u1", &get_cmd_perm_data("kick", &p)));
        assert_eq!(r.get(&3).map(String::as_str), Some("r3"));
        assert_eq!(u.get("u1").copied(), Some(3));
    }
}

// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Command permission gate. Mirrors src/core/functions/permissonsCalculator.ts
// (normalize + hasCommandPermissionRequirements + checkCommandPermission +
// getCmdPermData + the 5 sub-checks) as pure offline logic.
//
// Level mapping: TS PermCommandLevel = 1..9 | 0 | null.
// Here None = null (no level gate), Some(0) = explicit 0.
// DB reads are table-first with legacy kv fallback (crate::db::tbl_get):
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
/// Mirrors getCmdPermData(). The fallback gate is JS-falsy, not
/// missing-only: a legacy `Level(0)` exact entry falls through to the
/// category head (node ground truth: `{"mod ban":0,"mod":7}` resolves
/// to 7, while `{"mod ban":0}` alone stays 0). Every `Full` record is
/// truthy (objects always are in JS), so only `Level(0)` falls through.
pub fn get_cmd_perm_data(command: &str, perms: &HashMap<String, StoredPerm>) -> CommandPerm {
    let mut found = perms.get(command);
    if !is_truthy_perm(found) {
        if let Some(head) = command.split(' ').next() {
            if is_truthy_perm(perms.get(head)) {
                found = perms.get(head);
            }
        }
    }
    match found {
        None => default_perm(),
        Some(StoredPerm::Level(lvl)) => normalize(vec![], vec![], Some(*lvl)),
        Some(StoredPerm::Full(p)) => normalize(p.users.clone(), p.roles.clone(), p.level),
    }
}

/// JS-truthiness of a stored PERMS value: missing and legacy level 0
/// are falsy, every object record is truthy.
fn is_truthy_perm(p: Option<&StoredPerm>) -> bool {
    match p {
        Some(StoredPerm::Full(_)) => true,
        Some(StoredPerm::Level(n)) => *n != 0,
        None => false,
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

/// Build the `neededPerm` segment of the permission-denial reply.
/// Pure mirror of sendErrorMessage() in
/// src/core/functions/permissonsCalculator.ts:236-269 (no Discord delivery).
/// Labels reuse the existing `var_roles` / `var_member` YAML keys with the
/// exact en-US fallbacks ("Roles" / "Members"); separators match TS exactly:
/// level as `` `{level}` \n ``, roles joined with `", "`, users joined with
/// `", "` and prefixed with `" / "` only when roles are also listed, each
/// line trailing `" \n"`. `None` mirrors the null-permissionData branch
/// (`"**`Discord Permission`**"`).
pub fn needed_perm_text(lang_code: &str, perm: Option<&CommandPerm>) -> String {
    let Some(p) = perm else {
        return "**`Discord Permission`**".to_string();
    };
    let mut out = String::new();
    if p.level.unwrap_or(0) > 0 {
        out.push_str(&format!("`{}` \n", p.level.unwrap_or(0)));
    }
    if !p.roles.is_empty() {
        let roles_label =
            crate::lang::get(lang_code, "var_roles").unwrap_or_else(|| "Roles".to_string());
        let mentions: Vec<String> = p.roles.iter().map(|x| format!("<@&{x}>")).collect();
        out.push_str(&format!("{}: {} \n", roles_label, mentions.join(", ")));
    }
    if !p.users.is_empty() {
        let member_label =
            crate::lang::get(lang_code, "var_member").unwrap_or_else(|| "Members".to_string());
        let prefix = if !p.roles.is_empty() { " / " } else { "" };
        let mentions: Vec<String> = p.users.iter().map(|x| format!("<@{x}>")).collect();
        out.push_str(&format!(
            "{}: {}{} \n",
            member_label,
            prefix,
            mentions.join(", ")
        ));
    }
    out
}

/// Full denial content. Mirrors the interactionSend `content` in
/// sendErrorMessage(): the existing `event_permission_wrong` template with
/// `${interaction.member?.user.toString()}` -> member mention and
/// `${neededPerm}` -> [`needed_perm_text`]. Exact en-US fallback when the
/// guild lang table misses the key.
/// Both fills are FIRST-ONLY (`replacen(..., 1)`), matching TS
/// `String.replace(string)` (W6 slice 177 battery): a doubled template
/// keeps the second marker literal, and a member value carrying
/// `${neededPerm}` consumes the single neededPerm leg (it sorts first),
/// leaving the template's own marker literal. Behavior-preserving on the
/// shipped templates (each placeholder occurs exactly once in all 10
/// langs, verified `grep -c` x10).
pub fn denied_message(lang_code: &str, member_mention: &str, perm: Option<&CommandPerm>) -> String {
    let template = crate::lang::get(lang_code, "event_permission_wrong").unwrap_or_else(|| {
        "${interaction.member?.user.toString()}, you are not allowed to use this command! You need this permission: ${neededPerm}".to_string()
    });
    fill_denial_template(
        &template,
        member_mention,
        &needed_perm_text(lang_code, perm),
    )
}

/// Pure two-leg template fill behind [`denied_message`]: member token
/// first, neededPerm token second, each FIRST-ONLY like TS
/// `String.replace(string)`. Split out so the takeover battery can pin
/// doubled/injected shapes without a lang-table round-trip.
pub fn fill_denial_template(template: &str, member_mention: &str, needed_perm: &str) -> String {
    template
        .replacen("${interaction.member?.user.toString()}", member_mention, 1)
        .replacen("${neededPerm}", needed_perm, 1)
}

/// Owner-list flag, table-first with legacy kv fallback.
/// TS key `${guildId}.OWNER.${memberId}.owner` === true (keys unchanged).
pub async fn is_owner(pool: &crate::db::Pool, guild_id: &str, member_id: &str) -> bool {
    crate::db::tbl_get(pool, guild_id, &format!("OWNER.{member_id}.owner"))
        .await
        .is_some_and(|v| v == "true")
}

/// Raw UTILS JSON, table-first with legacy kv fallback (key "UTILS",
/// None when unset; keys unchanged).
/// Callers parse it into maps and feed get_cmd_perm_data()/GateSnapshot.
pub async fn load_utils_json(pool: &crate::db::Pool, guild_id: &str) -> Option<String> {
    crate::db::tbl_get(pool, guild_id, "UTILS").await
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
        let p = normalize(vec![], vec!["r1".into()], Some(0));
        assert_eq!(p.level, None);
        let p = normalize(vec![], vec![], None);
        assert_eq!(p.level, Some(0));
        // No targets, no level -> open (Some(0)).
        let p = normalize(vec![], vec![], None);
        assert!(!has_requirements(Some(&p)));
        // U-ETERNAL-270: full normalize matrix vs node battery replicating
        // normalizeCommandPermissionData verbatim. TS `??` fires on both
        // undefined and null, so Rust None covers both spellings exactly:
        // missing/null level + targets -> null, + empty -> 0.
        let p = normalize(vec!["u1".into()], vec![], None);
        assert_eq!(p.level, None);
        let p = normalize(vec![], vec!["r1".into()], None);
        assert_eq!(p.level, None);
        let p = normalize(vec!["u1".into()], vec!["r1".into()], None);
        assert_eq!(p.level, None);
        // Non-zero levels pass through untouched with or without targets.
        let p = normalize(vec!["u1".into()], vec![], Some(3));
        assert_eq!(p.level, Some(3));
        let p = normalize(vec![], vec![], Some(9));
        assert_eq!(p.level, Some(9));
        // default_perm is normalize([], [], missing): open record.
        assert_eq!(default_perm(), normalize(vec![], vec![], None));
    }

    #[test]
    fn has_requirements_matrix() {
        assert!(!has_requirements(None));
        assert!(!has_requirements(Some(&default_perm())));
        assert!(has_requirements(Some(&full(&["u1"], &[], None))));
        assert!(has_requirements(Some(&full(&[], &[], Some(3)))));
        // U-ETERNAL-270: node ground truth — `(level ?? 0) > 0`, so explicit
        // null/0 with targets is still a requirement (users/roles legs).
        assert!(has_requirements(Some(&full(&[], &["r1"], None))));
        assert!(has_requirements(Some(&full(&["u1"], &[], Some(0)))));
        assert!(has_requirements(Some(&full(&[], &[], Some(9)))));
        assert!(!has_requirements(Some(&full(&[], &[], None))));
        assert!(!has_requirements(Some(&full(&[], &[], Some(0)))));
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
    fn cmd_lookup_zero_exact_falls_through_to_head_like_ts() {
        // Node ground truth: the TS gate is `!cmdPermData`, so a legacy
        // level-0 exact entry is falsy and the category head wins, while
        // a lone 0 (or 0 + falsy head) stays open and objects never fall
        // through (all JS objects are truthy).
        let mut m = HashMap::new();
        m.insert("mod ban".into(), StoredPerm::Level(0));
        m.insert("mod".into(), StoredPerm::Level(7));
        assert_eq!(get_cmd_perm_data("mod ban", &m).level, Some(7));

        let mut m = HashMap::new();
        m.insert("mod ban".into(), StoredPerm::Level(0));
        assert_eq!(get_cmd_perm_data("mod ban", &m).level, Some(0));

        let mut m = HashMap::new();
        m.insert("mod ban".into(), StoredPerm::Level(0));
        m.insert("mod".into(), StoredPerm::Level(0));
        assert_eq!(get_cmd_perm_data("mod ban", &m).level, Some(0));

        let mut m = HashMap::new();
        m.insert("mod ban".into(), StoredPerm::Full(full(&[], &[], Some(0))));
        m.insert("mod".into(), StoredPerm::Level(7));
        assert_eq!(get_cmd_perm_data("mod ban", &m).level, Some(0));

        let mut m = HashMap::new();
        m.insert("ban".into(), StoredPerm::Level(0));
        assert_eq!(get_cmd_perm_data("ban", &m).level, Some(0));
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
    fn denied_level_only_matches_ts() {
        // TS: neededPerm += `\`${level}\` \n` (backtick, space, real newline).
        let p = full(&[], &[], Some(3));
        assert_eq!(needed_perm_text("en-US", Some(&p)), "`3` \n");
        assert_eq!(
            denied_message("en-US", "<@123>", Some(&p)),
            "<@123>, you are not allowed to use this command! You need this permission: `3` \n"
        );
    }

    #[test]
    fn denied_role_list_matches_ts() {
        // TS: `${lang.var_roles}: ${roles.map(<@&x>).join(", ")} \n`.
        let p = full(&[], &["r1", "r2"], None);
        assert_eq!(
            needed_perm_text("en-US", Some(&p)),
            "Roles: <@&r1>, <@&r2> \n"
        );
    }

    #[test]
    fn denied_user_list_matches_ts() {
        // TS: no " / " prefix when there are no roles.
        let p = full(&["u1", "u2"], &[], None);
        assert_eq!(
            needed_perm_text("en-US", Some(&p)),
            "Members: <@u1>, <@u2> \n"
        );
    }

    #[test]
    fn denied_combined_matches_ts() {
        // TS: level line, then roles line, then member line with " / " prefix.
        let p = full(&["u7"], &["r1"], Some(4));
        assert_eq!(
            needed_perm_text("en-US", Some(&p)),
            "`4` \nRoles: <@&r1> \nMembers:  / <@u7> \n"
        );
        assert_eq!(
            denied_message("en-US", "<@123>", Some(&p)),
            "<@123>, you are not allowed to use this command! You need this permission: `4` \nRoles: <@&r1> \nMembers:  / <@u7> \n"
        );
    }

    #[test]
    fn denied_null_perm_matches_ts_fallback() {
        // TS null-permissionData branch: "**`Discord Permission`**".
        assert_eq!(needed_perm_text("en-US", None), "**`Discord Permission`**");
        assert_eq!(
            denied_message("en-US", "<@123>", None),
            "<@123>, you are not allowed to use this command! You need this permission: **`Discord Permission`**"
        );
    }

    #[test]
    fn denial_fill_is_first_only_like_ts_replace() {
        // Node ground-truth battery for the sendErrorMessage content fill
        // (W6 slice 177, script at scratch `slice177-denial.js`): TS chains
        // `.replace(string)`, which swaps the FIRST occurrence per leg.
        let m = "${interaction.member?.user.toString()}";
        let n = "${neededPerm}";
        // Baselines fill both legs once.
        assert_eq!(
            fill_denial_template(&format!("M:{m} P:{n}"), "<@1>", "N"),
            "M:<@1> P:N"
        );
        // Doubled templates keep the second marker literal.
        assert_eq!(
            fill_denial_template(&format!("A {n} B {n}"), "<@1>", "N"),
            "A N B ${neededPerm}"
        );
        assert_eq!(
            fill_denial_template(&format!("A {m} B {m} C"), "<@1>", "N"),
            "A <@1> B ${interaction.member?.user.toString()} C"
        );
        // A member value carrying `${neededPerm}` sorts first, so it
        // consumes the single neededPerm leg; the template's own marker
        // stays literal (same shape as the slice-141 injection leg).
        assert_eq!(
            fill_denial_template(&format!("M:{m} P:{n}"), "X${neededPerm}Y", "N"),
            "M:XNY P:${neededPerm}"
        );
        // No-occurrence templates and empty fills are no-ops.
        assert_eq!(
            fill_denial_template("plain text", "<@1>", "N"),
            "plain text"
        );
        assert_eq!(
            fill_denial_template(&format!("M:{m} P:{n}"), "<@1>", ""),
            "M:<@1> P:"
        );
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

    #[tokio::test]
    async fn owner_flag_is_table_first_with_legacy_fallback() {
        let pool = crate::db::memory_pool().await;
        assert!(!is_owner(&pool, "g", "u1").await);
        // Legacy-only kv row (pre-migration data) still reads.
        crate::db::kv_set(&pool, "g", "OWNER.u1.owner", "true")
            .await
            .unwrap();
        assert!(is_owner(&pool, "g", "u1").await);
        assert!(!is_owner(&pool, "g", "u2").await);
        // Table-routed write keeps the legacy kv row fresh for
        // unmigrated readers (keys unchanged).
        crate::db::tbl_set(&pool, "g", "OWNER.u2.owner", "true")
            .await
            .unwrap();
        assert!(is_owner(&pool, "g", "u2").await);
        assert_eq!(
            crate::db::kv_get(&pool, "g", "OWNER.u2.owner")
                .await
                .as_deref(),
            Some("true")
        );
    }

    #[tokio::test]
    async fn utils_json_is_table_first_with_legacy_fallback() {
        let pool = crate::db::memory_pool().await;
        assert_eq!(load_utils_json(&pool, "g").await, None);
        // Legacy-only kv blob still reads.
        let raw = r#"{"PERMS":{"ban":5}}"#;
        crate::db::kv_set(&pool, "g", "UTILS", raw).await.unwrap();
        assert_eq!(load_utils_json(&pool, "g").await.as_deref(), Some(raw));
        // Table-routed write round-trips and keeps the legacy row fresh.
        let raw2 = r#"{"PERMS":{"kick":3}}"#;
        crate::db::tbl_set(&pool, "g", "UTILS", raw2).await.unwrap();
        assert_eq!(load_utils_json(&pool, "g").await.as_deref(), Some(raw2));
        assert_eq!(
            crate::db::kv_get(&pool, "g", "UTILS").await.as_deref(),
            Some(raw2)
        );
    }
}

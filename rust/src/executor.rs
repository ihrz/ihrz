// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Command execution guards. Mirrors src/core/commandExecutor.ts (perms,
// cooldowns, rate-limit) + displayBotName.footerPaginationBuilder.
//
// Discord I/O stays in commands/handlers; this module holds the pure
// policy: per-user per-command cooldowns and page slicing.

use std::collections::HashMap;

/// In-memory cooldown tracker: (user, command) -> usable-again timestamp.
#[derive(Debug, Default)]
pub struct Cooldowns {
    inner: HashMap<(u64, String), i64>,
}

impl Cooldowns {
    /// Remaining ms before `user` may run `command` again; 0 = allowed.
    /// On allow, records now+cooldown_ms.
    pub fn check(&mut self, user: u64, command: &str, cooldown_ms: i64, now_ms: i64) -> i64 {
        let key = (user, command.to_string());
        let left = self
            .get(&key)
            .map(|ready| (ready - now_ms).max(0))
            .unwrap_or(0);
        if left == 0 {
            self.inner.insert(key, now_ms + cooldown_ms);
        }
        left
    }

    fn get(&self, key: &(u64, String)) -> Option<i64> {
        self.inner.get(key).copied()
    }
}

/// Page slice. Mirrors footerPaginationBuilder (1-based pages).
pub fn paginate<T: Clone>(items: &[T], page: usize, per_page: usize) -> Vec<T> {
    if per_page == 0 {
        return vec![];
    }
    let page = page.max(1);
    let start = (page - 1) * per_page;
    items.iter().skip(start).take(per_page).cloned().collect()
}

pub fn total_pages(count: usize, per_page: usize) -> usize {
    if per_page == 0 || count == 0 {
        return 0;
    }
    count.div_ceil(per_page)
}

/// Custom command permissions. Mirrors permissonsCalculator.ts +
/// UTILS.PERMS.<command> {users, roles, level} + UTILS.USER_PERMS.<uid>.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct CmdPerms {
    #[serde(default)]
    pub users: Vec<String>,
    #[serde(default)]
    pub roles: Vec<String>,
    pub level: Option<u8>,
}

/// Role-hierarchy level. Mirrors checkRoleHierarchy: the highest level
/// 1-9 whose mapped role id (`UTILS.roles` level -> role id) the member
/// holds; 0 when none match.
pub fn role_level(member_roles: &[u64], roles: &HashMap<String, String>) -> u8 {
    let mut level = 0u8;
    for n in 1..=9u8 {
        if roles
            .get(&n.to_string())
            .and_then(|r| r.parse::<u64>().ok())
            .map(|r| member_roles.contains(&r))
            .unwrap_or(false)
        {
            level = n;
        }
    }
    level
}

/// Mirrors checkExplicitRolePermission/checkUserPermLevel/hasPermissionRequirements.
pub fn check_cmd_access(
    user_id: u64,
    member_roles: &[u64],
    user_level: u8,
    perms: &CmdPerms,
) -> bool {
    let uid = user_id.to_string();
    if perms.users.iter().any(|u| u == &uid) {
        return true;
    }
    let has_role = perms.roles.iter().any(|r| {
        r.parse::<u64>()
            .map(|n| member_roles.contains(&n))
            .unwrap_or(false)
    });
    if has_role {
        return true;
    }
    match perms.level {
        Some(l) if l > 0 => user_level >= l,
        _ => perms.users.is_empty() && perms.roles.is_empty(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cooldown_blocks_then_releases() {
        let mut c = Cooldowns::default();
        assert_eq!(c.check(1, "daily", 1000, 0), 0);
        assert_eq!(c.check(1, "daily", 1000, 500), 500);
        assert_eq!(c.check(1, "daily", 1000, 1000), 0);
        // Other user / other command unaffected.
        assert_eq!(c.check(2, "daily", 1000, 500), 0);
        assert_eq!(c.check(1, "work", 1000, 500), 0);
    }

    #[test]
    fn pagination_slices() {
        let items: Vec<u32> = (1..=10).collect();
        assert_eq!(paginate(&items, 1, 3), vec![1, 2, 3]);
        assert_eq!(paginate(&items, 4, 3), vec![10]);
        let empty: Vec<u32> = paginate(&items, 5, 3);
        assert!(empty.is_empty());
        assert_eq!(total_pages(10, 3), 4);
        assert_eq!(total_pages(0, 3), 0);
    }

    #[test]
    fn perm_access_rules() {
        let open = CmdPerms::default();
        assert!(check_cmd_access(1, &[], 0, &open));
        let targeted = CmdPerms {
            users: vec!["1".into()],
            roles: vec![],
            level: None,
        };
        assert!(check_cmd_access(1, &[], 0, &targeted));
        assert!(!check_cmd_access(2, &[], 0, &targeted));
        let role_only = CmdPerms {
            users: vec![],
            roles: vec!["9".into()],
            level: Some(0),
        };
        assert!(check_cmd_access(2, &[9], 0, &role_only));
        assert!(!check_cmd_access(2, &[8], 0, &role_only));
        let leveled = CmdPerms {
            users: vec![],
            roles: vec![],
            level: Some(5),
        };
        assert!(check_cmd_access(2, &[], 5, &leveled));
        assert!(!check_cmd_access(2, &[], 4, &leveled));
    }

    #[test]
    fn role_level_takes_highest_mapped_role() {
        let roles: HashMap<String, String> = [
            ("1".to_string(), "11".to_string()),
            ("3".to_string(), "33".to_string()),
        ]
        .into_iter()
        .collect();
        assert_eq!(role_level(&[11, 33], &roles), 3);
        assert_eq!(role_level(&[11], &roles), 1);
        assert_eq!(role_level(&[99], &roles), 0);
        assert_eq!(role_level(&[], &roles), 0);
    }
}

use super::*;

use std::collections::HashMap;

/// Hierarchy snapshot for the addrole/delrole guard chain.
/// Mirrors utils !addrole.ts / !delrole.ts. `None` when the guild is
/// not cached: guards are skipped, never blocking.
struct RoleGuards {
    bot_admin: bool,
    bot_top: u16,
    author_top: u16,
    owner_id: u64,
}

fn role_top(roles: &HashMap<serenity::RoleId, serenity::Role>, ids: &[serenity::RoleId]) -> u16 {
    ids.iter()
        .filter_map(|r| roles.get(r))
        .map(|r| r.position)
        .max()
        .unwrap_or(0)
}

fn has_admin(roles: &HashMap<serenity::RoleId, serenity::Role>, ids: &[serenity::RoleId]) -> bool {
    ids.iter().any(|r| {
        roles
            .get(r)
            .map(|role| role.permissions.administrator())
            .unwrap_or(false)
    })
}

async fn role_guards(ctx: &Ctx<'_>, guild_id: serenity::GuildId) -> Option<RoleGuards> {
    let (bot_roles, author_roles, roles, owner_id) = {
        let cache = &ctx.serenity_context().cache;
        let guild = cache.guild(guild_id)?;
        let bot = guild.members.get(&cache.current_user().id)?.clone();
        let author_roles = cache
            .guild(guild_id)?
            .members
            .get(&ctx.author().id)
            .map(|m| m.roles.clone())
            .unwrap_or_default();
        (bot.roles, author_roles, guild.roles.clone(), guild.owner_id)
    };
    let bot_admin = has_admin(&roles, &bot_roles);
    Some(RoleGuards {
        bot_admin,
        bot_top: role_top(&roles, &bot_roles),
        author_top: role_top(&roles, &author_roles),
        owner_id: owner_id.get(),
    })
}

async fn app_emoji(http: &serenity::Http, name: &str, fallback: &str) -> String {
    crate::emojis::app_emoji_markup(http, name)
        .await
        .unwrap_or_else(|| fallback.to_string())
}

/// Whitelist gate shared by the addrole/delrole null-flow.
/// Mirrors `!allowed_roles?.includes(role?.id!) && allowed_roles!.length > 0`
/// negated: an empty list allows everything, a null role (`None`) never
/// matches so a non-empty list denies. Pure for unit tests.
pub(crate) fn wl_allows_role(allowed: &[String], role_id: Option<u64>) -> bool {
    match role_id {
        Some(id) => allowed.contains(&id.to_string()) || allowed.is_empty(),
        None => allowed.is_empty(),
    }
}

pub mod addrole;
pub mod addrolereact;
pub mod admin_roles;
pub mod delrole;
pub mod derank;
pub mod massiverole;
pub mod nickrole;
pub mod role_members;
pub mod rolelimit;
pub mod wlroles;

pub use self::addrole::addrole;
pub use self::addrolereact::addrolereact;
pub use self::admin_roles::admin_roles;
pub use self::delrole::delrole;
pub use self::derank::derank;
pub use self::massiverole::massiverole;
pub use self::nickrole::nickrole;
pub use self::role_members::role_members;
pub use self::rolelimit::rolelimit;
pub use self::wlroles::wlroles;

#[cfg(test)]
mod tests {
    use super::wl_allows_role;

    #[test]
    fn wl_gate_matches_ts_includes_semantics() {
        let list = vec!["11".to_string(), "22".to_string()];
        // Listed role passes; unlisted fails against a non-empty list.
        assert!(wl_allows_role(&list, Some(11)));
        assert!(!wl_allows_role(&list, Some(99)));
        // Null role (`role?.id` undefined) never matches: non-empty list
        // denies (TS answers not_wl), empty list allows through.
        assert!(!wl_allows_role(&list, None));
        assert!(wl_allows_role(&[], Some(99)));
        assert!(wl_allows_role(&[], None));
    }

    type LocCmd = poise::Command<crate::commands::Data, crate::commands::Error>;

    /// Find a leaf command anywhere in the registry by its (renamed) name.
    fn find_leaf<'a>(cmds: &'a [LocCmd], name: &str) -> &'a LocCmd {
        let mut hits = vec![];
        fn walk<'a>(cmds: &'a [LocCmd], name: &str, hits: &mut Vec<&'a LocCmd>) {
            for c in cmds {
                if c.name == name {
                    hits.push(c);
                }
                walk(&c.subcommands, name, hits);
            }
        }
        walk(cmds, name, &mut hits);
        assert_eq!(
            hits.len(),
            1,
            "expected exactly one /{name} leaf, found {}",
            hits.len()
        );
        hits[0]
    }

    /// (param name, required?) pairs in declaration order.
    fn params(cmd: &LocCmd) -> Vec<(String, bool)> {
        cmd.parameters
            .iter()
            .map(|p| (p.name.clone(), p.required))
            .collect()
    }

    #[test]
    fn role_class_params_run_the_ts_null_flow() {
        // The addrole/delrole-class fix: unresolvable prefix roles must
        // reach the body as None instead of ArgumentParse-ing first, so
        // every role param here is optional on both legs (slash names and
        // kinds unchanged: no new slash surface).
        let cmds = crate::commands::all();
        for leaf in ["addrole", "delrole", "massiverole", "nickrole", "rolelimit"] {
            let cmd = find_leaf(&cmds, leaf);
            let role = cmd
                .parameters
                .iter()
                .find(|p| p.name == "role")
                .unwrap_or_else(|| panic!("/{leaf} lost its role param"));
            assert!(
                !role.required,
                "/{leaf} role must be optional (TS null-flow)"
            );
        }
        assert_eq!(
            params(find_leaf(&cmds, "rolelimit"))
                .iter()
                .find(|(n, _)| n == "members-limit")
                .map(|(_, r)| *r),
            Some(false),
        );
    }

    #[test]
    fn utils_param_names_match_ts_option_names() {
        // Byte-exact slash option names from utils.ts / util.ts (wired via
        // #[rename] where the Rust field differs).
        let cmds = crate::commands::all();
        let expect: &[(&str, &[(&str, bool)])] = &[
            (
                "dm",
                &[("private", true), ("member", true), ("message", true)],
            ),
            (
                "setmentionrole",
                &[
                    ("action", true),
                    ("roles", false),
                    ("part-of-nickname", false),
                ],
            ),
            ("autorenew", &[("channel", true), ("time", true)]),
            // massmove `channel` stays optional in code (TS slash says
            // required, but the prefix null path is a silent return like
            // `if (toChannel === null) return`).
            ("massmove", &[("from", false), ("channel", false)]),
            ("move", &[("member", true), ("channel", true)]),
            ("emojis", &[("emojis", true)]),
            ("inviteinfo", &[("discord_invite", true)]),
            ("where", &[("member", true)]),
            ("rolelimit", &[("role", false), ("members-limit", false)]),
        ];
        for (leaf, want) in expect {
            let cmd = find_leaf(&cmds, leaf);
            let got = params(cmd);
            let want: Vec<(String, bool)> = want.iter().map(|(n, r)| (n.to_string(), *r)).collect();
            assert_eq!(got, want, "/{leaf} params diverged from TS");
        }
    }
}

#[allow(unused_imports)]
pub mod main {
    pub use super::addrole::*;
    pub use super::addrolereact::*;
    pub use super::admin_roles::*;
    pub use super::delrole::*;
    pub use super::derank::*;
    pub use super::massiverole::*;
    pub use super::nickrole::*;
    pub use super::role_members::*;
    pub use super::rolelimit::*;
    pub use super::wlroles::*;
    pub use super::*;
}

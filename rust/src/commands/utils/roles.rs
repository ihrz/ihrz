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

pub mod addrole;
pub mod admin_roles;
pub mod delrole;
pub mod derank;
pub mod massiverole;
pub mod nickrole;
pub mod role_members;
pub mod rolelimit;
pub mod wlroles;
pub mod wlroles_add;
pub mod wlroles_list;

pub use self::addrole::addrole;
pub use self::admin_roles::admin_roles;
pub use self::delrole::delrole;
pub use self::derank::derank;
pub use self::massiverole::massiverole;
pub use self::nickrole::nickrole;
pub use self::role_members::role_members;
pub use self::rolelimit::rolelimit;
pub use self::wlroles::wlroles;
pub use self::wlroles_add::wlroles_add;
pub use self::wlroles_list::wlroles_list;

#[allow(unused_imports)]
pub mod main {
    pub use super::addrole::*;
    pub use super::admin_roles::*;
    pub use super::delrole::*;
    pub use super::derank::*;
    pub use super::massiverole::*;
    pub use super::nickrole::*;
    pub use super::role_members::*;
    pub use super::rolelimit::*;
    pub use super::wlroles::*;
    pub use super::wlroles_add::*;
    pub use super::wlroles_list::*;
    pub use super::*;
}

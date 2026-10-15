use super::*;

fn is_guild_admin(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
    member: &poise::serenity_prelude::Member,
) -> bool {
    let roles = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.roles.clone())
        .unwrap_or_default();
    member.roles.iter().any(|r| {
        roles
            .get(r)
            .map(|role| role.permissions.administrator())
            .unwrap_or(false)
    })
}

/// Prefix count-check predicate shared by the voice leaves whose TS
/// option is required:true (wlvc/unwlvc `member` in
/// HybridCommands/utils/util/util.ts): a bare (or whitespace-only)
/// prefix invocation must render the caret usage embed via
/// `prefix_usage_denial`, mirroring TS checkCommandArgs.
fn prefix_member_missing(args: &str) -> bool {
    args.trim().is_empty()
}

pub mod bringall;
pub mod massmove;
pub mod renewvc;
pub mod talk;
pub mod untalk;
pub mod unwlvc;
pub mod vc_list;
pub mod vkick;
pub mod voicefreeze;
pub mod voicemove;
pub mod voiceunfreeze;
pub mod wlvc;

pub use self::bringall::bringall;
pub use self::massmove::massmove;
pub use self::renewvc::renewvc;
pub use self::talk::talk;
pub use self::untalk::untalk;
pub use self::unwlvc::unwlvc;
pub use self::vc_list::vc_list;
pub use self::vkick::vkick;
pub use self::voicefreeze::voicefreeze;
pub use self::voicemove::voicemove;
pub use self::voiceunfreeze::voiceunfreeze;
pub use self::wlvc::wlvc;

#[allow(unused_imports)]
pub mod main {
    pub use super::bringall::*;
    pub use super::massmove::*;
    pub use super::renewvc::*;
    pub use super::talk::*;
    pub use super::untalk::*;
    pub use super::unwlvc::*;
    pub use super::vc_list::*;
    pub use super::vkick::*;
    pub use super::voicefreeze::*;
    pub use super::voicemove::*;
    pub use super::voiceunfreeze::*;
    pub use super::wlvc::*;
    pub use super::*;
}

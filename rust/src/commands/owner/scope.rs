use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// Owner scope for one invocation. Mirrors the TS `run` dispatch.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum OwnerScope {
    Bot,
    Guild,
}

/// Mirrors `ownerHelper.isBotDev` (`client.owners` config list).
pub fn is_bot_dev(config_owners: &[String], user_id: u64) -> bool {
    config_owners.iter().any(|o| o == &user_id.to_string())
}

/// Resolve the caller's scope: merged bot owners first, then merged guild
/// owners (Discord `ownerId` + stored rows). Neither -> `None` (TS `run`
/// then does nothing).
pub async fn owner_scope(ctx: &Ctx<'_>) -> Option<OwnerScope> {
    let author = ctx.author().id.get().to_string();
    if crate::db::bot_owner_ids(&ctx.data().pool, &ctx.data().config.owners)
        .await
        .iter()
        .any(|o| o == &author)
    {
        return Some(OwnerScope::Bot);
    }
    if let Some(gid) = ctx.guild_id() {
        let discord_owner = discord_owner_id(ctx, gid);
        let owners =
            crate::db::guild_owner_ids(&ctx.data().pool, &gid.get().to_string(), discord_owner)
                .await;
        if owners.iter().any(|o| o == &author) {
            return Some(OwnerScope::Guild);
        }
    }
    None
}

/// Discord-side guild owner id from cache. Mirrors the `guild.ownerId`
/// half of `getGuildOwner()`.
pub fn discord_owner_id(ctx: &Ctx<'_>, guild_id: serenity::GuildId) -> Option<u64> {
    ctx.serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.owner_id.get())
}

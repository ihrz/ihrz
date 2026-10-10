use super::*;

// Bypass-roles group. TS (!bypass-roles.ts) is a multi-select REPLACE
// panel (min 0 / max 20, save writes the whole array, selecting nothing
// clears it); the flattened slash/prefix port exposes the same power as
// add / remove / clear / list legs.
const KEY: &str = "GUILD.ANTISPAM.BYPASS_ROLES";

/// Subcommand for bypass-roles category!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "bypass-roles",
    aliases("bproles"),
    subcommands(
        "as_bypass_roles_add",
        "as_bypass_roles_remove",
        "as_bypass_roles_clear",
        "as_bypass_roles_list"
    ),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
)]
pub async fn as_bypass_roles(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

async fn guild_id_of(ctx: &Ctx<'_>) -> String {
    ctx.guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default()
}

async fn lang_of(ctx: &Ctx<'_>) -> String {
    crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await
}

/// Add a role for a certain amount of money!
#[poise::command(slash_command, prefix_command, rename = "add")]
pub async fn as_bypass_roles_add(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let gid = guild_id_of(&ctx).await;
    let mut list: Vec<String> = load_string_list(&ctx.data().pool, &gid, KEY).await;
    let id = role.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        save_string_list(&ctx.data().pool, &gid, KEY, &list).await?;
    }
    let code = lang_of(&ctx).await;
    ctx.say(
        crate::lang::get(&code, "msg_bypass_role_added")
            .unwrap_or_else(|| "Bypass role added.".to_string()),
    )
    .await?;
    Ok(())
}

/// Remove Streamer/Youtuber/Twitcher
#[poise::command(slash_command, prefix_command, rename = "remove")]
pub async fn as_bypass_roles_remove(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let gid = guild_id_of(&ctx).await;
    let list: Vec<String> = load_string_list(&ctx.data().pool, &gid, KEY).await;
    let id = role.id.get().to_string();
    let kept: Vec<String> = list.into_iter().filter(|r| r != &id).collect();
    save_string_list(&ctx.data().pool, &gid, KEY, &kept).await?;
    let code = lang_of(&ctx).await;
    // New key with an exact en-US fallback (YAML owned by the lead:
    // `msg_bypass_role_removed`).
    ctx.say(
        crate::lang::get(&code, "msg_bypass_role_removed")
            .unwrap_or_else(|| "Bypass role removed.".to_string()),
    )
    .await?;
    Ok(())
}

/// Clear a amount of message in the channel !
#[poise::command(slash_command, prefix_command, rename = "clear")]
pub async fn as_bypass_roles_clear(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = guild_id_of(&ctx).await;
    save_string_list(&ctx.data().pool, &gid, KEY, &[]).await?;
    let code = lang_of(&ctx).await;
    // New key with an exact en-US fallback (YAML owned by the lead:
    // `msg_bypass_roles_cleared`).
    ctx.say(
        crate::lang::get(&code, "msg_bypass_roles_cleared")
            .unwrap_or_else(|| "Bypass roles cleared.".to_string()),
    )
    .await?;
    Ok(())
}

/// List all sticky channels
#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn as_bypass_roles_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = guild_id_of(&ctx).await;
    let list: Vec<String> = load_string_list(&ctx.data().pool, &gid, KEY).await;
    let code = lang_of(&ctx).await;
    let text = if list.is_empty() {
        crate::lang::get(&code, "setjoinroles_var_none").unwrap_or_else(|| "None".to_string())
    } else {
        list.iter()
            .map(|r| format!("<@&{r}>"))
            .collect::<Vec<_>>()
            .join(", ")
    };
    ctx.say(text).await?;
    Ok(())
}

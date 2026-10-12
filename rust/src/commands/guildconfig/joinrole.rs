use super::*;
use poise::serenity_prelude as serenity;

/// Join role add/clear (N-role array).
// Mirrors the welcomer panel `saveRoles` / `handleRolesPick`
// (`SlashCommands/guildconfig/welcomerPanel.ts:1107-1125,1233-1299`):
// the stored `GUILD.GUILD_CONFIG.joinroles` value is an array of N
// role ids. Adding a role appends to the array and preserves the
// co-configured roles (a legacy single-string row folds in as the
// first entry); omitting the role clears the field.
// UX split (documented, not a regression): the panel's role-select
// multi-pick plus dangerous-permission confirmation
// (`askDangerousConfirm`, 20s button collector) has no poise
// equivalent at this scope, so this stays an atomic setter. What IS
// mirrored 1:1: the `ManageRoles` bot guard (`:1237-1247`,
// `setjoinroles_var_perm_issue`) and the `ihorizon_logs` audit post
// on set (`saveRoles`, `:1118-1125`, `setjoinroles_logs_embed_*_on_enable`).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "joinrole",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_joinrole(
    ctx: Ctx<'_>,
    #[description = "Role to add (omit to clear)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors `handleRolesPick` (`welcomerPanel.ts:1237-1247`): without
    // ManageRoles the bot could store a role it can never assign.
    if !bot_can_manage_roles(&ctx).await {
        ctx.say(
            crate::lang::get(&code, "setjoinroles_var_perm_issue")
                .unwrap_or_else(|| "I do not have permission to manage roles.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let has_role = role.is_some();
    let mut cfg = load_guild_config(pool, &gid).await;
    match role {
        Some(r) => {
            let id = r.id.get().to_string();
            let mut ids: Vec<String> = match cfg.get("joinroles") {
                Some(serde_json::Value::Array(a)) => a
                    .iter()
                    .filter_map(|x| x.as_str().map(|s| s.to_string()))
                    .collect(),
                Some(serde_json::Value::String(s)) if !s.is_empty() => vec![s.clone()],
                _ => Vec::new(),
            };
            if !ids.iter().any(|x| x == &id) {
                ids.push(id);
            }
            welcomer_set(
                &mut cfg,
                "joinroles",
                Some(serde_json::Value::Array(
                    ids.into_iter().map(serde_json::Value::String).collect(),
                )),
            );
        }
        None => {
            welcomer_set(&mut cfg, "joinroles", None);
        }
    }
    super::welcomer::save_guild_config_routed(pool, &gid, &cfg).await?;
    if has_role {
        // Mirrors `saveRoles` (`welcomerPanel.ts:1118-1125`): every set
        // posts the join-roles audit embed. (The clear path has no TS
        // counterpart — the panel only ever saves picked arrays.)
        let author_id = ctx.author().id.get().to_string();
        let title = crate::lang::get(&code, "setjoinroles_logs_embed_title_on_enable")
            .unwrap_or_else(|| "SetJoinRoles Logs".to_string());
        let desc = crate::lang::get(&code, "setjoinroles_logs_embed_description_on_enable")
            .map(|s| s.replace("${interaction.user.id}", &author_id))
            .unwrap_or_else(|| format!("<@{author_id}> set the join roles!"));
        super::joindm::post_joindm_log(&ctx, &title, &desc).await;
        ctx.say(
            crate::lang::get(&code, "msg_join_role_set")
                .unwrap_or_else(|| "Join role set.".to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::lang::get(&code, "msg_join_role_cleared")
                .unwrap_or_else(|| "Join role cleared.".to_string()),
        )
        .await?;
    }
    Ok(())
}

/// Bot-side ManageRoles check. Mirrors the panel `handleRolesPick`
/// guard (`welcomerPanel.ts:1237-1241`, discord.js
/// `members.me.permissions.has(ManageRoles)`): the guild owner passes
/// implicitly, like serenity's `member_permissions`. A cold guild
/// cache skips the guard (fail-open, like TS reading the same cache)
// rather than blocking the command on a false negative.
async fn bot_can_manage_roles(ctx: &Ctx<'_>) -> bool {
    let Some(guild_id) = ctx.guild_id() else {
        return false;
    };
    let cache = ctx.serenity_context().cache.clone();
    let bot_id = cache.current_user().id;
    let Ok(member) = guild_id.member(ctx.http(), bot_id).await else {
        return false;
    };
    let Some(guild) = cache.guild(guild_id) else {
        return true;
    };
    guild.member_permissions(&member).manage_roles()
}

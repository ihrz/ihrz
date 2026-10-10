use super::*;
use poise::serenity_prelude as serenity;

/// Join role add/clear (N-role array).
// Mirrors the welcomer panel `saveRoles`
// (`SlashCommands/guildconfig/welcomerPanel.ts:1109-1114`): the
// stored `GUILD.GUILD_CONFIG.joinroles` value is an array of N role
// ids. Adding a role appends to the array and preserves the
// co-configured roles (a legacy single-string row folds in as the
// first entry); omitting the role clears the field.
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
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let mut cfg = load_guild_config(pool, &gid).await;
    let has_role = role.is_some();
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
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if has_role {
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

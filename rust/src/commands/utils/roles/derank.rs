use super::*;

/// Remove all roles from a member. Mirrors !derank.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "derank",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn derank(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // TS falls back to the invoker when prefix resolution fails, and
    // replies perm_list_no_user only when both are missing.
    let target_id = user.id;
    let member = match guild_id.member(ctx.http(), target_id).await {
        Ok(m) => m,
        Err(_) => {
            ctx.say(t("perm_list_no_user")).await?;
            return Ok(());
        }
    };
    // Author-hierarchy guard. Mirrors !derank.ts
    // (utils_delrole_highter_or_egal_roles_msg).
    let guards = role_guards(&ctx, guild_id).await;
    let author_id = ctx.author().id.get();
    let owner_id = guards.as_ref().map(|g| g.owner_id).unwrap_or(author_id);
    let author_top = guards.as_ref().map(|g| g.author_top).unwrap_or(u16::MAX);
    let target_top = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| role_top(&g.roles, &member.roles));
    if let Some(target_pos) = target_top {
        if author_top <= target_pos && owner_id != author_id {
            let stop = app_emoji(ctx.http(), "Stop", "⛔").await;
            ctx.say(
                t("utils_delrole_highter_or_egal_roles_msg")
                    .replace("${client.iHorizon_Emojis.Stop}", &stop),
            )
            .await?;
            return Ok(());
        }
    }
    // Never strip @everyone. Mirrors the TS everyone filter.
    let everyone = serenity::RoleId::new(guild_id.get());
    let roles: Vec<poise::serenity_prelude::RoleId> = member
        .roles
        .iter()
        .copied()
        .filter(|r| *r != everyone)
        .collect();
    if roles.is_empty() {
        ctx.say(t("derank_no_role")).await?;
        return Ok(());
    }
    let mut good = 0;
    let mut bad = 0;
    for role in roles {
        if member.remove_role(ctx.http(), role).await.is_ok() {
            good += 1;
        } else {
            bad += 1;
        }
    }
    if good == 0 && bad > 0 {
        ctx.say(t("derank_msg_failed")).await?;
        return Ok(());
    }
    ctx.say(
        t("derank_msg_desc_embed")
            .replace("${good}", &good.to_string())
            .replace("${bad}", &bad.to_string())
            .replace("${member.id}", &target_id.get().to_string()),
    )
    .await?;
    Ok(())
}

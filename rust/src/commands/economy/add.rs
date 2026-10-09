use super::*;

/// Shop role add. Mirrors `!add.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-add",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn eco_role_add(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
    #[description = "Price"] price: f64,
) -> Result<(), anyhow::Error> {
    // NOTE: !add.ts has no disabled gate — none here either.
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_shop(&ctx.data().pool, &gid).await;
    let id = role.id.get().to_string();
    // Warn before selling a role with dangerous permissions. Mirrors
    // the roleDangerousPermissions promptYesOrNo gate in economy/!add.ts
    // (abort -> economy_role_add_canceled).
    let perm_keys: [(&str, &str); 10] = [
        ("setjoinroles_var_perm_admin", "Administrator"),
        ("setjoinroles_var_perm_manage_guild", "Manage Server"),
        ("setjoinroles_var_perm_manage_role", "Manage Roles"),
        ("setjoinroles_var_perm_use_mention", "Mention Everyone"),
        ("setjoinroles_var_perm_ban_members", "Ban Members"),
        ("setjoinroles_var_perm_kick_members", "Kick Members"),
        ("setjoinroles_var_perm_manage_webhooks", "Manage Webhooks"),
        ("setjoinroles_var_perm_manage_channels", "Manage Channels"),
        (
            "setjoinroles_var_perm_manage_expression",
            "Manage Expressions",
        ),
        (
            "setjoinroles_var_perm_view_monetization_analytics",
            "View Monetization Analytics",
        ),
    ];
    let mut owned = Vec::with_capacity(10);
    for (key, fallback) in perm_keys {
        owned.push(crate::commands::lang_for(&ctx, key, fallback).await);
    }
    let names: [&str; 10] = owned
        .iter()
        .map(|s| s.as_str())
        .collect::<Vec<_>>()
        .try_into()
        .unwrap_or(["?"; 10]);
    let dangerous = crate::funcs::dangerous_role_perms(role.permissions.bits(), names);
    if !dangerous.is_empty() {
        let listed = dangerous
            .iter()
            .map(|n| format!("`{n}`"))
            .collect::<Vec<_>>()
            .join(", ");
        let content = crate::commands::lang_for(
            &ctx,
            "economy_role_add_prompt_dangerous",
            "Are you sure? Dangerous permissions: ${stringDangerousPermissions}",
        )
        .await
        .replace("${stringDangerousPermissions}", &listed);
        let yes = crate::commands::lang_for(&ctx, "var_yes", "Yes").await;
        let no = crate::commands::lang_for(&ctx, "var_no", "No").await;
        if !crate::commands::prompt_yes_or_no(&ctx, content, yes, no, true).await? {
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "economy_role_add_canceled",
                    "Role not added to the shop.",
                )
                .await,
            )
            .await?;
            return Ok(());
        }
    }
    // TS blocks at >= 20 keys even for updates, and stores the raw
    // amount (negatives allowed).
    if roles.len() >= 20 {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "economy_role_add_max_20_roles",
                "You can only have up to 20 buyable roles.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    roles.insert(
        id.clone(),
        ShopEntry {
            price,
            boost: roles.get(&id).and_then(|e| e.boost),
        },
    );
    save_shop(&ctx.data().pool, &gid, &roles).await?;
    // TS replies with the buyable-roles embed, then posts the log.
    send_with_footer(&ctx, buyable_roles_embed(&ctx, &roles).await).await?;
    let author = user_mention(ctx.author().id.get());
    let role_m = role_mention(role.id.get());
    let price_s = fmt_num(price);
    post_economy_log(
        &ctx,
        "economy_logs_role_add_title",
        "economy_logs_role_add_desc",
        &[("author", &author), ("role", &role_m), ("amount", &price_s)],
    )
    .await?;
    Ok(())
}

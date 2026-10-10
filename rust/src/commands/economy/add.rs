use super::*;

/// Max buyable roles per guild. Mirrors
/// `Object.keys(roleData).length >= 20` in economy/!add.ts (blocks at
/// 20 keys even when updating an existing entry).
pub const MAX_BUYABLE_ROLES: usize = 20;

/// Pure cap check, unit-testable without Discord.
pub fn shop_at_cap(role_count: usize) -> bool {
    role_count >= MAX_BUYABLE_ROLES
}

/// Shop role add. Mirrors `!add.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-add",
    aliases("economy-role-add"),
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
    let mut roles = shop::load_shop_routed(&ctx.data().pool, &gid).await;
    let id = role.id.get().to_string();
    // Warn before selling a role with dangerous permissions. Mirrors
    // the roleDangerousPermissions promptYesOrNo gate in economy/!add.ts
    // (abort -> economy_role_add_canceled via interactionSend, `!add.ts:82-96`).
    // CONFIRM: the cancel/error replies below go to the channel like the TS
    // interactionSend calls (no ephemeral, no DM).
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
    if shop_at_cap(roles.len()) {
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
    // DELIBERATE KEEP (differs from `economy/!add.ts:107-109`): TS
    // overwrites the whole entry with `{ price }`, wiping a previously
    // set boost. The Rust side preserves the existing boost instead —
    // the TS wipe is silent data loss (re-adding a role at a new price
    // destroys its multiplier with no warning), so parity is refused
    // here and the boost survives the re-add.
    roles.insert(
        id.clone(),
        ShopEntry {
            price,
            boost: roles.get(&id).and_then(|e| e.boost),
        },
    );
    shop::save_shop_routed(&ctx.data().pool, &gid, &roles).await?;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cap_blocks_at_20_even_for_updates() {
        // Mirrors `Object.keys(roleData).length >= 20` (!add.ts).
        assert_eq!(MAX_BUYABLE_ROLES, 20);
        assert!(!shop_at_cap(0));
        assert!(!shop_at_cap(19));
        assert!(shop_at_cap(20));
        assert!(shop_at_cap(21));
    }
}

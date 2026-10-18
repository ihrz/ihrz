// Split from `main.rs`: role picker + dangerous-perm flow. Pure move, no logic change.

use poise::serenity_prelude as serenity;

use super::command::*;
use super::constants::*;
use super::render::*;

/// Lang keys + en-US fallbacks for the dangerous-permission names, in
/// DANGEROUS_PERMISSION_BITS order. Mirrors getDangerousPermissions in
/// src/core/functions/method.ts (the economy !add.ts port uses this
/// same set).
pub const DANGEROUS_PERM_KEYS: [(&str, &str); 10] = [
    ("setjoinroles_var_perm_admin", "Administrator"),
    ("setjoinroles_var_perm_manage_guild", "Manage Server"),
    ("setjoinroles_var_perm_manage_role", "Manage Roles"),
    (
        "setjoinroles_var_perm_use_mention",
        "Use @everyone @here and ping roles",
    ),
    ("setjoinroles_var_perm_ban_members", "Ban Members"),
    ("setjoinroles_var_perm_kick_members", "Kick Members"),
    ("setjoinroles_var_perm_manage_webhooks", "Manage webhooks"),
    ("setjoinroles_var_perm_manage_channels", "Manage channels"),
    (
        "setjoinroles_var_perm_manage_expression",
        "Manage emojis, stickers and soundboard",
    ),
    (
        "setjoinroles_var_perm_view_monetization_analytics",
        "View creator monetization and analytics",
    ),
];

/// Role picker: ManageRoles gate, dangerous-perm confirm, too-high warn.
/// Mirrors handleRolesPick + askDangerousConfirm + saveRoles.
pub(crate) async fn handle_roles_pick(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let picked: Vec<String> =
        if let serenity::ComponentInteractionDataKind::RoleSelect { values } = &comp.data.kind {
            values.iter().map(|r| r.get().to_string()).collect()
        } else {
            vec![]
        };
    let guild = guild_id.to_partial_guild(&ctx.http).await?;
    let bot_id = ctx.cache.current_user().id;
    let bot = guild_id.member(&ctx.http, bot_id).await?;
    let manage = ctx
        .cache
        .guild(guild_id)
        .map(|g| g.member_permissions(&bot).manage_roles())
        .unwrap_or(false);
    if !manage {
        ephemeral(ctx, comp, t(lang_code, "setjoinroles_var_perm_issue")).await;
        return Ok(());
    }
    // Key set mirrors getDangerousPermissions in
    // src/core/functions/method.ts (same order as
    // DANGEROUS_PERMISSION_BITS); the economy !add.ts port uses this
    // same set. Fallbacks mirror en-US.yml.
    let mut owned = Vec::with_capacity(DANGEROUS_PERM_KEYS.len());
    for (key, fallback) in DANGEROUS_PERM_KEYS {
        owned.push(crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string()));
    }
    let arr: [&str; 10] = owned
        .iter()
        .map(|s| s.as_str())
        .collect::<Vec<_>>()
        .try_into()
        .unwrap_or(["?"; 10]);
    // Per-role dangerous entries, mirroring askDangerousConfirm's
    // addFields (`name: @role (id)`, value: backticked perm names).
    let mut dangerous: Vec<(String, Vec<String>)> = vec![];
    for rid in &picked {
        let Ok(id) = rid.parse::<u64>() else {
            continue;
        };
        let Some(role) = guild.roles.get(&serenity::RoleId::new(id)) else {
            continue;
        };
        let held = crate::funcs::dangerous_role_perms(role.permissions.bits(), arr);
        if !held.is_empty() {
            dangerous.push((format!("@{} ({})", role.name, role.id.get()), held));
        }
    }
    if !dangerous.is_empty() {
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            PENDING_ROLES_FIELD,
            Some(serde_json::json!(picked)),
        );
        crate::commands::guildconfig::save_guild_config(pool, gid, &cfg).await?;
        let mut embed = serenity::CreateEmbed::default()
            .title(t(lang_code, "setjoinroles_warn_title"))
            .description(t(lang_code, "setjoinroles_warn_dangerous_perm"))
            .colour(PANEL_ACCENT);
        for (name, perms) in &dangerous {
            let value = perms
                .iter()
                .map(|p| format!("`{p}`"))
                .collect::<Vec<_>>()
                .join(", ");
            embed = embed.field(name.clone(), value, false);
        }
        let row = serenity::CreateActionRow::Buttons(vec![
            button(
                "welcomer-dangerous-yes",
                t(lang_code, "var_yes"),
                serenity::ButtonStyle::Danger,
                false,
            ),
            button(
                "welcomer-dangerous-no",
                t(lang_code, "var_no"),
                serenity::ButtonStyle::Secondary,
                false,
            ),
        ]);
        let _ = comp
            .create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .components(vec![row])
                        .ephemeral(true),
                ),
            )
            .await;
        return Ok(());
    }
    save_roles(ctx, comp, pool, gid, lang_code, &picked).await
}

/// Persist the picked roles + too-high warn. Mirrors saveRoles.
pub(crate) async fn save_roles(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    picked: &[String],
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let mut cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
    crate::commands::guildconfig::welcomer_set(
        &mut cfg,
        "joinroles",
        Some(serde_json::json!(picked)),
    );
    crate::commands::guildconfig::welcomer_set(&mut cfg, PENDING_ROLES_FIELD, None);
    crate::commands::guildconfig::save_guild_config(pool, gid, &cfg).await?;
    post_panel_log(
        &ctx.http,
        guild_id,
        t(lang_code, "setjoinroles_logs_embed_title_on_enable"),
        t(lang_code, "setjoinroles_logs_embed_description_on_enable")
            .replace("${interaction.user.id}", &comp.user.id.get().to_string()),
    )
    .await;
    // Too-high warn (roles above the bot's top role). Mirrors
    // saveRoles' addFields (`name: @role (id)`, value: role mention +
    // positions vs the bot).
    let mut too_high: Vec<(String, String, u16)> = vec![];
    let mut bot_top: u16 = 0;
    let mut bot_mention = String::new();
    if let Ok(guild) = guild_id.to_partial_guild(&ctx.http).await {
        let bot_id = ctx.cache.current_user().id;
        if let Ok(bot) = guild_id.member(&ctx.http, bot_id).await {
            bot_top = bot
                .roles
                .iter()
                .filter_map(|r| guild.roles.get(r))
                .map(|r| r.position)
                .max()
                .unwrap_or(0);
            bot_mention = format!("<@{}>", bot.user.id.get());
            for rid in picked {
                if let Ok(id) = rid.parse::<u64>() {
                    if let Some(role) = guild.roles.get(&serenity::RoleId::new(id)) {
                        if bot_top <= role.position {
                            too_high.push((
                                format!("@{} ({})", role.name, role.id.get()),
                                role.id.get().to_string(),
                                role.position,
                            ));
                        }
                    }
                }
            }
        }
    }
    if !too_high.is_empty() {
        let mut embed = serenity::CreateEmbed::default()
            .title(t(lang_code, "setjoinroles_warn_title"))
            .description(t(lang_code, "setjoinroles_too_highter_roles"))
            .colour(PANEL_ACCENT);
        for (name, rid, position) in &too_high {
            embed = embed.field(
                name.clone(),
                format!("<@&{rid}>: `{position}` vs {bot_mention}: `{bot_top}`"),
                false,
            );
        }
        let _ = comp
            .channel_id
            .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
            .await;
    }
    rerender(ctx, comp, pool, gid, lang_code).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn dangerous_perm_keys_resolve() {
        // Regression guard: the warn embed lists these keys, so a
        // renamed key must be caught here, not as an empty perm name
        // in the warning.
        assert_eq!(
            DANGEROUS_PERM_KEYS.len(),
            crate::funcs::DANGEROUS_PERMISSION_BITS.len()
        );
        for (key, _) in DANGEROUS_PERM_KEYS {
            let v = crate::lang::get("en-US", key).unwrap_or_default();
            assert!(!v.is_empty(), "{key} missing in en-US");
        }
    }
}

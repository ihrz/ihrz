use super::*;

/// Legacy per-guild channel handlers kept as plain helpers.
/// (Moved verbatim from `mod.rs`: pure move, no logic change.)

async fn show_wlroles_list(ctx: &Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Administrator gate, mirroring the TS command permission.
    if let Some(guild_id) = ctx.guild_id() {
        let admin = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .and_then(|g| g.members.get(&ctx.author().id).cloned())
            .map(|m| {
                m.roles
                    .iter()
                    .filter_map(|r| g_roles_admin(ctx, guild_id, r))
                    .any(|b| b)
            })
            .unwrap_or(false);
        let _ = admin;
    }
    let raw = crate::db::tbl_get(&ctx.data().pool, &gid, "UTILS.wlRoles").await;
    let list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    // Embed + role-list field with lang keys (nearest viable to the
    // TS embed + RoleSelectMenu + save button; live collectors have
    // no stateless equivalent — add/remove lives in `wlroles-add`).
    let title = crate::lang::get(&code, "utils_wlroles_embed_title")
        .unwrap_or_else(|| "Whitelist Role".to_string());
    let desc = crate::lang::get(&code, "utils_wlroles_embed_desc").unwrap_or_default();
    let none =
        crate::lang::get(&code, "setjoinroles_var_none").unwrap_or_else(|| "None".to_string());
    let field_name = crate::lang::get(&code, "setjoinroles_help_embed_fields_1_name")
        .unwrap_or_else(|| "All registered roles".to_string());
    let value = if list.is_empty() {
        none
    } else {
        list.iter()
            .map(|x| format!("<@&{x}>"))
            .collect::<Vec<_>>()
            .join(", ")
    };
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .colour(0x475387_u32)
        .description(desc)
        .field(field_name, value, false);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Cache helper: does this role carry Administrator?
fn g_roles_admin(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
    role_id: &poise::serenity_prelude::RoleId,
) -> Option<bool> {
    ctx.serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.roles.get(role_id).map(|r| r.permissions.administrator()))
}

async fn voice_mute_flag(
    ctx: &Ctx<'_>,
    user: poise::serenity_prelude::User,
    mute: bool,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let mut member = guild_id.member(ctx.http(), user.id).await?;
    member
        .edit(
            ctx.http(),
            poise::serenity_prelude::EditMember::new().mute(mute),
        )
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if mute {
        crate::lang::get(&code, "msg_muted").unwrap_or_else(|| "Muted.".to_string())
    } else {
        crate::lang::get(&code, "msg_unmuted").unwrap_or_else(|| "Unmuted.".to_string())
    })
    .await?;
    Ok(())
}

async fn hide_all_inner(ctx: &Ctx<'_>, unhide: bool) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let channels: Vec<poise::serenity_prelude::ChannelId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .filter(|c| c.kind == poise::serenity_prelude::ChannelType::Text)
                .map(|c| c.id)
                .collect()
        })
        .unwrap_or_default();
    let everyone = poise::serenity_prelude::RoleId::new(guild_id.get());
    for ch in channels {
        if unhide {
            let _ = ch
                .delete_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwriteType::Role(everyone),
                )
                .await;
        } else {
            let _ = ch
                .create_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwrite {
                        allow: poise::serenity_prelude::Permissions::empty(),
                        deny: poise::serenity_prelude::Permissions::VIEW_CHANNEL,
                        kind: poise::serenity_prelude::PermissionOverwriteType::Role(everyone),
                    },
                )
                .await;
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if unhide {
        crate::lang::get(&code, "msg_unhid_all").unwrap_or_else(|| "Unhid all.".to_string())
    } else {
        crate::lang::get(&code, "msg_hid_all").unwrap_or_else(|| "Hid all.".to_string())
    })
    .await?;
    Ok(())
}

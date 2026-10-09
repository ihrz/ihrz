use super::*;

/// Unhide a channel for a role. Mirrors chanel !unhide.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unhide",
    aliases("démasquer", "demasquer"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn chan_unhide(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
    #[description = "Role, defaults to @everyone"] role: Option<poise::serenity_prelude::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let ch_id = match &channel {
        Some(c) => c.id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    let role_id = role
        .as_ref()
        .map(|r| r.id.get())
        .unwrap_or_else(|| guild_id.get());
    let mention = format!("<@&{role_id}>");
    if !overwrite_denies_view(&ctx, guild_id, ch_id, role_id).unwrap_or(false) {
        ctx.say(
            crate::lang::get(&code, "channel_unhide_already_visible")
                .map(|s| s.replace("@everyone", &mention))
                .unwrap_or_else(|| "This channel is already visible to @everyone".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS clears ViewChannel:null: drop VIEW_CHANNEL from the deny set,
    // preserving the rest of the overwrite.
    let (allow, deny) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&ch_id).cloned())
        .and_then(|c| {
            c.permission_overwrites.iter().find_map(|o| match o.kind {
                poise::serenity_prelude::PermissionOverwriteType::Role(id)
                    if id.get() == role_id =>
                {
                    Some((o.allow, o.deny))
                }
                _ => None,
            })
        })
        .unwrap_or((
            poise::serenity_prelude::Permissions::empty(),
            poise::serenity_prelude::Permissions::VIEW_CHANNEL,
        ));
    let deny = deny.difference(poise::serenity_prelude::Permissions::VIEW_CHANNEL);
    if ch_id
        .create_permission(
            ctx.http(),
            poise::serenity_prelude::PermissionOverwrite {
                allow,
                deny,
                kind: poise::serenity_prelude::PermissionOverwriteType::Role(
                    poise::serenity_prelude::RoleId::new(role_id),
                ),
            },
        )
        .await
        .is_err()
    {
        ctx.say(
            crate::lang::get(&code, "renew_dont_have_permission")
                .unwrap_or_else(|| ":x: **Can't** `Don't have permission!`".to_string()),
        )
        .await?;
        return Ok(());
    }
    ctx.say(
        crate::lang::get(&code, "channel_unhide_success")
            .map(|s| s.replace("@everyone", &mention))
            .unwrap_or_else(|| "The channel is now visible to @everyone".to_string()),
    )
    .await?;
    Ok(())
}

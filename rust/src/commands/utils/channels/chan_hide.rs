use super::*;

/// Hide a channel from a role. Mirrors chanel !hide.ts.
// TS always hides the current channel; the optional `channel` param is
// a Rust extension defaulting to current. Unmanageable channels count
// as permission errors (per-channel `manageable` gate).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "hide",
    aliases("masquer"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn chan_hide(
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
    let chan_snapshot: Option<poise::serenity_prelude::GuildChannel> = match &channel {
        Some(c) => Some(c.clone()),
        None => ctx.guild_channel().await,
    };
    let Some(chan_snapshot) = chan_snapshot else {
        return Ok(());
    };
    let ch_id = chan_snapshot.id;
    // Per-channel `manageable` gate (covers hierarchy/ownership beyond
    // the bot-union ManageChannels check): unmanageable -> permission
    // error reply, like the TS `!channel.manageable` early return.
    if !channel_manageable(&ctx, guild_id, ch_id) {
        ctx.say(
            crate::lang::get(&code, "renew_dont_have_permission")
                .unwrap_or_else(|| ":x: **Can't** `Don't have permission!`".to_string()),
        )
        .await?;
        return Ok(());
    }
    let role_id = role
        .as_ref()
        .map(|r| r.id.get())
        .unwrap_or_else(|| guild_id.get());
    let mention = format!("<@&{role_id}>");
    if overwrite_denies_view(&ctx, guild_id, ch_id, role_id).unwrap_or(false) {
        ctx.say(
            crate::lang::get(&code, "channel_hide_already_hidden")
                .map(|s| s.replace("@everyone", &mention))
                .unwrap_or_else(|| "This channel is already hidden from @everyone".to_string()),
        )
        .await?;
        return Ok(());
    }
    if ch_id
        .create_permission(
            ctx.http(),
            poise::serenity_prelude::PermissionOverwrite {
                allow: poise::serenity_prelude::Permissions::empty(),
                deny: poise::serenity_prelude::Permissions::VIEW_CHANNEL,
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
        crate::lang::get(&code, "channel_hide_success")
            .map(|s| s.replace("@everyone", &mention))
            .unwrap_or_else(|| "Channel has been hidden from @everyone".to_string()),
    )
    .await?;
    Ok(())
}

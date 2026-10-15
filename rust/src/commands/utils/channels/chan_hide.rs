use super::*;

/// Hide the current channel from everyone
// TS always hides the current channel.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "hide",
    aliases("masquer"),
    default_member_permissions = "MANAGE_CHANNELS",
    description_localized("fr", "Masquer le salon actuel pour everyone"),
    description_localized("ja", "現在のチャンネルを全員から非表示"),
    description_localized("ru", "Скрыть текущий канал от всех"),
    description_localized("es-ES", "Ocultar el canal actual de todos")
)]
pub async fn chan_hide(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le rôle que tu veux masquer dans le salon")]
    #[description_localized("ja", "チャンネルで非表示にしたいロール")]
    #[description_localized("ru", "роль, которую нужно скрыть в канале")]
    #[description_localized("es-ES", "el rol que quieres ocultar en el canal")]
    #[description = "the role that you want to hide into the channel"]
    role: Option<poise::serenity_prelude::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(chan_snapshot) = ctx.guild_channel().await else {
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
        .create_permission(ctx.http(), {
            // TS `edit(role, { ViewChannel: false })` merges with the
            // existing overwrite: deny bit set, allow bit cleared,
            // other bits preserved (create_permission replaces the
            // whole overwrite, so merge here).
            let (allow, deny) = role_overwrite(&ctx, guild_id, ch_id, role_id);
            let allow = allow.difference(poise::serenity_prelude::Permissions::VIEW_CHANNEL);
            let deny = deny.union(poise::serenity_prelude::Permissions::VIEW_CHANNEL);
            poise::serenity_prelude::PermissionOverwrite {
                allow,
                deny,
                kind: poise::serenity_prelude::PermissionOverwriteType::Role(
                    poise::serenity_prelude::RoleId::new(role_id),
                ),
            }
        })
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

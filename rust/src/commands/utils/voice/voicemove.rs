use super::*;

/// Move one member between voice channels. Mirrors utils move.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "move",
    aliases("déplacer", "switch"),
    default_member_permissions = "MOVE_MEMBERS",
    description_localized("fr", "Déplacer un membre d'un salon vocal"),
    description_localized("ja", "ユーザーをボイスチャンネルから移動。"),
    description_localized("ru", "Переместить пользователя из голосового канала."),
    description_localized("es-ES", "Mover a un usuario de un canal de voz.")
)]
pub async fn voicemove(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le membre que vous voulez déplacer")]
    #[description_localized("ja", "移動したいメンバー")]
    #[description_localized("ru", "Участник для перемещения")]
    #[description_localized("es-ES", "El miembro que quieres mover")]
    #[description = "Member"]
    // TS HybridCommands/utils/util/util.ts registers "member" / "channel" (!move.ts).
    #[rename = "member"]
    user: poise::serenity_prelude::User,
    #[description_localized("fr", "Le salon vocal que tu veux.")]
    #[description_localized("ja", "希望するチャンネル")]
    #[description_localized("ru", "Желаемый канал")]
    #[description_localized("es-ES", "El canal que deseas")]
    #[description = "To channel"]
    #[channel_types("Voice")]
    // TS HybridCommands/utils/util/util.ts registers the destination as "channel".
    #[rename = "channel"]
    to: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    // Admin-victim guard. Mirrors !move.ts: a non-admin invoker cannot
    // move a member holding Administrator.
    let victim_admin = guild_id
        .member(ctx.http(), user.id)
        .await
        .ok()
        .map(|m| is_guild_admin(&ctx, guild_id, &m))
        .unwrap_or(false);
    if victim_admin {
        let invoker_admin = guild_id
            .member(ctx.http(), ctx.author().id)
            .await
            .ok()
            .map(|m| is_guild_admin(&ctx, guild_id, &m))
            .unwrap_or(false);
        if !invoker_admin {
            ctx.say(
                crate::lang::get(&code, "util_move_impossible_to_move_admin").unwrap_or_else(|| {
                    "The member you want to move is an administrator, and you are not an administrator either.".to_string()
                }),
            )
            .await?;
            return Ok(());
        }
    }
    match guild_id.move_member(ctx.http(), user.id, to.id).await {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "util_move_command_ok")
                    .map(|s| {
                        s.replace("${member?.toString()}", &format!("<@{}>", user.id.get()))
                            .replace("${channel.toString()}", &format!("<#{}>", to.id.get()))
                    })
                    .unwrap_or_else(|| {
                        "${member?.toString()} is now in ${channel.toString()}".to_string()
                    }),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "util_move_not_in_vc").unwrap_or_else(|| {
                    "The member you want to move is not connected to any voice channel".to_string()
                }),
            )
            .await?
        }
    };
    Ok(())
}

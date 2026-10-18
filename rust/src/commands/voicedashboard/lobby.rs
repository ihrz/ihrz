use super::*;

/// Set the channel for Join4Create!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-voice-channel",
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définit le salon où le membre se connecte pour créer son propre canal"
    ),
    description_localized("ja", "Join4Createのチャンネルを設定！"),
    description_localized("ru", "Установить канал для Join4Create!"),
    description_localized("es-ES", "Establecer el canal para Join4Create!")
)]
pub async fn vd_lobby(
    ctx: Ctx<'_>,
    #[description = "The channel you want"]
    #[description_localized(
        "fr",
        "Le salon où les gens devront rejoindre pour créer leur propre salon"
    )]
    #[description_localized("ja", "希望するチャンネル")]
    #[description_localized("ru", "Желаемый канал")]
    #[description_localized("es-ES", "El canal que deseas")]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the Administrator leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::ADMINISTRATOR,
    )
    .await
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel"),
        &channel.id.get().to_string(),
    )
    .await?;
    // Ack mirrors !set-voice-channel.ts (`Yes | <#id>`).
    let yes = yes_markup(ctx.http()).await;
    ctx.say(format!("{yes} | <#{}>", channel.id.get())).await?;
    Ok(())
}

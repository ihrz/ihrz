use super::*;

/// Set the channel where the voice channel will be created!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-voice-channel-catgory",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Définit la catégorie où le canal perso va être créé"),
    description_localized("ja", "ボイスチャンネルが作成されるチャンネルを設定！"),
    description_localized("ru", "Установить канал, где будет создан голосовой канал!"),
    description_localized("es-ES", "Establecer el canal donde se creará el canal de voz!")
)]
pub async fn vd_category(
    ctx: Ctx<'_>,
    // TS SlashCommands/voicedashboard/!set-voice-channel-catgory.ts reads getChannel("category").
    #[description = "The category you want"]
    #[description_localized("fr", "La catégorie que vous voulez")]
    #[description_localized("ja", "希望するカテゴリ")]
    #[description_localized("ru", "Желаемая категория")]
    #[description_localized("es-ES", "La categoría que deseas")]
    #[channel_types("Category")]
    #[rename = "category"]
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
        &vd_key("voice_channel_category"),
        &channel.id.get().to_string(),
    )
    .await?;
    // Ack mirrors !set-voice-channel-catgory.ts (`Yes | <#id>`).
    let yes = yes_markup(ctx.http()).await;
    ctx.say(format!("{yes} | <#{}>", channel.id.get())).await?;
    Ok(())
}

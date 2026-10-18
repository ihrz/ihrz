use super::*;

/// Set the voice channel name when it will be created!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-voice-channel-name",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Définit le nom du salon où le canal va être créé"),
    description_localized("ja", "ボイスチャンネル作成時の名前を設定！"),
    description_localized("ru", "Установить имя голосового канала при его создании!"),
    description_localized("es-ES", "Establecer el nombre del canal de voz cuando se cree!")
)]
pub async fn vd_name(
    ctx: Ctx<'_>,
    // TS SlashCommands/voicedashboard/!set-voice-channel-name.ts reads getString("channel_name").
    #[description = "The name you want | Variable: {Username}"]
    #[description_localized("fr", "Le nom que tu veux | Variable: {Username}")]
    #[description_localized("ja", "希望する名前 | 変数: {Username}")]
    #[description_localized("ru", "Желаемое имя | Переменная: {Username}")]
    #[description_localized("es-ES", "El nombre que deseas | Variable: {Username}")]
    #[rename = "channel_name"]
    template: String,
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
    let name = template.trim().to_string();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel_name"),
        &name,
    )
    .await?;
    // Ack mirrors !set-voice-channel-name.ts (`Yes | <name>`).
    let yes = yes_markup(ctx.http()).await;
    ctx.say(format!("{yes} | {name}")).await?;
    Ok(())
}

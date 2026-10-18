use super::*;

/// Voice-channel position choice. Mirrors the `position_type`
/// top/bottom choices in voicedashboard.ts:198-219 (display names `Up
/// (TOP)` / `Down (Bottom)`, localized per locale): slash shows the
/// two choices, and a bad prefix value is rejected by the framework
/// instead of silently storing a default.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum PositionChoice {
    #[name = "top"]
    #[name_localized("en-US", "Up (TOP)")]
    #[name_localized("en-GB", "Up (TOP)")]
    #[name_localized("fr", "En haut")]
    #[name_localized("ja", "up_top")]
    #[name_localized("ru", "up_top")]
    #[name_localized("es-ES", "up_top")]
    Top,
    #[name = "bottom"]
    #[name_localized("en-US", "Down (Bottom)")]
    #[name_localized("en-GB", "Down (Bottom)")]
    #[name_localized("fr", "En bas")]
    #[name_localized("ja", "down_bottom")]
    #[name_localized("ru", "down_bottom")]
    #[name_localized("es-ES", "down_bottom")]
    Bottom,
}

impl PositionChoice {
    /// Stored `VOICE_INTERFACE.voice_channel_position` value.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Top => "top",
            Self::Bottom => "bottom",
        }
    }
}

/// Set the voice channel position in the category when it will be created!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-voice-channel-position",
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définit la position du salon où le canal perso va être créé dans la catégorie"
    ),
    description_localized("ja", "ボイスチャンネル作成時のカテゴリ内の位置を設定！"),
    description_localized("ru", "Установить позицию голосового канала в категории при создании!"),
    description_localized(
        "es-ES",
        "Establecer la posición del canal de voz en la categoría cuando se cree!"
    )
)]
pub async fn vd_position(
    ctx: Ctx<'_>,
    // TS SlashCommands/voicedashboard/!set-voice-channel-position.ts reads getString("position_type").
    #[description = "The position type you want"]
    #[description_localized("fr", "Quelle position veux-tu pour le salon ?")]
    #[description_localized("ja", "希望する位置タイプ")]
    #[description_localized("ru", "Желаемый тип позиции")]
    #[description_localized("es-ES", "El tipo de posición que deseas")]
    #[rename = "position_type"]
    position: PositionChoice,
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
    let pos = position.as_str();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel_position"),
        pos,
    )
    .await?;
    // Ack mirrors !set-voice-channel-position.ts (`Yes | ⬆/⬇`).
    let yes = yes_markup(ctx.http()).await;
    ctx.say(format!("{yes} | {}", if pos == "top" { "⬆" } else { "⬇" }))
        .await?;
    Ok(())
}

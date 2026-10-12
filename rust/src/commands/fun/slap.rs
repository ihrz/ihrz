use super::*;

// Slap command. Mirrors fun !slap.ts.
// `user` is required like the TS slash option (`required: true` in
// fun.ts): poise raises an argument error on a bare prefix call, so the
// prefix path has no invoker fallback (TS slap had none either —
// `slap?.id` rendered "undefined" — while hug/kiss fell back to the
// invoker via `|| interaction.author`, both dropped here since the
// option is required). The invoker fallback still documented inside
// `social_gif` is unreachable defensive cover; single deny lives there
// too (see below).
/// Slap a user!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "slap",
    name_localized("fr", "giflé"),
    name_localized("ja", "slap"),
    name_localized("ru", "slap"),
    name_localized("es-ES", "slap"),
    description_localized("fr", "Gifler un utilisateur"),
    description_localized("ja", "ユーザーを平手打ち！"),
    description_localized("ru", "Дать пощечину пользователю!"),
    description_localized("es-ES", "Abofetear a un usuario!")
)]
pub async fn slap(
    ctx: Ctx<'_>,
    #[description_localized("fr", "L'utilisateur que vous voulez gifler")]
    #[description_localized("ja", "平手打ちしたいユーザー")]
    #[description_localized("ru", "Пользователь, которому вы хотите дать пощечину")]
    #[description_localized("es-ES", "El usuario que quieres abofetear")]
    #[description = "The user you want to slap"]
    user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `social_gif`.
    social_gif(
        &ctx,
        Some(&user),
        "slap",
        "slap_embed_description",
        "<@${interaction.user.id}> slaps <@${slap.id}> 😓",
        0x42FF08,
        "${slap.id}",
    )
    .await
}

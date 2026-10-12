use super::*;

// Hug command. Mirrors fun !hug.ts.
// `user` is required like the TS slash option (`required: true` in
// fun.ts): poise raises an argument error on a bare prefix call, so
// the TS prefix invoker fallback (`|| interaction.author`) is
// intentionally dropped. The invoker fallback still documented inside
// `social_gif` is unreachable defensive cover; single deny lives there
// too (see below).
/// Hug a user!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "hug",
    name_localized("fr", "calin"),
    name_localized("ja", "hug"),
    name_localized("ru", "hug"),
    name_localized("es-ES", "hug"),
    description_localized("fr", "Faire un calin d'un utilisateur"),
    description_localized("ja", "ユーザーをハグ！"),
    description_localized("ru", "Обнять пользователя!"),
    description_localized("es-ES", "Abrazar a un usuario!")
)]
pub async fn hug(
    ctx: Ctx<'_>,
    #[description_localized("fr", "L'utilisateur que vous souhaitez faire un calin")]
    #[description_localized("ja", "ハグしたいユーザー")]
    #[description_localized("ru", "Пользователь, которого вы хотите обнять")]
    #[description_localized("es-ES", "El usuario que quieres abrazar")]
    #[description = "The user you want to hug"]
    user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `social_gif`.
    social_gif(
        &ctx,
        Some(&user),
        "hug",
        "hug_embed_title",
        "<@${interaction.user.id}> gives a hug to <@${hug.id}> ❤️",
        0xFFB6C1,
        "${hug.id}",
    )
    .await
}

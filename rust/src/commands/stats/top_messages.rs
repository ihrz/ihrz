use super::*;

/// Top messages (text ranking; PNG blocked, see mod.rs).
// Mirrors stats top-messages: period + limit options, window counts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "top-messages",
    aliases("tm", "topm"),
    description_localized("fr", "Voir le top des utilisateurs par messages"),
    description_localized("ja", "メッセージ数トップユーザーを表示"),
    description_localized("ru", "Показать топ пользователей по сообщениям"),
    description_localized("es-ES", "Ver usuarios top por mensajes")
)]
pub async fn stats_top_messages(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Période (quotidien, hebdomadaire, mensuel)")]
    #[description_localized("ja", "期間（デイリー、ウィークリー、マンスリー）")]
    #[description_localized("ru", "Период (ежедневно, еженедельно, ежемесячно)")]
    #[description_localized("es-ES", "Período de tiempo (diario, semanal, mensual)")]
    #[description = "Period: daily, weekly or monthly"]
    period: Option<String>,
    #[description_localized("fr", "Nombre d'utilisateurs à afficher (par défaut: 10, max: 25)")]
    #[description_localized("ja", "表示するユーザー数（デフォルト: 10, 最大: 25）")]
    #[description_localized(
        "ru",
        "Количество пользователей для отображения (по умолчанию: 10, макс: 25)"
    )]
    #[description_localized("es-ES", "Número de usuarios a mostrar (predeterminado: 10, máx: 25)")]
    #[description = "Rows shown (5-25)"]
    limit: Option<i64>,
) -> Result<(), anyhow::Error> {
    // The 5..=25 clamp is prefix-only (TS clamps just the message-arg
    // leg); the slash option passes through with a default of 10.
    let limit = if matches!(ctx, poise::Context::Prefix(_)) {
        clamp_top_limit(limit)
    } else {
        slash_top_limit(limit)
    };
    top_by(&ctx, "messages", parse_top_period(period.as_deref()), limit).await
}

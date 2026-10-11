use super::*;

/// Top voice (text ranking with beautiful durations).
// Mirrors stats top-voice: period + limit options; PNG blocked (mod.rs).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "top-voice",
    aliases("tv", "topv"),
    description_localized("fr", "Voir le top des utilisateurs par activité vocale"),
    description_localized("ja", "ボイスアクティビティトップユーザーを表示"),
    description_localized("ru", "Показать топ пользователей по голосовой активности"),
    description_localized("es-ES", "Ver usuarios top por actividad de voz")
)]
pub async fn stats_top_voice(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Période (quotidien, hebdomadaire, mensuel)")]
    #[description_localized("ja", "期間（デイリー、ウィークリー、マンスリー）")]
    #[description_localized("ru", "Период (ежедневно, еженедельно, ежемесячно)")]
    #[description_localized("es-ES", "Período de tiempo (diario, semanal, mensual)")]
    #[description = "Period: daily, weekly or monthly"]
    period: Option<super::TopPeriod>,
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
    top_by(
        &ctx,
        "voice",
        parse_top_period(period.map(|p| p.as_str())),
        limit,
    )
    .await
}

use super::*;

/// `topVoiceLeaderboard` HTML card
/// (`src/assets/html/topVoiceLeaderboard.html`, TS
/// `!top-voice.ts:123`).
const TOP_VOICE_CARD_TEMPLATE: &str =
    include_str!("../../../../src/assets/html/topVoiceLeaderboard.html");

/// html2png options mirror (TS `!top-voice.ts:192-199`).
/// `height` is dynamic: `Math.min(1080, 200 + topUsers.length * 120)`.
pub fn top_voice_options_json(n: usize) -> String {
    format!(
        "{{\"width\":1902,\"height\":{},\"scaleSize\":3,\"elementSelector\":\".container\",\"omitBackground\":true,\"selectElement\":true}}",
        top_board_height(n)
    )
}

/// Every template value for the `topVoiceLeaderboard` card.
/// `{top_voice_users}` carries pre-rendered row HTML.
pub struct TopVoiceCardData {
    pub header_h1_value: String,
    pub guild_pfp: String,
    pub author_username: String,
    pub member_count: String,
    pub current_date: String,
    pub period_label: String,
    pub top_voice_users: String,
    pub top_voice_title: String,
    pub top_active_users_title: String,
    pub var_members: String,
}

/// Fill the `topVoiceLeaderboard` template. Mirrors the replace
/// chain in TS `!top-voice.ts:143-190`.
pub fn top_voice_card_html(d: &TopVoiceCardData) -> String {
    TOP_VOICE_CARD_TEMPLATE
        .replace("{header_h1_value}", &d.header_h1_value)
        .replace("{guild_pfp}", &d.guild_pfp)
        .replace("{author_username}", &d.author_username)
        .replace("{member_count}", &d.member_count)
        .replace("{current_date}", &d.current_date)
        .replace("{period_label}", &d.period_label)
        .replace("{top_voice_users}", &d.top_voice_users)
        .replace("{top_voice_title}", &d.top_voice_title)
        .replace("{top_active_users_title}", &d.top_active_users_title)
        .replace("{var_members}", &d.var_members)
}

/// See top users by voice activity
///
/// Text ranking with beautiful durations, rendered through
/// HorizonGateway with the text form kept as fallback.
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
    #[description = "Time period (daily, weekly, monthly)"]
    period: Option<super::TopPeriod>,
    #[description_localized("fr", "Nombre d'utilisateurs à afficher (par défaut: 10, max: 25)")]
    #[description_localized("ja", "表示するユーザー数（デフォルト: 10, 最大: 25）")]
    #[description_localized(
        "ru",
        "Количество пользователей для отображения (по умолчанию: 10, макс: 25)"
    )]
    #[description_localized("es-ES", "Número de usuarios a mostrar (predeterminado: 10, máx: 25)")]
    #[description = "Number of users to show (default: 10, max: 25)"]
    limit: Option<i64>,
) -> Result<(), anyhow::Error> {
    // The 5..=25 clamp is prefix-only (TS clamps just the message-arg
    // leg); the slash option passes through with a default of 10.
    let limit: i64 = if matches!(ctx, poise::Context::Prefix(_)) {
        clamp_top_limit(limit) as i64
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

#[cfg(test)]
mod top_voice_card_tests {
    use super::*;

    #[test]
    fn fill_replaces_every_placeholder() {
        let d = TopVoiceCardData {
            header_h1_value: "H".to_string(),
            guild_pfp: "P".to_string(),
            author_username: "G".to_string(),
            member_count: "3".to_string(),
            current_date: "D".to_string(),
            period_label: "L".to_string(),
            top_voice_users: "U".to_string(),
            top_voice_title: "T".to_string(),
            top_active_users_title: "A".to_string(),
            var_members: "M".to_string(),
        };
        let html = top_voice_card_html(&d);
        for ph in [
            "{header_h1_value}",
            "{guild_pfp}",
            "{author_username}",
            "{member_count}",
            "{current_date}",
            "{period_label}",
            "{top_voice_users}",
            "{top_voice_title}",
            "{top_active_users_title}",
            "{var_members}",
        ] {
            assert!(!html.contains(ph), "placeholder left: {ph}");
        }
        // Dynamic height mirrors Math.min(1080, 200 + n*120).
        assert!(top_voice_options_json(3).contains("\"height\":560"));
        assert!(top_voice_options_json(25).contains("\"height\":1080"));
    }
}

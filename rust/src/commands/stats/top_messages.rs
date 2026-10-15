use super::*;

/// `topMessagesLeaderboard` HTML card
/// (`src/assets/html/topMessagesLeaderboard.html`, TS
/// `!top-messages.ts:123`).
const TOP_MESSAGES_CARD_TEMPLATE: &str =
    include_str!("../../../../src/assets/html/topMessagesLeaderboard.html");

/// html2png options mirror (TS `!top-messages.ts:186-193`).
/// `height` is dynamic: `Math.min(1080, 200 + topUsers.length * 120)`.
pub fn top_messages_options_json(n: usize) -> String {
    format!(
        "{{\"width\":1902,\"height\":{},\"scaleSize\":3,\"elementSelector\":\".container\",\"omitBackground\":true,\"selectElement\":true}}",
        top_board_height(n)
    )
}

/// Every template value for the `topMessagesLeaderboard` card.
/// `{top_message_users}` carries pre-rendered row HTML.
pub struct TopMessagesCardData {
    pub header_h1_value: String,
    pub guild_pfp: String,
    pub author_username: String,
    pub member_count: String,
    pub current_date: String,
    pub period_label: String,
    pub top_message_users: String,
    pub top_active_users_title: String,
    pub var_members: String,
}

/// Fill the `topMessagesLeaderboard` template. Mirrors the replace
/// chain in TS `!top-messages.ts:143-184`.
pub fn top_messages_card_html(d: &TopMessagesCardData) -> String {
    TOP_MESSAGES_CARD_TEMPLATE
        .replace("{header_h1_value}", &d.header_h1_value)
        .replace("{guild_pfp}", &d.guild_pfp)
        .replace("{author_username}", &d.author_username)
        .replace("{member_count}", &d.member_count)
        .replace("{current_date}", &d.current_date)
        .replace("{period_label}", &d.period_label)
        .replace("{top_message_users}", &d.top_message_users)
        .replace("{top_active_users_title}", &d.top_active_users_title)
        .replace("{var_members}", &d.var_members)
}

/// See top users by messages
///
/// Text ranking (text form), rendered through HorizonGateway with
/// the text form kept as fallback.
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
        "messages",
        parse_top_period(period.map(|p| p.as_str())),
        limit,
    )
    .await
}

#[cfg(test)]
mod top_messages_card_tests {
    use super::*;

    #[test]
    fn fill_replaces_every_placeholder() {
        let d = TopMessagesCardData {
            header_h1_value: "H".to_string(),
            guild_pfp: "P".to_string(),
            author_username: "G".to_string(),
            member_count: "3".to_string(),
            current_date: "D".to_string(),
            period_label: "L".to_string(),
            top_message_users: "U".to_string(),
            top_active_users_title: "T".to_string(),
            var_members: "M".to_string(),
        };
        let html = top_messages_card_html(&d);
        for ph in [
            "{header_h1_value}",
            "{guild_pfp}",
            "{author_username}",
            "{member_count}",
            "{current_date}",
            "{period_label}",
            "{top_message_users}",
            "{top_active_users_title}",
            "{var_members}",
        ] {
            assert!(!html.contains(ph), "placeholder left: {ph}");
        }
        // Dynamic height mirrors Math.min(1080, 200 + n*120).
        assert!(top_messages_options_json(0).contains("\"height\":200"));
        assert!(top_messages_options_json(10).contains("\"height\":1080"));
    }
}

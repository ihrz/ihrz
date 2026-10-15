use super::*;

/// Too-new-account action choice. Mirrors the `action` option `choices`
/// in guildconfig.ts:162-183 (`block` -> `too-new-account`): slash shows
/// the localized display names, the handler maps each variant back to
/// the TS `value`.
///
/// NOTE (TS-exact): the command carries the required `action` param
/// (`guildconfig.ts:150-186`, required `on` / `off` choices) plus the
/// optional `minimum-date` / `maximum-join` params. The handler reads
/// `getString("action")` (`!too-new-account.ts:44`) and branches
/// `on` (`:48-110`, needs `minimum-date`) vs `off` (`:111-132`,
/// deletes without needing a date) — there is no Message branch, so
/// no merged free-form `age` fallback. This enum pins the TS slash
/// contract and its `value` mapping.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum TooNewAction {
    #[name = "on"]
    #[name_localized("en-US", "Power On")]
    #[name_localized("en-GB", "Power On")]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "power_on")]
    #[name_localized("ru", "power_on")]
    #[name_localized("es-ES", "power_on")]
    On,
    #[name = "off"]
    #[name_localized("en-US", "Power Off")]
    #[name_localized("en-GB", "Power Off")]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "power_off")]
    #[name_localized("ru", "power_off")]
    #[name_localized("es-ES", "power_off")]
    Off,
}

impl TooNewAction {
    /// TS `value` (`on` / `off`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Default `maximum-join` when the option is omitted. Mirrors
/// `interaction.options.getNumber("maximum-join") || 3` in
/// !too-new-account.ts.
pub const TOONEW_DEFAULT_MAX_JOIN: i64 = 3;

/// Resolve the effective maximum-join count. Mirrors the TS `|| 3`
/// fallback (a missing, zero or negative option falls back to 3).
pub fn tonew_max_join(raw: Option<i64>) -> i64 {
    match raw {
        Some(n) if n > 0 => n,
        _ => TOONEW_DEFAULT_MAX_JOIN,
    }
}

/// Render the enable reply: `too_new_account_logEmbed_desc_on_enable`
/// (user / beautiful time / guild name / maxJoin) plus the
/// `too_new_account_command_work_on_enable2` suffix (Sparkles /
/// maxJoin). Mirrors the editReply chain in !too-new-account.ts.
pub fn render_tonew_enable(
    template: &str,
    suffix: &str,
    user_mention: &str,
    beautiful: &str,
    guild_name: &str,
    max_join: i64,
    sparkles: &str,
) -> String {
    let head = template
        .replace("${interaction.user}", user_mention)
        .replace("${beautifulTime}", beautiful)
        .replace("${interaction.guild?.name}", guild_name)
        .replace("${maxJoin}", &max_join.to_string());
    let tail = suffix
        .replace("${client.iHorizon_Emojis.Sparkles}", sparkles)
        .replace("${maxJoin}", &max_join.to_string());
    format!("{head}{tail}")
}

/// Post one #bf0bb9 embed to the name-contains `ihorizon-logs`
/// channel. Mirrors `client.func.ihorizon_logs` (best-effort, silent
/// when missing).
async fn post_tonew_log(ctx: &Ctx<'_>, title: &str, description: &str) {
    use poise::serenity_prelude::{CreateEmbed, CreateMessage};
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = ctx.http().get_channels(guild_id).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|c| (c.id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let embed = CreateEmbed::default()
        .colour(0xBF0BB9)
        .title(title.to_string())
        .description(description.to_string());
    let _ = poise::serenity_prelude::ChannelId::new(log_id)
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await;
}

/// Toonew command.
// TS path `guildconfig block too-new-account` (`guildconfig.ts`
// `block` group leaf; fr name `compte-trop-recent`).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "too-new-account",
    name_localized("fr", "compte-trop-recent"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_toonew(
    ctx: Ctx<'_>,
    // TS guildconfig.ts (`block` -> `too-new-account`) registers
    // required `action` (guildconfig.ts:150-186) plus optional
    // "minimum-date" / "maximum-join".
    #[description = "What you want to do?"]
    #[description_localized("fr", "Que veux-tu faire?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    action: TooNewAction,
    // TS guildconfig.ts (`block` -> `too-new-account`) registers
    // "minimum-date" / "maximum-join".
    #[description = "Minimum seniority time"]
    #[description_localized("fr", "Temps minimum d'ancienneté")]
    #[description_localized("ja", "最低アカウント経過時間")]
    #[description_localized("ru", "Минимальное время существования аккаунта")]
    #[description_localized("es-ES", "Tiempo mínimo de antigüedad")]
    #[rename = "minimum-date"]
    age: Option<String>,
    #[description = "Maximum join before ban"]
    #[description_localized(
        "fr",
        "Montant de join maximum possible de l'utilisateur avant sont bannisement"
    )]
    #[description_localized("ja", "バン前の最大参加回数")]
    #[description_localized("ru", "Максимум входов до бана")]
    #[description_localized("es-ES", "Máximo de uniones antes del ban")]
    #[rename = "maximum-join"]
    maximum_join: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    // Ack-first: audit post + write run past the 3s slash window.
    ctx.defer().await?;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let author_mention = format!("<@{}>", ctx.author().id.get());
    // Mirrors `if (action === "off")` in !too-new-account.ts:111-132:
    // the off action deletes the row without needing `minimum-date`.
    if action == TooNewAction::Off {
        let _ = crate::db::tbl_del(pool, &gid, "GUILD.BLOCK_NEW_ACCOUNT").await;
        // Audit entry, like `client.func.ihorizon_logs` in
        // !too-new-account.ts (off branch).
        let title = crate::lang::get(&code, "too_new_account_logEmbed_title")
            .unwrap_or_else(|| "TooNewAccount Module".to_string());
        let desc = crate::lang::get(&code, "too_new_account_logEmbed_desc_on_disable")
            .map(|s| s.replace("${interaction.user}", &author_mention))
            .unwrap_or_else(|| format!("{author_mention} has disabled the module!"));
        post_tonew_log(&ctx, &title, &desc).await;
        ctx.say(crate::lang::get(&code, "too_new_account_command_work_on_disable")
                .map(|s| s.replace("${interaction.user}", &author_mention))
                .unwrap_or_else(|| "${interaction.user}, the module has been successfully disabled. New members' account creation dates will no longer be checked.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Mirrors `if (action === "on") { if (!maximumDate) ... }` in
    // !too-new-account.ts:48-54: enabling without a date hits the
    // `dont_specified_time` leg instead of parsing.
    let Some(age) = age else {
        ctx.say(crate::lang::get(&code, "too_new_account_dont_specified_time_on_enable")
                .unwrap_or_else(|| {
                    "You did not specify a time. To enable this module, a minimum account age is required!".to_string()
                }),
        )
        .await?;
        return Ok(());
    };
    // Full unit table (mo/y + FR variants), like
    // `client.timeCalculator.to_ms` in !too-new-account.ts.
    let Some(ms) = crate::commands::confession::parse_cooldown_ms(&age) else {
        ctx.say(crate::lang::get(&code, "too_new_account_invalid_time_on_enable")
                .unwrap_or_else(|| "The time you entered is not valid! **Example of valid time**: `3h; 30m; 4mo; 4w; 4y` -> 3 hours; 30 minutes; 4 month(s); 4 weeks; 4 years".to_string()),
        )
        .await?;
        return Ok(());
    };
    let max_join = tonew_max_join(maximum_join);
    crate::db::tbl_set(
        pool,
        &gid,
        "GUILD.BLOCK_NEW_ACCOUNT",
        &serde_json::json!({"state": true, "req": ms, "maxJoin": max_join}).to_string(),
    )
    .await?;
    let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
    // Multi-unit echo with the guild language's short unit names, like
    // `client.timeCalculator.to_beautiful_string(calculatedTime, lang)`.
    let units = crate::commands::confession::duration_unit_names(&code);
    let beautiful = crate::commands::confession::beautiful_duration_lang(
        ms,
        [
            units[0].as_str(),
            units[1].as_str(),
            units[2].as_str(),
            units[3].as_str(),
            units[4].as_str(),
            units[5].as_str(),
            units[6].as_str(),
        ],
    );
    // Audit entry, like `client.func.ihorizon_logs` in
    // !too-new-account.ts (on branch). VERDICT — keep the real guild
    // name: TS fills `${interaction.guild?.name}` with
    // `beautifulTime.toString()` (duration text where the guild name
    // belongs), an obvious copy-paste slip repeated in the reply leg
    // below. Mirroring it would render e.g. "in 7 days" where the
    // server name belongs, so both legs substitute the guild name.
    let title = crate::lang::get(&code, "too_new_account_logEmbed_title")
        .unwrap_or_else(|| "TooNewAccount Module".to_string());
    let audit = crate::lang::get(&code, "too_new_account_logEmbed_desc_on_enable")
        .map(|s| {
            s.replace("${interaction.user}", &author_mention)
                .replace("${beautifulTime}", &beautiful)
                .replace("${interaction.guild?.name}", &guild_name)
                .replace("${maxJoin}", &max_join.to_string())
        })
        .unwrap_or_else(|| {
            format!("{author_mention} enabled the TooNewAccount module. Accounts must now be at least {beautiful} old, and if a user joins more than `{max_join}` times, they will be banned.")
        });
    // Audit post + emoji fetch are independent: one round-trip.
    let ((), sparkles) = tokio::join!(post_tonew_log(&ctx, &title, &audit), async {
        crate::emojis::app_emoji_markup(ctx.http(), "Sparkles")
            .await
            .unwrap_or_else(|| "✨".to_string())
    });
    let reply_template = crate::lang::get(&code, "too_new_account_logEmbed_desc_on_enable")
        .unwrap_or_else(|| "${interaction.user} enabled the TooNewAccount module. Accounts must now be at least ${beautifulTime} old, and if a user joins more than `${maxJoin}` times, they will be banned.".to_string());
    let reply_suffix =
        crate::lang::get(&code, "too_new_account_command_work_on_enable2").unwrap_or_default();
    ctx.say(render_tonew_enable(
        &reply_template,
        &reply_suffix,
        &author_mention,
        &beautiful,
        &guild_name,
        max_join,
        &sparkles,
    ))
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use poise::ChoiceParameter as _;

    #[test]
    fn toonew_action_choices_mirror_ts_names_values_and_locales() {
        let names: Vec<_> = TooNewAction::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["on", "off"]);
        assert_eq!(TooNewAction::On.as_str(), "on");
        assert_eq!(TooNewAction::Off.as_str(), "off");
        assert_eq!(TooNewAction::from_name("on"), Some(TooNewAction::On));
        assert_eq!(TooNewAction::from_name("off"), Some(TooNewAction::Off));
        assert_eq!(TooNewAction::from_name("bogus"), None);
        assert_eq!(TooNewAction::from_index(0), Some(TooNewAction::On));
        assert_eq!(TooNewAction::from_index(1), Some(TooNewAction::Off));
        let list = TooNewAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Désactiver")
        );
    }

    #[test]
    fn max_join_defaults_to_three() {
        assert_eq!(tonew_max_join(None), 3);
        assert_eq!(tonew_max_join(Some(0)), 3);
        assert_eq!(tonew_max_join(Some(-2)), 3);
        assert_eq!(tonew_max_join(Some(1)), 1);
        assert_eq!(tonew_max_join(Some(5)), 5);
        assert_eq!(TOONEW_DEFAULT_MAX_JOIN, 3);
    }

    #[test]
    fn enable_reply_renders_all_placeholders() {
        let out = render_tonew_enable(
            "${interaction.user} enabled it. At least ${beautifulTime} old in ${interaction.guild?.name}; ban after `${maxJoin}` joins.",
            "\n-# ${client.iHorizon_Emojis.Sparkles} ban after **`${maxJoin}`** joins.",
            "<@7>",
            "7d",
            "MyGuild",
            3,
            "<:sparkles:1>",
        );
        assert_eq!(
            out,
            "<@7> enabled it. At least 7d old in MyGuild; ban after `3` joins.\n-# <:sparkles:1> ban after **`3`** joins."
        );
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn block_new_account_dual_writes_table_and_legacy() {
        let pool = memory_pool().await;
        let body = serde_json::json!({"state": true, "req": 7, "maxJoin": 3}).to_string();
        crate::db::tbl_set(&pool, "g1", "GUILD.BLOCK_NEW_ACCOUNT", &body)
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g1", "GUILD.BLOCK_NEW_ACCOUNT")
                .await
                .as_deref(),
            Some(body.as_str())
        );
        // Legacy flat row stays fresh for unmigrated kv readers.
        assert_eq!(
            crate::db::kv_get(&pool, "g1", "GUILD.BLOCK_NEW_ACCOUNT")
                .await
                .as_deref(),
            Some(body.as_str())
        );
        crate::db::tbl_del(&pool, "g1", "GUILD.BLOCK_NEW_ACCOUNT")
            .await
            .unwrap();
        assert!(crate::db::tbl_get(&pool, "g1", "GUILD.BLOCK_NEW_ACCOUNT")
            .await
            .is_none());
        assert!(crate::db::kv_get(&pool, "g1", "GUILD.BLOCK_NEW_ACCOUNT")
            .await
            .is_none());
    }

    #[tokio::test]
    async fn block_new_account_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        let body = serde_json::json!({"state": true, "req": 7}).to_string();
        crate::db::kv_set(&pool, "g1", "GUILD.BLOCK_NEW_ACCOUNT", &body)
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g1", "GUILD.BLOCK_NEW_ACCOUNT")
                .await
                .as_deref(),
            Some(body.as_str())
        );
    }
}

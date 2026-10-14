use super::*;

/// Thread action choice. Mirrors the `action` option `choices` in
/// confession.ts:178-197: slash shows the localized display names,
/// the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum ConfessionThreadAction {
    #[name = "yes"]
    #[name_localized("en-US", "Create thread")]
    #[name_localized("en-GB", "Create thread")]
    #[name_localized("fr", "Créer un fil")]
    #[name_localized("ja", "create_thread")]
    #[name_localized("ru", "create_thread")]
    #[name_localized("es-ES", "create_thread")]
    Yes,
    #[name = "no"]
    #[name_localized("en-US", "Don´t create thread")]
    #[name_localized("en-GB", "Don´t create thread")]
    #[name_localized("fr", "Ne pas créer un fil")]
    #[name_localized("ja", "don_t_create_thread")]
    #[name_localized("ru", "don_t_create_thread")]
    #[name_localized("es-ES", "don_t_create_thread")]
    No,
}

impl ConfessionThreadAction {
    /// TS `value` stored in `GUILD.CONFESSION.thread`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
        }
    }
}

/// Create an thread upside the confession ?
// The raw action string is stored as-is (prefix defaults to `"0s"`
// when missing, like `string(args!, 0) || "0s"`); only the exact
// `"yes"` replies enabled, everything else replies disabled.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "thread",
    aliases("confthread"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Créer un fil de discussion en dessous de la confession ?"),
    description_localized("ja", "告白の上にスレッドを作成しますか？"),
    description_localized("ru", "Создать ветку над признанием?"),
    description_localized("es-ES", "Crear un hilo encima de la confesión?")
)]
pub async fn confession_thread(
    ctx: Ctx<'_>,
    #[description = "yes or no"] action: Option<ConfessionThreadAction>,
) -> Result<(), anyhow::Error> {
    let raw = action.map(|a| a.as_str()).unwrap_or("0s");
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    crate::commands::owner::main::routed_set(pool, &gid, &gid, "GUILD.CONFESSION.thread", raw)
        .await?;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    // Exact match like TS (`action === "yes" ? enabled : disabled`).
    let key = if parse_yes_no(raw).unwrap_or(false) {
        "confession_thread_enabled"
    } else {
        "confession_thread_disabled"
    };
    ctx.say(crate::lang::get(&code, key).unwrap_or_else(|| key.to_string()))
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn thread_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = ConfessionThreadAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(
            names,
            vec![
                "yes".to_string(),
                "no".to_string()
            ]
        );
        assert_eq!(ConfessionThreadAction::Yes.as_str(), "yes");
        assert_eq!(ConfessionThreadAction::No.as_str(), "no");
        assert_eq!(
            ConfessionThreadAction::from_name("yes"),
            Some(ConfessionThreadAction::Yes)
        );
        assert_eq!(
            ConfessionThreadAction::from_name("NO"),
            Some(ConfessionThreadAction::No)
        );
        assert_eq!(ConfessionThreadAction::from_name("maybe"), None);
        assert_eq!(
            ConfessionThreadAction::from_index(0),
            Some(ConfessionThreadAction::Yes)
        );
        assert_eq!(
            ConfessionThreadAction::from_index(1),
            Some(ConfessionThreadAction::No)
        );
        let list = ConfessionThreadAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Créer un fil")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Ne pas créer un fil")
        );
        assert_eq!(
            list[1].localizations.get("ja").map(String::as_str),
            Some("don_t_create_thread")
        );
    }
}

use super::*;

/// Prefix action choice. Mirrors the `action` option `choices` in
/// guildconfig.ts:298-319 (`bot` -> `prefix`): slash shows the localized
/// display names, the handler maps each variant back to the TS `value`
/// (`mention` = revert to the default mention prefix, `change` = store
/// the `name` option).
///
/// NOTE: the command keeps the single free-form `name` param (`"mention"`
/// reverts on slash, any other text is stored) instead of a separate
/// `action` param, so the message path (`!setprefix <new-prefix>`, where
/// TS forces `action = "change"`) keeps working. This enum pins the TS
/// slash contract and its `value` mapping.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum PrefixAction {
    #[name = "Default prefix"]
    #[name_localized("fr", "Préfixe par défaut")]
    #[name_localized("ja", "default_prefix")]
    #[name_localized("ru", "default_prefix")]
    #[name_localized("es-ES", "default_prefix")]
    #[name = "mention"]
    Mention,
    #[name = "Change prefix"]
    #[name_localized("fr", "Changer le préfixe")]
    #[name_localized("ja", "change_prefix")]
    #[name_localized("ru", "change_prefix")]
    #[name_localized("es-ES", "change_prefix")]
    #[name = "change"]
    Change,
}

impl PrefixAction {
    /// TS `value` (`mention` / `change`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Mention => "mention",
            Self::Change => "change",
        }
    }
}

/// Shared prefix-change run. Mirrors !prefix.ts (used by the nested
/// `setprefix` leaf and the top-level @prefix.ts wrapper alike).
pub async fn run_prefix_change(ctx: Ctx<'_>, prefix: String) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let is_prefix = matches!(ctx, poise::Context::Prefix(_));
    // Mention-revert. Mirrors `action === "mention"` in !prefix.ts:
    // the slash `action` choice is exact, and the prefix path forces
    // `action = "change"`, so only a slash call with the exact input
    // `mention` reverts (`client.db.delete(`${guildId}.BOT.prefix`)`).
    // A prefix call stores `mention` literally, like TS. There is no
    // `reset` action in TS.
    if !is_prefix && prefix == "mention" {
        crate::db::clear_guild_prefix(&ctx.data().pool, &gid).await?;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_now_mention").unwrap_or_else(
                || "The bot prefix for Message's command is now mention! `@Ping-Me`".to_string(),
            ),
        )
        .await?;
        return Ok(());
    }
    if prefix.is_empty() {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_specify_prefix")
                .unwrap_or_else(|| "You need to specify the bot prefix.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // CapGate: TS rejects `prefix.length >= 5` (4 chars max). The
    // prefix path forces the `change` action, so the input is stored
    // literally (`prefix.split(" ")[0]`), like TS.
    if crate::db::prefix_too_long(&prefix) {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_too_long").unwrap_or_else(
                || "The bot prefix is too long, it will be too difficult to use.".to_string(),
            ),
        )
        .await?;
        return Ok(());
    }
    // Truncation: TS stores `prefix.split(" ")[0]`.
    let formated = crate::db::truncate_prefix(&prefix);
    if formated.is_empty() {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_specify_prefix")
                .unwrap_or_else(|| "You need to specify the bot prefix.".to_string()),
        )
        .await?;
        return Ok(());
    }
    crate::db::set_guild_prefix(&ctx.data().pool, &gid, &formated).await?;
    ctx.say(
        crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_is_good")
            .map(|s| s.replace("${formatedPrefix}", &formated))
            .unwrap_or_else(|| format!("Prefix set to `{formated}`.")),
    )
    .await?;
    Ok(())
}

/// Setprefix command.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "setprefix",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_prefix(
    ctx: Ctx<'_>,
    // TS SlashCommands/guildconfig/!prefix.ts reads getString("name").
    #[description = "New prefix (max 4 chars) or 'mention' to revert (slash only)"]
    #[rename = "name"]
    prefix: String,
) -> Result<(), anyhow::Error> {
    run_prefix_change(ctx, prefix).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use poise::ChoiceParameter as _;

    #[test]
    fn prefix_action_choices_mirror_ts_names_values_and_locales() {
        let names: Vec<_> = PrefixAction::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["Default prefix", "Change prefix"]);
        assert_eq!(PrefixAction::Mention.as_str(), "mention");
        assert_eq!(PrefixAction::Change.as_str(), "change");
        assert_eq!(
            PrefixAction::from_name("mention"),
            Some(PrefixAction::Mention)
        );
        assert_eq!(
            PrefixAction::from_name("CHANGE"),
            Some(PrefixAction::Change)
        );
        assert_eq!(PrefixAction::from_name("bogus"), None);
        assert_eq!(PrefixAction::from_index(0), Some(PrefixAction::Mention));
        assert_eq!(PrefixAction::from_index(1), Some(PrefixAction::Change));
        let list = PrefixAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Préfixe par défaut")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Changer le préfixe")
        );
    }
}

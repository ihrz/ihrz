use super::*;

/// Prefix action choice. Mirrors the `action` option `choices` in
/// guildconfig.ts:298-319 (`bot` -> `prefix`): slash shows the localized
/// display names, the handler maps each variant back to the TS `value`
/// (`mention` = revert to the default mention prefix, `change` = store
/// the `name` option).
///
/// NOTE (TS-exact): the command carries the required `action` param
/// (`guildconfig.ts:288-325`, required `mention` / `change` choices)
/// plus the optional `name` param (`guildconfig.ts:326-341`,
/// required: false). The handler reads `getString("action", true)`
/// (`!prefix.ts:46`) and branches `mention` (`:53-57`, deletes the
/// row regardless of `name`) vs `change` (`:58-82`, needs `name`,
/// cap gate `>= 5`, stores `split(" ")[0]`) — the message path
/// forces `action = "change"` (`!prefix.ts:49`), so there is no
/// merged free-form fallback. This enum pins the TS slash contract
/// and its `value` mapping.
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

/// Shared prefix-change run. Mirrors !prefix.ts (used by the top-level
/// @prefix.ts wrapper; the nested `guildconfig bot prefix` leaf inlines
/// the TS slash contract above so `action = "change"` stores a literal
/// `"mention"` name verbatim).
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
// TS path `guildconfig bot prefix` (`guildconfig.ts` `bot` group leaf:
// required `action` (guildconfig.ts:288-325) + optional `name`
// (guildconfig.ts:326-341, required: false)).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "prefix",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_prefix(
    ctx: Ctx<'_>,
    // TS SlashCommands/guildconfig/!prefix.ts reads
    // getString("action", true).
    #[description = "What do you want to do?"]
    #[description_localized("fr", "Que voulez-vous faire ?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    action: PrefixAction,
    // TS SlashCommands/guildconfig/!prefix.ts reads getString("name").
    #[description = "The new prefix"]
    #[description_localized("fr", "Le nouveau préfixe")]
    #[description_localized("ja", "新しいプレフィックス")]
    #[description_localized("ru", "Новый префикс")]
    #[description_localized("es-ES", "El nuevo prefijo")]
    #[rename = "name"]
    name: Option<String>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Mirrors `if (action === "mention")` in !prefix.ts:53-57: the
    // revert deletes the row regardless of `name`.
    if action == PrefixAction::Mention {
        crate::db::clear_guild_prefix(&ctx.data().pool, &gid).await?;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_now_mention").unwrap_or_else(
                || "The bot prefix for Message's command is now mention! `@Ping-Me`".to_string(),
            ),
        )
        .await?;
        return Ok(());
    }
    // Mirrors `else if (action === "change")` in !prefix.ts:58-82:
    // `name` is required (missing -> specify_prefix), the cap gate is
    // `prefix.length >= 5`, and TS stores `prefix.split(" ")[0]`.
    // Unlike the shared `run_prefix_change` below, a literal
    // `"mention"` name is stored verbatim here, like TS.
    let Some(prefix) = name.filter(|s| !s.is_empty()) else {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_specify_prefix")
                .unwrap_or_else(|| "You need to specify the bot prefix.".to_string()),
        )
        .await?;
        return Ok(());
    };
    if crate::db::prefix_too_long(&prefix) {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_too_long").unwrap_or_else(
                || "The bot prefix is too long, it will be too difficult to use.".to_string(),
            ),
        )
        .await?;
        return Ok(());
    }
    let formated = crate::db::truncate_prefix(&prefix);
    crate::db::set_guild_prefix(&ctx.data().pool, &gid, &formated).await?;
    ctx.say(
        crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_is_good")
            .map(|s| s.replace("${formatedPrefix}", &formated))
            .unwrap_or_else(|| format!("Prefix set to `{formated}`.")),
    )
    .await?;
    Ok(())
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

use super::*;

/// Add reaction by iHorizon when user send message
#[poise::command(
    prefix_command,
    category = "utils",
    rename = "add-react",
    aliases("react-add", "addreact", "reactadd"),
    description_localized(
        "fr",
        "Ajouter une réaction d'iHorizon lorsque l'utilisateur envoie un message spécifiqe"
    ),
    description_localized(
        "ja",
        "ユーザーがメッセージを送信したらiHorizonがリアクションを追加"
    ),
    description_localized("ru", "Добавить реакцию iHorizon при отправке сообщения"),
    description_localized(
        "es-ES",
        "Añadir reacción de iHorizon cuando el usuario envía un mensaje"
    ),
    // @add-react.ts: permission ManageGuildExpressions.
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn add_react(
    ctx: Ctx<'_>,
    // TS @add-react.ts order: `options[0]` = emoji, `options[1]` =
    // message (trigger). Option (not required): a bare or partial
    // prefix call reaches the handler (the legacy decl has no
    // `options`, so checkCommandArgs counts nothing) and TS answers
    // the err legs below, never a poise parse error.
    #[description = "Emoji to react with"] emoji: Option<String>,
    #[description = "Trigger (exact match)"] message: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let var_none = crate::lang::get(&code, "var_none").unwrap_or_else(|| "None".to_string());

    // TS @add-react.ts:53-66: `options[0]` must be a single or custom
    // Discord emoji, else `add_react_command_err_emojis` with
    // `{emoji}` = the input (or `var_none` when absent).
    let emoji = emoji.unwrap_or_default();
    if !crate::funcs::is_single_emoji(&emoji) && !crate::funcs::is_discord_emoji(&emoji) {
        let shown = if emoji.is_empty() { var_none } else { emoji };
        ctx.say(
            crate::lang::get(&code, "add_react_command_err_emojis")
                .map(|s| s.replace("{emoji}", &shown))
                .unwrap_or_else(|| {
                    format!("The emoji `{shown}` for the reaction is not a valid emoji!")
                }),
        )
        .await?;
        return Ok(());
    }

    // TS @add-react.ts:68-76: `options[1]` must be non-blank, else
    // `add_react_command_err_message`.
    let message = message.unwrap_or_default();
    if message.trim().is_empty() {
        ctx.say(
            crate::lang::get(&code, "add_react_command_err_message").unwrap_or_else(|| {
                "You must specify the message that will trigger the reaction!".to_string()
            }),
        )
        .await?;
        return Ok(());
    }

    // TS @add-react.ts:78-89: work reply first, then
    // `db.set(`${guildId}.GUILD.REACT_MSG.${message.toLowerCase()}`, emoji)`
    // (raw emoji value, lowercased-but-untrimmed key).
    ctx.say(
        crate::lang::get(&code, "add_react_command_work")
            .map(|s| {
                s.replace(
                    "${interaction.member?.id}",
                    &ctx.author().id.get().to_string(),
                )
                .replace("${message.toLowerCase()}", &message.to_lowercase())
                .replace("{emoji}", &emoji)
            })
            .unwrap_or_else(|| "add_react_command_work".to_string()),
    )
    .await?;
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("GUILD.REACT_MSG.{}", message.to_lowercase()),
        &emoji,
    )
    .await?;
    Ok(())
}

/// Pure TS-gate predicate for the @add-react.ts arg order
/// (`options[0]` emoji validated first, `options[1]` message
/// non-blank second). Pins the order swap: emoji-first, trigger-last.
pub fn add_react_gate(emoji: Option<&str>, message: Option<&str>) -> &'static str {
    let emoji = emoji.unwrap_or_default();
    if !crate::funcs::is_single_emoji(emoji) && !crate::funcs::is_discord_emoji(emoji) {
        return "err_emojis";
    }
    match message {
        Some(m) if !m.trim().is_empty() => "work",
        _ => "err_message",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gate_pins_emoji_first_message_second_order() {
        // TS options[0]=emoji, options[1]=message: a valid emoji with
        // no trigger reaches the message leg (not the emoji leg), and
        // a non-emoji first arg fails even with a trigger present.
        assert_eq!(add_react_gate(Some("👍"), None), "err_message");
        assert_eq!(add_react_gate(Some("👍"), Some("hello")), "work");
        assert_eq!(add_react_gate(Some("hello"), Some("👍")), "err_emojis");
        assert_eq!(add_react_gate(None, Some("hello")), "err_emojis");
        assert_eq!(add_react_gate(None, None), "err_emojis");
        assert_eq!(add_react_gate(Some("👍"), Some("   ")), "err_message");
        // Custom Discord emoji passes the emoji gate.
        assert_eq!(
            add_react_gate(Some("<:name:123456789>"), Some("hi")),
            "work"
        );
    }
}

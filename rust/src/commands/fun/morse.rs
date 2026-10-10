use super::*;

/// Alphabet table. Mirrors the alpha array in !morse.ts.
pub fn morse_alpha() -> Vec<char> {
    " ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".chars().collect()
}

/// Code table. Mirrors the morse array in !morse.ts.
pub fn morse_table() -> Vec<&'static str> {
    "/,.-,-...,-.-.,-..,.,..-.,--.,....,..,.---,-.-,.-..,--,-.,---,.--.,--.-,.-.,...,-,..-,...-,.--,-..-,-.--,--..,.----,..---,...--,....-,.....,-....,--...,---..,----.,-----"
        .split(',')
        .collect()
}

/// Fold German umlauts. Mirrors the /Ä|Ö|Ü/ replaces in !morse.ts
/// (input is uppercased first, like the TS path).
pub fn fold_umlauts(s: &str) -> String {
    s.replace('Ä', "AE").replace('Ö', "OE").replace('Ü', "UE")
}

/// Encode or decode. Mirrors !morse.ts: uppercased input starting
/// with `.`/`-` decodes (space-separated codes), anything else encodes.
pub fn morse_convert(input: &str) -> String {
    let text = fold_umlauts(&input.to_uppercase());
    let alpha = morse_alpha();
    let codes = morse_table();
    if text.starts_with('.') || text.starts_with('-') {
        // Joined with `""`, so unknown slots stay empty exactly like the TS
        // `undefined` entries (invisible in the decoded output).
        text.split(' ')
            .map(|code| {
                codes
                    .iter()
                    .position(|c| *c == code)
                    .and_then(|i| alpha.get(i).copied())
                    .map(|c| c.to_string())
                    .unwrap_or_default()
            })
            .collect::<Vec<_>>()
            .join("")
    } else {
        // Joined with `" "`, so unknown slots stay empty like the TS
        // `undefined` entries (visible as doubled separators).
        text.chars()
            .map(|ch| {
                alpha
                    .iter()
                    .position(|a| *a == ch)
                    .and_then(|i| codes.get(i).copied())
                    .unwrap_or_default()
            })
            .collect::<Vec<_>>()
            .join(" ")
    }
}

/// Translate between text and morse code!
#[poise::command(slash_command, prefix_command, category = "fun", rename = "morse")]
// Mirrors !morse.ts (code-fenced reply).
pub async fn morse(
    ctx: Ctx<'_>,
    // Named `input` like the TS slash option (`getString("input")`,
    // required: true in fun.ts). `#[rest]` mirrors the prefix
    // `longString(args, 0)` (whole tail); `Option` mirrors its `|| null`
    // empty case, answered with the TS checkCommandArgs usage embed.
    #[description = "Text or morse code"]
    #[rest]
    input: Option<String>,
) -> Result<(), anyhow::Error> {
    // Bare call first (TS checkCommandArgs runs before the command
    // body, so usage wins over the fun kill-switch like in TS).
    let Some(input) = input else {
        usage_reply(&ctx, "morse").await?;
        return Ok(());
    };
    if fun_guard(&ctx).await {
        return Ok(());
    }
    // Mirrors `allowedMentions: { roles: undefined, users: undefined }`:
    // the morse output must never ping (see !rate.ts for the same shape).
    ctx.send(
        poise::CreateReply::default()
            .content(format!("```{}```", morse_convert(&input)))
            .allowed_mentions(
                poise::serenity_prelude::CreateAllowedMentions::new()
                    .all_users(false)
                    .all_roles(false)
                    .everyone(false)
                    .replied_user(false),
            ),
    )
    .await?;
    Ok(())
}

/// Missing-input usage embed. Mirrors checkCommandArgs/sendErrorMessage
/// for this command's single required String option (`required: true`
/// in fun.ts): an empty prefix tail parses as `None`, so the command
/// replays the same `hybridcommands_args_error_embed_desc` caret embed
/// TS sends (`!morse [string]`, caret on the missing arg). Both lang
/// keys already exist in YAML, so no new key is needed.
async fn usage_reply(ctx: &Ctx<'_>, cmd: &str) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let gid = ctx.guild_id().map(|g| g.get());
    let code = crate::db::guild_lang(pool, gid).await;
    let prefix = crate::db::guild_prefix(pool, gid, &ctx.data().config.prefix).await;
    let token = "[string]".to_string();
    let desc = crate::funcs_send::args_error_description(
        &code,
        cmd,
        &prefix,
        cmd,
        &crate::funcs_send::args_error_line(&[("string".to_string(), true)]),
        &crate::funcs_send::error_position(&prefix, cmd, &[token], 0),
        "string",
    );
    let footer = crate::lang::get(&code, "hybridcommands_embed_footer_text")
        .unwrap_or_else(|| {
            "Options within [...] are required, while those within <...> are optional.\nUse the command: ${botPrefix}help [command] for more information."
                .to_string()
        })
        .replace("${botPrefix}", &prefix);
    let gid_str = gid.map(|g| g.to_string()).unwrap_or_default();
    let (_, fbytes) = crate::commands::shared::footer_parts(ctx, &gid_str).await;
    let embed = crate::commands::shared::embed_with_footer(
        poise::serenity_prelude::CreateEmbed::default()
            .description(desc)
            .colour(0xED_4245_u32),
        &footer,
        fbytes.is_some(),
    );
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = fbytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod morse_tests {
    use super::*;

    #[test]
    fn encodes_text() {
        assert_eq!(morse_convert("SOS"), "... --- ...");
        assert_eq!(morse_convert("A B"), ".- / -...");
    }

    #[test]
    fn decodes_morse() {
        assert_eq!(morse_convert("... --- ..."), "SOS");
        assert_eq!(morse_convert(".- / -..."), "A B");
    }

    #[test]
    fn folds_umlauts_before_encoding() {
        assert_eq!(fold_umlauts("ÄÖÜ"), "AEOEUE");
        assert_eq!(morse_convert("Ä"), ".- .");
    }

    #[test]
    fn roundtrips() {
        assert_eq!(morse_convert(&morse_convert("HELLO 123")), "HELLO 123");
    }

    #[test]
    fn unknown_chars_leave_empty_slots_like_ts() {
        // TS joins `undefined` slots: encode keeps the separator gap,
        // decode drops the slot silently.
        assert_eq!(morse_convert("A!B"), ".-  -...");
        assert_eq!(morse_convert(".- ...... -..."), "AB");
    }

    #[test]
    fn tables_match_ts_byte_for_byte() {
        // Byte parity with the `alpha` / `morse` arrays in !morse.ts: 37
        // entries each (leading space encodes as `/`).
        let alpha = morse_alpha();
        let table = morse_table();
        assert_eq!(alpha.len(), 37);
        assert_eq!(table.len(), 37);
        assert_eq!(
            alpha.iter().collect::<String>(),
            " ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
        );
        assert_eq!(
            table.join(","),
            "/,.-,-...,-.-.,-..,.,..-.,--.,....,..,.---,-.-,.-..,--,-.,---,.--.,--.-,.-.,...,-,..-,...-,.--,-..-,-.--,--..,.----,..---,...--,....-,.....,-....,--...,---..,----.,-----"
        );
    }
}

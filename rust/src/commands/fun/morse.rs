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

/// Morse command. Mirrors !morse.ts (code-fenced reply).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "morse")]
pub async fn morse(
    ctx: Ctx<'_>,
    #[description = "Text or morse code"] text: String,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    // Mirrors `allowedMentions: { roles: undefined, users: undefined }`:
    // the morse output must never ping (see !rate.ts for the same shape).
    ctx.send(
        poise::CreateReply::default()
            .content(format!("```{}```", morse_convert(&text)))
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
}

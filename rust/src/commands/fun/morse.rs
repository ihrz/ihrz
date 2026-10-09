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
        text.split(' ')
            .filter_map(|code| {
                codes
                    .iter()
                    .position(|c| *c == code)
                    .and_then(|i| alpha.get(i).copied())
            })
            .collect()
    } else {
        text.chars()
            .filter_map(|ch| {
                alpha
                    .iter()
                    .position(|a| *a == ch)
                    .and_then(|i| codes.get(i).copied())
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
    ctx.say(format!("```{}```", morse_convert(&text))).await?;
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
}

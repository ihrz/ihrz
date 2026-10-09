use super::*;

/// Fake nitro gift codes file (fr guilds). Mirrors nitrofdp.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "nitrofdp")]
pub async fn nitrofdp(
    ctx: Ctx<'_>,
    #[description = "Amount of nitro"] amount: Option<i64>,
) -> Result<(), anyhow::Error> {
    let is_fr = ctx
        .guild()
        .map(|g| g.preferred_locale.to_lowercase().contains("fr"))
        .unwrap_or(false);
    if !is_fr {
        return Ok(());
    }
    let mut n = amount.unwrap_or(1).max(1) as usize;
    if n > 275_000 {
        n = 10_000;
    }
    let opts = crate::funcs::PasswordOptions {
        length: 16,
        numbers: true,
        symbols: false,
        lowercase: true,
        uppercase: true,
        exclude_similar: false,
        exclude: String::new(),
        strict: false,
    };
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    let codes = crate::funcs::generate_multiple_passwords(n, &opts, seed)
        .map_err(|e| anyhow::anyhow!(e))?;
    let body = codes
        .iter()
        .map(|c| format!("https://discord.gift/{c}"))
        .collect::<Vec<_>>()
        .join("\n");
    ctx.channel_id()
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new().add_file(serenity::CreateAttachment::bytes(
                body.into_bytes(),
                "fake_nitro.txt",
            )),
        )
        .await?;
    Ok(())
}

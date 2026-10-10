use super::*;

/// Download all guild emojis as a zip. Mirrors !zip-emojis.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "zip-emojis",
    aliases("zipemojis", "zip1"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn zip_emojis(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let emojis = guild_id.emojis(ctx.http()).await.unwrap_or_default();
    if emojis.is_empty() {
        ctx.say(
            crate::lang::get(&code, "msg_no_emojis").unwrap_or_else(|| "No emojis.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let started = std::time::Instant::now();
    let client = reqwest::Client::new();
    let mut buf = std::io::Cursor::new(Vec::<u8>::new());
    // Mirrors `zip.generateAsync({ compression: "DEFLATE",
    // compressionOptions: { level: 9 } })` in !zip-emojis.ts.
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .compression_level(Some(9));
    // No take(50) and no 512 KiB per-file cap: TS downloads every cached
    // emoji with no caps, skipping only the ones that fail (per-emoji
    // try/catch, errors silently swallowed).
    {
        let mut zip = zip::ZipWriter::new(&mut buf);
        for emoji in emojis.iter() {
            let ext = if emoji.animated { "gif" } else { "png" };
            // Filename mirrors `${emoji.name}_${emoji.id}.gif/.png`;
            // CDN URL mirrors `emoji.imageURL({ size: 2048, extension })`.
            let name = format!("{}_{}.{}", emoji.name, emoji.id.get(), ext);
            let url = format!(
                "https://cdn.discordapp.com/emojis/{}.{ext}?size=2048",
                emoji.id.get()
            );
            let bytes = match client.get(&url).send().await {
                Ok(r) => match r.error_for_status() {
                    Ok(ok) => match ok.bytes().await {
                        Ok(b) => b.to_vec(),
                        Err(_) => continue,
                    },
                    Err(_) => continue,
                },
                Err(_) => continue,
            };
            if bytes.is_empty() {
                continue;
            }
            if zip.start_file(&name, options).is_err() {
                continue;
            }
            use std::io::Write;
            if zip.write_all(&bytes).is_err() {
                continue;
            }
        }
        if zip.finish().is_err() {
            // Mirrors the TS catch path (`zip_emojis_command_error`).
            ctx.send(
                poise::CreateReply::default().ephemeral(true).content(
                    crate::lang::get(&code, "zip_emojis_command_error")
                        .unwrap_or_else(|| "An error occurred while exporting emojis.".to_string()),
                ),
            )
            .await?;
            return Ok(());
        }
    }
    let data = buf.into_inner();
    // Ephemeral work reply with timing + count, mirroring
    // `zip_emojis_command_work` (${calcTime}ms, ${emojis.size}) and the
    // `server_emojis.zip` attachment (`flags: [1 << 6]`).
    let content = crate::lang::get(&code, "zip_emojis_command_work")
        .map(|s| {
            s.replace("${calcTime}", &started.elapsed().as_millis().to_string())
                .replace("${emojis.size}", &emojis.len().to_string())
        })
        .unwrap_or_else(|| format!("Exported {} emojis.", emojis.len()));
    ctx.send(
        poise::CreateReply::default()
            .ephemeral(true)
            .content(content)
            .attachment(poise::serenity_prelude::CreateAttachment::bytes(
                data,
                "server_emojis.zip",
            )),
    )
    .await?;
    Ok(())
}

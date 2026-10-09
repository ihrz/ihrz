use super::*;

/// Download all guild stickers as a zip. Mirrors !zip-stickers.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "zip-stickers",
    aliases("zipstickers", "zip2"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn zip_stickers(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let stickers = guild_id.stickers(ctx.http()).await.unwrap_or_default();
    if stickers.is_empty() {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_no_stickers")
                .unwrap_or_else(|| "No stickers.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let client = reqwest::Client::new();
    let mut buf = std::io::Cursor::new(Vec::<u8>::new());
    {
        let mut zip = zip::ZipWriter::new(&mut buf);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);
        for sticker in stickers.iter().take(30) {
            // Sticker file via CDN is unreliable across formats; use the
            // preview url when present, else skip.
            let Some(url) = sticker_url(sticker) else {
                continue;
            };
            let bytes = match client.get(&url).send().await {
                Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
                Err(_) => continue,
            };
            if bytes.is_empty() || bytes.len() > 512 * 1024 {
                continue;
            }
            let name = sanitize_emoji_filename(&sticker.name, "png");
            if zip.start_file(name, options).is_err() {
                continue;
            }
            use std::io::Write;
            let _ = zip.write_all(&bytes);
        }
        let _ = zip.finish();
    }
    let data = buf.into_inner();
    ctx.channel_id()
        .send_message(
            ctx.http(),
            poise::serenity_prelude::CreateMessage::new().add_file(
                poise::serenity_prelude::CreateAttachment::bytes(data, "stickers.zip"),
            ),
        )
        .await?;
    Ok(())
}

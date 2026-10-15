use super::*;

// Download all guild stickers as a zip. Mirrors !zip-stickers.ts.
/// Create zip files with all guild stickers in!
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "zip-stickers",
    aliases("zipstickers", "zip2"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS",
    description_localized(
        "fr",
        "Créer un fichier zip contenant absolument tout les stickers du serveur"
    ),
    description_localized("ja", "サーバーの全スタンプを含むZIPファイルを作成！"),
    description_localized("ru", "Создать ZIP-файлы со всеми стикерами сервера!"),
    description_localized("es-ES", "Crear archivos zip con todos los stickers del servidor!")
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
    // TS `thinking: true`: ack before the download work.
    let _ = ctx.defer().await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let started = std::time::Instant::now();
    let client = reqwest::Client::new();
    // STORED (no compression) zip; per-file errors are skipped silently
    // like the TS try/catch around each download.
    let mut files: Vec<(String, Vec<u8>)> = vec![];
    for sticker in stickers.iter() {
        let Some(format) = sticker_format_name(&sticker.format_type) else {
            continue;
        };
        let Some(url) = sticker_file_url(sticker) else {
            continue;
        };
        let bytes = match client.get(&url).send().await {
            Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
            Err(_) => continue,
        };
        if bytes.is_empty() {
            continue;
        }
        // TS filename scheme: `name_id.format`.
        files.push((
            format!("{}_{}.{}", sticker.name, sticker.id.get(), format),
            bytes,
        ));
    }
    // TS catch path (`zip_stickers_command_error`, ephemeral).
    let data = {
        let mut inner = std::io::Cursor::new(Vec::<u8>::new());
        let mut failed = false;
        {
            let mut zip = zip::ZipWriter::new(&mut inner);
            let options = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Stored);
            use std::io::Write;
            for (name, bytes) in &files {
                if zip.start_file(name, options).is_err() || zip.write_all(bytes).is_err() {
                    failed = true;
                    break;
                }
            }
            if !failed && zip.finish().is_err() {
                failed = true;
            }
        }
        if failed {
            None
        } else {
            Some(inner.into_inner())
        }
    };
    let Some(data) = data else {
        ctx.send(
            poise::CreateReply::default().ephemeral(true).content(
                crate::lang::get(&code, "zip_stickers_command_error")
                    .unwrap_or_else(|| "An error occurred while exporting stickers.".to_string()),
            ),
        )
        .await?;
        return Ok(());
    };
    // Ephemeral work reply with timing + count, mirroring
    // `zip_stickers_command_work` (${calcTime}, ${stickers.size}) and the
    // `server_stickers.zip` attachment (`flags: [1 << 6]`).
    let content = crate::lang::get(&code, "zip_stickers_command_work")
        .map(|s| {
            s.replace("${calcTime}", &started.elapsed().as_millis().to_string())
                .replace("${stickers.size}", &stickers.len().to_string())
        })
        .unwrap_or_else(|| format!("Exported {} stickers.", stickers.len()));
    ctx.send(
        poise::CreateReply::default()
            .ephemeral(true)
            .content(content)
            .attachment(poise::serenity_prelude::CreateAttachment::bytes(
                data,
                "server_stickers.zip",
            )),
    )
    .await?;
    Ok(())
}

// TS download-name format map (!zip-stickers.ts:47-61):
// 1 -> png, 2 -> apng, 3 -> lottie, 4 -> gif.
pub fn sticker_format_name(
    format: &poise::serenity_prelude::StickerFormatType,
) -> Option<&'static str> {
    use poise::serenity_prelude::StickerFormatType;
    match format {
        StickerFormatType::Png => Some("png"),
        StickerFormatType::Apng => Some("apng"),
        StickerFormatType::Lottie => Some("lottie"),
        StickerFormatType::Gif => Some("gif"),
        _ => None,
    }
}

// CDN file URL for the sticker bytes. Static formats (and gif) fetch the
// raster file; lottie fetches the `.json` document.
pub fn sticker_file_url(sticker: &poise::serenity_prelude::Sticker) -> Option<String> {
    use poise::serenity_prelude::StickerFormatType;
    let ext = match sticker.format_type {
        StickerFormatType::Png | StickerFormatType::Apng => "png",
        StickerFormatType::Lottie => "json",
        StickerFormatType::Gif => "gif",
        _ => return None,
    };
    Some(format!(
        "https://cdn.discordapp.com/stickers/{}.{}",
        sticker.id.get(),
        ext
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_map_mirrors_ts() {
        use poise::serenity_prelude::StickerFormatType;
        assert_eq!(sticker_format_name(&StickerFormatType::Png), Some("png"));
        assert_eq!(sticker_format_name(&StickerFormatType::Apng), Some("apng"));
        assert_eq!(
            sticker_format_name(&StickerFormatType::Lottie),
            Some("lottie")
        );
        assert_eq!(sticker_format_name(&StickerFormatType::Gif), Some("gif"));
        assert_eq!(sticker_format_name(&StickerFormatType::Unknown(9)), None);
    }
}

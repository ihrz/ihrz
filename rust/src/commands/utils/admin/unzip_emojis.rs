use super::*;

/// Upload emojis from a zip attachment. Mirrors !unzip-emojis.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unzip-emojis",
    aliases("unzipemojis", "unzip1"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS",
    description_localized("fr", "Recreer tout les emojis depuis un fichier zip"),
    description_localized("ja", "ZIPファイルから全絵文字を再作成"),
    description_localized("ru", "Воссоздать все эмодзи из ZIP-файла"),
    description_localized("es-ES", "Recrear todos los emojis desde un archivo zip")
)]
pub async fn unzip_emojis(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le fichier zip pour recréer les emojis")]
    #[description_localized("ja", "絵文字を再作成するZIPファイル")]
    #[description_localized("ru", "ZIP-файл для воссоздания эмодзи")]
    #[description_localized("es-ES", "El archivo zip para recrear emojis")]
    #[description = "Zip file"]
    #[rename = "zip_file"]
    attachment: poise::serenity_prelude::Attachment,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    // TS wraps the whole run in try/catch answering
    // `util_unzip_emojis_command_error` (ephemeral).
    let started = std::time::Instant::now();
    let bytes = match reqwest::Client::new().get(&attachment.url).send().await {
        Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
        Err(_) => {
            return unzip_failed(&ctx).await;
        }
    };
    let reader = std::io::Cursor::new(bytes);
    let mut archive = match zip::ZipArchive::new(reader) {
        Ok(a) => a,
        Err(_) => {
            return unzip_failed(&ctx).await;
        }
    };
    let mut pending: Vec<(String, Vec<u8>)> = vec![];
    for i in 0..archive.len().min(20) {
        let mut file = match archive.by_index(i) {
            Ok(f) => f,
            Err(_) => continue,
        };
        let name = file.name().to_string();
        if !(name.ends_with(".png") || name.ends_with(".gif") || name.ends_with(".jpg")) {
            continue;
        }
        let mut data = vec![];
        use std::io::Read;
        if file.read_to_end(&mut data).is_err() || data.is_empty() || data.len() > 256 * 1024 {
            continue;
        }
        pending.push((name, data));
    }
    drop(archive);
    let mut done = 0;
    for (name, data) in pending {
        let stem = name.rsplit('/').next().unwrap_or(&name);
        let stem = stem.rsplit_once('.').map(|(s, _)| s).unwrap_or(stem);
        let ext = if name.ends_with(".gif") { "gif" } else { "png" };
        let image = format!(
            "data:image/{ext};base64,{}",
            crate::emojis::base64_encode(&data)
        );
        if guild_id
            .create_emoji(ctx.http(), stem, &image)
            .await
            .is_ok()
        {
            done += 1;
        }
    }
    // Mirrors `util_unzip_emojis_command_work` (${calcTime}, ${emojiCount}).
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let calc = started.elapsed().as_millis();
    ctx.send(
        poise::CreateReply::default()
            .content(
                crate::lang::get(&code, "util_unzip_emojis_command_work")
                    .map(|s| {
                        s.replace("${calcTime}", &calc.to_string())
                            .replace("${emojiCount}", &done.to_string())
                    })
                    .unwrap_or_else(|| format!("Created {done} emoji(s).")),
            )
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

/// Ephemeral `util_unzip_emojis_command_error` reply. Mirrors the TS
/// try/catch around the whole run (download + unzip failures).
async fn unzip_failed(ctx: &Ctx<'_>) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.send(
        poise::CreateReply::default()
            .content(
                crate::lang::get(&code, "util_unzip_emojis_command_error")
                    .unwrap_or_else(|| "An error occurred while unzipping emojis.".to_string()),
            )
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

use super::*;

/// Upload emojis from a zip attachment. Mirrors !unzip-emojis.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unzip-emojis",
    aliases("unzipemojis", "unzip1"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn unzip_emojis(
    ctx: Ctx<'_>,
    #[description = "Zip file"]
    #[rename = "zip_file"]
    attachment: poise::serenity_prelude::Attachment,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let bytes = match reqwest::Client::new().get(&attachment.url).send().await {
        Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
        Err(_) => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_download_failed")
                    .unwrap_or_else(|| "Download failed.".to_string()),
            )
            .await?;
            return Ok(());
        }
    };
    let reader = std::io::Cursor::new(bytes);
    let mut archive = match zip::ZipArchive::new(reader) {
        Ok(a) => a,
        Err(_) => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_bad_zip").unwrap_or_else(|| "Bad zip.".to_string()),
            )
            .await?;
            return Ok(());
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
    ctx.say(format!("Uploaded {done} emojis.")).await?;
    Ok(())
}

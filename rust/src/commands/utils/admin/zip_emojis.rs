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
    let emojis = guild_id.emojis(ctx.http()).await.unwrap_or_default();
    if emojis.is_empty() {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_no_emojis").unwrap_or_else(|| "No emojis.".to_string()),
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
        for emoji in emojis.iter().take(50) {
            let ext = if emoji.animated { "gif" } else { "png" };
            let url = format!("https://cdn.discordapp.com/emojis/{}.{ext}", emoji.id.get());
            let bytes = match client.get(&url).send().await {
                Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
                Err(_) => continue,
            };
            if bytes.is_empty() || bytes.len() > 512 * 1024 {
                continue;
            }
            let name = sanitize_emoji_filename(&emoji.name, ext);
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
                poise::serenity_prelude::CreateAttachment::bytes(data, "emojis.zip"),
            ),
        )
        .await?;
    Ok(())
}

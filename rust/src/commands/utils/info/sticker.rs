use super::*;

/// Add a sticker from the replied message. Mirrors sticker.ts (PNG best-effort).
// Prefix-only: TS registers sticker as a MessageCommand, never as slash.
#[poise::command(prefix_command, category = "utils", rename = "sticker")]
pub async fn sticker(
    ctx: Ctx<'_>,
    #[description = "Sticker id"] sticker_id: String,
    #[description = "Name"] name: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let id: u64 = sticker_id.trim().parse().unwrap_or(0);
    if id == 0 {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_bad_sticker_id")
                .unwrap_or_else(|| "Bad sticker id.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let bytes = match reqwest::Client::new()
        .get(format!("https://cdn.discordapp.com/stickers/{id}.png"))
        .send()
        .await
    {
        Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
        Err(_) => vec![],
    };
    if bytes.is_empty() {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_fetch_failed")
                .unwrap_or_else(|| "Fetch failed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let name = name.unwrap_or_else(|| format!("sticker{id}"));
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match guild_id
        .create_sticker(
            ctx.http(),
            poise::serenity_prelude::CreateSticker::new(
                &name,
                poise::serenity_prelude::CreateAttachment::bytes(bytes, "sticker.png"),
            ),
        )
        .await
    {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "msg_sticker_added")
                    .unwrap_or_else(|| "Sticker added.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "msg_upload_failed")
                    .unwrap_or_else(|| "Upload failed.".to_string()),
            )
            .await?
        }
    };
    Ok(())
}

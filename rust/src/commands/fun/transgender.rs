use super::*;

/// Output filename. Mirrors `name: "transgender.png"` in `!transgender.ts`.
pub fn transgender_output_name() -> &'static str {
    "transgender.png"
}

/// Embed colour. Mirrors `.setColor("#010101")` in `!transgender.ts`.
pub const TRANSGENDER_COLOUR: u32 = 0x010101;

#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "transgender"
)]
pub async fn transgender(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let u = user.unwrap_or_else(|| ctx.author().clone());
    // Mirrors `displayAvatarURL({ extension: "png", size: 1024 })` in
    // `!transgender.ts` (forced PNG, not the webp `face()` URL).
    let avatar = avatar_png_url(&u, 1024);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Plain HTTPS fetch of the canvas bytes (no Chromium needed).
    let Some(png) = crate::commands::shared::download_bytes(&transgender_url(&avatar)).await else {
        ctx.say(
            crate::lang::get(&code, "fun_var_down_api")
                .unwrap_or_else(|| "Error: Seems like the API is down!".to_string()),
        )
        .await?;
        return Ok(());
    };
    // Embed + PNG attachment + bot footer, mirroring `!transgender.ts`.
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let embed = crate::commands::shared::embed_with_footer(
        poise::serenity_prelude::CreateEmbed::default()
            .colour(TRANSGENDER_COLOUR)
            .image("attachment://transgender.png")
            .timestamp(poise::serenity_prelude::Timestamp::now()),
        &fname,
        fbytes.is_some(),
    );
    let mut reply = poise::CreateReply::default().embed(embed).attachment(
        poise::serenity_prelude::CreateAttachment::bytes(png, transgender_output_name()),
    );
    if let Some(bytes) = fbytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod transgender_tests {
    use super::*;

    #[test]
    fn output_shape_matches_ts() {
        assert_eq!(transgender_output_name(), "transgender.png");
        assert_eq!(TRANSGENDER_COLOUR, 0x010101);
    }
}

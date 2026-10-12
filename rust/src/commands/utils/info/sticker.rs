use super::*;

/// Add a sticker from the replied message. Mirrors sticker.ts.
// Prefix-only: TS registers sticker as a MessageCommand, never as slash.
#[poise::command(
    prefix_command,
    category = "utils",
    rename = "sticker",
    aliases("stickers")
)]
pub async fn sticker(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());

    // TS: no `message.reference` -> sticket_command_error2.
    let poise::Context::Prefix(prefix) = ctx else {
        ctx.say(t(
            NO_REPLY_KEY,
            "Please reply to a message containing a sticker.",
        ))
        .await?;
        return Ok(());
    };
    let reference = prefix.msg.message_reference.clone();
    let Some(ref_id) = reference.as_ref().and_then(|r| r.message_id) else {
        ctx.say(t(
            NO_REPLY_KEY,
            "Please reply to a message containing a sticker.",
        ))
        .await?;
        return Ok(());
    };

    // Prefer the gateway-resolved message, else fetch it like TS does.
    let replied = match prefix.msg.referenced_message.clone().map(|b| *b) {
        Some(m) => m,
        None => {
            let channel_id = reference
                .as_ref()
                .map(|r| r.channel_id)
                .unwrap_or(prefix.msg.channel_id);
            match channel_id.message(ctx.http(), ref_id).await {
                Ok(m) => m,
                Err(e) => {
                    ctx.say(render_sticker_error(
                        &t(
                            ERROR_KEY,
                            "The sticker could not be created. An error occurred: `${err.message}`.",
                        ),
                        &e.to_string(),
                    ))
                    .await?;
                    return Ok(());
                }
            }
        }
    };

    // TS: `msg.stickers.size === 0` -> sticket_no_sticker.
    let Some(item) = replied.sticker_items.first() else {
        ctx.say(t(
            NO_STICKER_KEY,
            "No sticker found in the replied message.",
        ))
        .await?;
        return Ok(());
    };

    // TS: name gets ` /{vanityURLCode}` when the guild has one, capped at 30 chars.
    let vanity = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.vanity_url_code.clone());
    let name = cool_sticker_name(&item.name, vanity.as_deref());
    // Serenity message stickers (StickerItem) carry no description/tags,
    // so TS fallbacks apply: `var_no_set` and `"copied"`.
    let description = t("var_no_set", "Not Set");
    let ext = sticker_item_ext(&item.format_type);
    let url = format!(
        "https://cdn.discordapp.com/stickers/{}.{ext}",
        item.id.get()
    );
    let bytes = match reqwest::Client::new().get(&url).send().await {
        Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
        Err(_) => vec![],
    };
    if bytes.is_empty() {
        ctx.say(render_sticker_error(
            &t(
                ERROR_KEY,
                "The sticker could not be created. An error occurred: `${err.message}`.",
            ),
            "fetch failed",
        ))
        .await?;
        return Ok(());
    }
    let reason = format!("Sticker command executed by {}", ctx.author().id.get());
    let builder = poise::serenity_prelude::CreateSticker::new(
        &name,
        poise::serenity_prelude::CreateAttachment::bytes(bytes, format!("sticker.{ext}")),
    )
    .description(&description)
    .tags("copied")
    .audit_log_reason(&reason);
    match guild_id.create_sticker(ctx.http(), builder).await {
        Ok(created) => {
            ctx.say(render_sticker_success(
                &t(
                    SUCCESS_KEY,
                    "The sticker `${x.name}` has been successfully created.",
                ),
                &created.name,
            ))
            .await?;
        }
        Err(e) => {
            ctx.say(render_sticker_error(
                &t(
                    ERROR_KEY,
                    "The sticker could not be created. An error occurred: `${err.message}`.",
                ),
                &e.to_string(),
            ))
            .await?;
        }
    }
    Ok(())
}

/// Denial lang keys, kept identical to sticker.ts.
const NO_REPLY_KEY: &str = "sticket_command_error2";
const NO_STICKER_KEY: &str = "sticket_no_sticker";
const SUCCESS_KEY: &str = "sticket_command_work";
const ERROR_KEY: &str = "sticker_command_error";

/// TS: `cool_name = sticker.name`, plus ` /{vanity}` when the guild has a
/// vanity code, then `substring(0, 30)` (char-boundary safe here).
fn cool_sticker_name(base: &str, vanity: Option<&str>) -> String {
    let mut name = base.to_string();
    if let Some(v) = vanity {
        if !v.is_empty() {
            name.push_str(" /");
            name.push_str(v);
        }
    }
    if name.chars().count() > 30 {
        name = name.chars().take(30).collect();
    }
    name
}

/// File extension for a message sticker, mirroring discord.js `sticker.url`.
fn sticker_item_ext(format: &poise::serenity_prelude::StickerFormatType) -> &'static str {
    use poise::serenity_prelude::StickerFormatType;
    match format {
        StickerFormatType::Png | StickerFormatType::Apng => "png",
        StickerFormatType::Gif => "gif",
        _ => "json",
    }
}

/// TS: `sticket_command_work.replace("${x.name}", x.name)`.
fn render_sticker_success(template: &str, name: &str) -> String {
    template.replace("${x.name}", name)
}

/// TS: `sticker_command_error.replace("${err.message}", err.message)`.
fn render_sticker_error(template: &str, err: &str) -> String {
    template.replace("${err.message}", err)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn denial_keys_match_ts() {
        // Keys must stay identical to src/Interaction/MessageCommands/utils/sticker.ts.
        assert_eq!(NO_REPLY_KEY, "sticket_command_error2");
        assert_eq!(NO_STICKER_KEY, "sticket_no_sticker");
        assert_eq!(SUCCESS_KEY, "sticket_command_work");
        assert_eq!(ERROR_KEY, "sticker_command_error");
    }

    #[test]
    fn cool_name_plain_and_vanity() {
        assert_eq!(cool_sticker_name("pepe", None), "pepe");
        assert_eq!(cool_sticker_name("pepe", Some("")), "pepe");
        assert_eq!(cool_sticker_name("pepe", Some("vanity")), "pepe /vanity");
    }

    #[test]
    fn cool_name_truncates_to_30_chars() {
        let long = "a".repeat(40);
        assert_eq!(cool_sticker_name(&long, None).chars().count(), 30);
        // Vanity suffix participates in the 30-char cap like TS substring.
        let named = cool_sticker_name("a".repeat(28).as_str(), Some("vanity"));
        assert_eq!(named.chars().count(), 30);
        assert!(named.starts_with(&"a".repeat(28)));
    }

    #[test]
    fn sticker_ext_per_format() {
        use poise::serenity_prelude::StickerFormatType;
        assert_eq!(sticker_item_ext(&StickerFormatType::Png), "png");
        assert_eq!(sticker_item_ext(&StickerFormatType::Apng), "png");
        assert_eq!(sticker_item_ext(&StickerFormatType::Gif), "gif");
        assert_eq!(sticker_item_ext(&StickerFormatType::Lottie), "json");
    }

    #[test]
    fn renders_swap_placeholders() {
        assert_eq!(
            render_sticker_success("The sticker `${x.name}` works.", "pepe"),
            "The sticker `pepe` works."
        );
        assert_eq!(
            render_sticker_error("oops: `${err.message}`.", "boom"),
            "oops: `boom`."
        );
    }
}

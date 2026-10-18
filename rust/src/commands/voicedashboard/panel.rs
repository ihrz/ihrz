use super::*;

/// Send an interface to the channel to manage their own voice channel
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-text-channel",
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Envoyer une interface au canal pour gérer son propre canal vocal"
    ),
    description_localized(
        "ja",
        "自分のボイスチャンネルを管理するためのインターフェースをチャンネルに送信"
    ),
    description_localized(
        "ru",
        "Отправить интерфейс в канал для управления своим голосовым каналом"
    ),
    description_localized(
        "es-ES",
        "Enviar una interfaz al canal para gestionar su propio canal de voz"
    )
)]
pub async fn vd_panel(
    ctx: Ctx<'_>,
    #[description = "The channel you want the dashboard interface are sent"]
    #[description_localized("fr", "Le salon où l'interface sera envoyée")]
    #[description_localized("ja", "ダッシュボードインターフェースを送信するチャンネル")]
    #[description_localized("ru", "Канал для отправки интерфейса панели управления")]
    #[description_localized("es-ES", "El canal donde quieres que se envíe la interfaz del panel")]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the Administrator leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::ADMINISTRATOR,
    )
    .await
    {
        return Ok(());
    }
    ctx.defer().await?;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    // Dashboard embed. Mirrors !set-text-channel.ts: banner image,
    // description, 15 fields (11 emoji values + 4 spacers), footer.
    let mut embed = serenity::CreateEmbed::default()
        .colour(2829617)
        .description(t(
            "tempvoice_if_text_desc_embed",
            "## TempVoice Interface\nThis **interface** can be used to manage temporary voice channels.\n",
        ))
        .image(crate::funcs::guild_banner_url(pool, &gid).await);
    for slot in PANEL_FIELDS {
        match slot {
            Some((key, emoji_name, fallback)) => {
                let template = t(key, fallback);
                let markup = crate::emojis::app_emoji_markup(ctx.http(), emoji_name)
                    .await
                    .unwrap_or_default();
                embed = embed.field(
                    "** **",
                    render_panel_field(&template, emoji_name, &markup),
                    true,
                );
            }
            None => {
                embed = embed.field("** **", "** **", true);
            }
        }
    }
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some());
    let mut post = serenity::CreateMessage::new()
        .embed(embed)
        .components(panel_buttons(ctx.http()).await);
    if let Some(bytes) = fbytes {
        post = post.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    // Post into the target channel (TS `targetedChannel.send`), then
    // acknowledge with `Yes | <message url>` like the TS editReply.
    let sent = channel.id.send_message(ctx.http(), post).await?;
    // Persist the `{channelId, messageId}` object like
    // !set-text-channel.ts (`VOICE_INTERFACE.interface`); buttons read
    // it back via parse_interface_channel with legacy bare-string
    // read-compat.
    let iface_raw = serde_json::json!({
        "channelId": channel.id.get().to_string(),
        "messageId": sent.id.get().to_string(),
    })
    .to_string();
    crate::commands::owner::main::routed_set(pool, &gid, &gid, &vd_key("interface"), &iface_raw)
        .await?;
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let url = format!(
        "https://discord.com/channels/{gid}/{ch}/{msg}",
        ch = channel.id.get(),
        msg = sent.id.get()
    );
    ctx.say(format!("{yes} | {url}")).await?;
    Ok(())
}

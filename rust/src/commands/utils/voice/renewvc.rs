use super::*;

/// Reset your current voice channel region to automatic. Mirrors !renewvc.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "renewvc",
    aliases("rvc"),
    default_member_permissions = "MANAGE_CHANNELS",
    description_localized(
        "fr",
        "Définir la région vocale de votre salon vocal actuel en automatique"
    ),
    description_localized("ja", "現在のボイスチャンネルのボイスリージョンを自動に設定"),
    description_localized(
        "ru",
        "Установить голосовой регион текущего голосового канала на автоматический"
    ),
    description_localized(
        "es-ES",
        "Establecer la región de voz de tu canal de voz actual en automático"
    )
)]
pub async fn renewvc(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let target = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(target) = target else {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "renewvc_not_in_voice")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "${client.iHorizon_Emojis.No} You must be connected to a voice channel to use this command!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(ch) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&target).cloned())
    else {
        return Ok(());
    };
    // TS toggles the RTC region (japan, then automatic) and reports the
    // channel; any failure answers `renewvc_dont_have_permission`.
    let outcome = async {
        ch.id
            .edit(
                ctx.http(),
                poise::serenity_prelude::EditChannel::new().voice_region(Some("japan".to_string())),
            )
            .await?;
        ch.id
            .edit(
                ctx.http(),
                poise::serenity_prelude::EditChannel::new().voice_region(None),
            )
            .await
    }
    .await;
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    if outcome.is_err() {
        ctx.say(
            crate::lang::get(&code, "renewvc_dont_have_permission")
                .unwrap_or_else(|| ":x: **Can't** `Don't have permission!`".to_string()),
        )
        .await?;
        return Ok(());
    }
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_default();
    ctx.say(
        crate::lang::get(&code, "renewvc_region_success")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${targetVc}", &format!("<#{}>", target.get()))
            })
            .unwrap_or_else(|| format!("Renewed <#{}>.", target.get())),
    )
    .await?;
    Ok(())
}

use super::*;

/// Media-only channel panel. Mirrors !media-only.ts.
// The TS subcommand (utils.ts:404) takes NO options: it shows a panel
// embed (title, description, registered channels, threshold, mute
// time, thread toggle) with a channel select menu. The select menu
// and config buttons are interactive-only, so the stateless command
// renders the same panel read-only; there is no `channel` slash
// option in TS.
// Entry reads `UTILS.picOnly`. The threshold/mute/thread config
// surface (`UTILS.picOnlyConfig` panel: collectors, modals, clamps)
// is documented, not ported — the live enforcement fallbacks live in
// events_handler.rs (`PICONLY_DEFAULT_*` below).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "media-only",
    aliases("piconly", "mediaonly"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définir des canaux pour l'envoi d'images/videos uniquement (bloquer d'autres contenus)"
    ),
    description_localized(
        "ja",
        "画像/動画のみ送信可能なチャンネルを定義（他のコンテンツをブロック）"
    ),
    description_localized(
        "ru",
        "Определить каналы только для картинок/видео (блокировать другое содержимое)"
    ),
    description_localized(
        "es-ES",
        "Definir canales solo para enviar imágenes/videos (bloquear otro contenido)"
    )
)]
pub async fn media_only(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());

    // Panel fields mirror !media-only.ts: the registered channels (or
    // `setjoinroles_var_none`), the threshold (`|| 3`), the mute time
    // (`to_beautiful_string(muteTime)`), and the thread toggle.
    let raw =
        crate::commands::owner::main::routed_get(&ctx.data().pool, &gid, &gid, "UTILS.picOnly")
            .await;
    let list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let channels_value = if list.is_empty() {
        t("setjoinroles_var_none", "None")
    } else {
        list.iter()
            .map(|c| format!("<#{c}>"))
            .collect::<Vec<_>>()
            .join(", ")
    };

    let cfg: Option<serde_json::Value> = crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.picOnlyConfig",
    )
    .await
    .and_then(|s| serde_json::from_str(&s).ok());
    let threshold = cfg
        .as_ref()
        .and_then(|v| v.get("threshold").and_then(|n| n.as_i64()))
        .filter(|n| *n > 0)
        .unwrap_or(PICONLY_DEFAULT_THRESHOLD);
    let mute_ms = cfg
        .as_ref()
        .and_then(|v| v.get("muteTime").and_then(|n| n.as_i64()))
        .filter(|n| *n > 0)
        .unwrap_or(PICONLY_DEFAULT_MUTE_MS);
    // TS defaults a missing row to `{ ..., createThread: "yes" }`,
    // but a present row needs an explicit "yes"
    // (`baseData.createThread === "yes"`); a missing field reads as No.
    let thread_value = if cfg
        .as_ref()
        .and_then(|v| v.get("createThread").and_then(|s| s.as_str()))
        .map(|s| s == "yes")
        .unwrap_or(true)
    {
        t("var_yes", "Yes")
    } else {
        t("var_no", "No")
    };

    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(t("utils_pic_only_embed_title", "Media Only Channels"))
        .description(t(
            "utils_pic_only_emnbed_desc",
            "Channel where pictures/images/videos are the only things allowed.",
        ))
        .color(0x475387)
        .field(
            t(
                "joinghostping_add_ok_embed_fields_name",
                "All registered channels",
            ),
            channels_value,
            false,
        )
        .field(
            t(
                "antispam_manage_choices_12_label",
                "Threshold before punishment",
            ),
            threshold.to_string(),
            true,
        )
        .field(
            t("utils_piconly_embed_fields_3_name", "Timeout Time"),
            crate::commands::guildconfig::beautiful_ms_lang(mute_ms as f64, &code),
            true,
        )
        .field(
            t(
                "utils_piconly_embed_fields2_placeholder",
                "Create a thread under the image/video",
            ),
            thread_value,
            true,
        );
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Media-only panel config defaults. Mirrors !media-only.ts
/// (`UTILS.picOnlyConfig` fallbacks: threshold 3, muteTime 600000).
/// These feed the live enforcement in events_handler.rs. The TS panel
/// helpers (modal clamps, thread toggle, channel-list rendering) have
/// no config surface here and are deleted, not kept as dead code.
pub const PICONLY_DEFAULT_THRESHOLD: i64 = 3;
/// Default mute time in ms (10 minutes, the TS `|| 600000` fallback).
pub const PICONLY_DEFAULT_MUTE_MS: i64 = 600_000;

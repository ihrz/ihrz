// Split from `main.rs`: `!welcomer` entry + render/send helpers. Pure move, no logic change.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

use super::banner::*;
use super::constants::*;
use super::render::*;
use super::state::*;

/// Panel entry. Mirrors !welcomer.ts (opens the panel on join section).
/// Name + alias mirror MessageCommands/guildconfig/welcomer.ts
/// (`welcomer`, aliases `leaver`); prefix-only, the slash leg lives at
/// /guildconfig set welcomer in TS.
#[poise::command(prefix_command, rename = "welcomer", aliases("leaver"))]
pub async fn welcomer_panel(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let poise::Context::Prefix(pctx) = ctx else {
        return Ok(());
    };
    let Some(guild_id) = pctx.msg.guild_id else {
        return Ok(());
    };
    let pool = &pctx.data.pool;
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    // Fresh panels open on join like the TS in-memory init: reset any
    // section persisted by an earlier panel's select interaction.
    set_section(pool, &guild_id.get().to_string(), WELCOMER_ENTRY_SECTION).await;
    // Placeholder post (reply) then the full render() edit, like
    // interactionSend + render() in TS. Join section never previews.
    let channel_id = pctx.channel_id().get();
    let msg_id = crate::commands::welcomer_panel::v2::post_channel_v2(
        channel_id,
        Some(pctx.msg.id.get()),
        &[panel_placeholder_v2(&lang_code, "join")],
    )
    .await
    .map_err(|e| anyhow::anyhow!(e))?;
    let roles: &[serenity::RoleId] = pctx
        .msg
        .member
        .as_ref()
        .map(|m| m.roles.as_slice())
        .unwrap_or(&[]);
    let (components, files) = render_panel_message(
        pctx.serenity_context,
        pool,
        &guild_id.get().to_string(),
        &lang_code,
        guild_id,
        pctx.author(),
        roles,
        false,
    )
    .await?;
    // Collector bind: the panel answers only to its opener (see
    // `crate::collector`); anyone else gets the ephemeral denial.
    crate::collector::collector_bind(
        &format!("welcomer:{msg_id}"),
        pctx.author().id.get(),
        WELCOMER_COLLECTOR_TIMEOUT_SECS as u64,
    );
    crate::commands::welcomer_panel::v2::patch_message_v2(channel_id, msg_id, &components, files)
        .await
        .map_err(|e| anyhow::anyhow!(e))?;
    Ok(())
}

/// Read the persisted panel section (the stateless stand-in for the
/// TS in-memory `state.section`). Absent/invalid reads as join, like
/// the TS `section: "join"` init.
pub(crate) async fn stored_section(pool: &crate::db::Pool, gid: &str) -> String {
    crate::commands::guildconfig::load_guild_config(pool, gid)
        .await
        .get(PANEL_SECTION_FIELD)
        .and_then(|v| v.as_str())
        .filter(|s| welcomer_section(s).is_some())
        .unwrap_or(WELCOMER_ENTRY_SECTION)
        .to_string()
}

/// Load state + build the full V2 payload (with banner preview when
/// applicable). Shared by the entry edit, rerenders and the slash leg.
/// Returns (components, files).
#[allow(clippy::too_many_arguments)]
pub(crate) async fn render_panel_message(
    ctx: &serenity::Context,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    guild_id: serenity::GuildId,
    user: &serenity::User,
    member_roles: &[serenity::RoleId],
    disabled: bool,
) -> Result<(Vec<serde_json::Value>, Vec<(String, Vec<u8>)>), anyhow::Error> {
    let section = stored_section(pool, gid).await;
    let st = load_panel_state(
        pool,
        gid,
        &section,
        &t(lang_code, "setjoinmessage_image_default_text"),
    )
    .await;
    let green = crate::emojis::app_emoji_markup(&ctx.http, "GreenTick")
        .await
        .unwrap_or_default();
    let no = crate::emojis::app_emoji_markup(&ctx.http, "No")
        .await
        .unwrap_or_default();
    let preview = if st.section == "banner" && st.banner_state != "off" {
        crate::commands::welcomer_panel::v2::banner_preview_png(
            ctx,
            guild_id,
            user,
            member_roles,
            &st.banner,
            lang_code,
        )
        .await
        .map(|bytes| {
            (
                crate::commands::welcomer_panel::v2::BANNER_ATTACHMENT_NAME.to_string(),
                bytes,
            )
        })
    } else {
        None
    };
    let components = vec![panel_v2(
        &st,
        lang_code,
        &green,
        &no,
        disabled,
        preview.is_some(),
    )];
    Ok((components, preview.into_iter().collect()))
}

/// Audit post to the ihorizon-logs channel. Mirrors the
/// client.func.ihorizon_logs calls in the panel setters.
pub(crate) async fn post_panel_log(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    title: String,
    description: String,
) {
    let Ok(channels) = guild_id.channels(http).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|(id, c)| (id.get(), c.name.clone()))
        .collect();
    if let Some(log_id) = crate::funcs::logs_channel_id(&list) {
        let _ = serenity::ChannelId::new(log_id)
            .send_message(
                http,
                serenity::CreateMessage::new().embed(
                    serenity::CreateEmbed::default()
                        .colour(0xBF0BB9)
                        .title(title)
                        .description(description),
                ),
            )
            .await;
    }
}

/// Re-render the panel message after a state change. Mirrors render():
/// interaction callback UPDATE_MESSAGE with the V2 container (+ banner
/// preview PNG when applicable).
pub(crate) async fn rerender(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let roles: &[serenity::RoleId] = comp
        .member
        .as_ref()
        .map(|m| m.roles.as_slice())
        .unwrap_or(&[]);
    let Ok((components, files)) = render_panel_message(
        ctx, pool, gid, lang_code, guild_id, &comp.user, roles, false,
    )
    .await
    else {
        return;
    };
    if let Err(e) = crate::commands::welcomer_panel::v2::callback_update_v2(
        comp.id.get(),
        &comp.token,
        &components,
        files,
    )
    .await
    {
        tracing::warn!("welcomer rerender failed in guild {gid}: {e}");
    }
}

/// Re-render the panel with pickers dropped and buttons disabled.
/// End-of-window form of rerender (mirrors the TS collector `end`
/// handler calling `render(placeholder, true)`).
pub(crate) async fn render_disabled(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let roles: &[serenity::RoleId] = comp
        .member
        .as_ref()
        .map(|m| m.roles.as_slice())
        .unwrap_or(&[]);
    let Ok((components, files)) =
        render_panel_message(ctx, pool, gid, lang_code, guild_id, &comp.user, roles, true).await
    else {
        return;
    };
    if let Err(e) = crate::commands::welcomer_panel::v2::callback_update_v2(
        comp.id.get(),
        &comp.token,
        &components,
        files,
    )
    .await
    {
        tracing::warn!("welcomer render_disabled failed in guild {gid}: {e}");
    }
}

pub(crate) async fn set_section(pool: &crate::db::Pool, gid: &str, section: &str) {
    let mut cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
    crate::commands::guildconfig::welcomer_set(
        &mut cfg,
        PANEL_SECTION_FIELD,
        Some(serde_json::Value::String(section.to_string())),
    );
    // Section switch closes the contextual banner picker (like TS
    // `state.picker = null`).
    crate::commands::guildconfig::welcomer_set(&mut cfg, BANNER_PICKER_FIELD, None);
    let _ = crate::commands::guildconfig::save_guild_config(pool, gid, &cfg).await;
}

/// Persist the banner config + picker state. Mirrors saveBanner plus
/// the picker transitions in handlePropAction.
pub(crate) async fn save_banner(
    pool: &crate::db::Pool,
    gid: &str,
    banner: &BannerConfig,
    picker: BannerPicker,
) -> anyhow::Result<()> {
    let mut cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
    crate::commands::guildconfig::welcomer_set(
        &mut cfg,
        "joinbanner",
        Some(banner_config_value(banner)),
    );
    crate::commands::guildconfig::welcomer_set(
        &mut cfg,
        BANNER_PICKER_FIELD,
        picker.stored().map(serde_json::Value::String),
    );
    crate::commands::guildconfig::save_guild_config(pool, gid, &cfg).await
}

/// Load the banner config with the lang default message.
pub(crate) async fn load_banner(
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
) -> BannerConfig {
    let cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
    banner_config(&cfg, &t(lang_code, "setjoinmessage_image_default_text"))
}

pub(crate) async fn ephemeral(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = comp
        .create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// EMBED.{id} existence via the shared embed store reader
/// (table-first, legacy kv fallback), mirroring the ticket panel
/// `embed_exists` precedent: a row without an `embedSource` leaf
/// reads as missing.
pub(crate) async fn welcomer_embed_exists(
    pool: &crate::db::Pool,
    gid: &str,
    embed_id: &str,
) -> bool {
    crate::commands::ticket::embed_source_routed(pool, gid, embed_id)
        .await
        .is_some()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::welcomer_panel::constants::WELCOMER_ENTRY_SECTION;
    #[tokio::test]
    async fn fresh_entry_resets_persisted_section_to_join() {
        // Live wave EH (2026-10-16): a bare `.welcomer` rendered the
        // channels section because an earlier panel's select had
        // persisted it, while prod (TS in-memory `section: "join"`
        // init in openWelcomerPanel) always opens join. Entries reset
        // to WELCOMER_ENTRY_SECTION; rerenders keep stored_section.
        assert_eq!(WELCOMER_ENTRY_SECTION, "join");
        let pool = crate::db::memory_pool().await;
        // Fresh guild: no persisted section reads as join.
        assert_eq!(stored_section(&pool, "g").await, "join");
        // Earlier panel switched to channels (component path).
        set_section(&pool, "g", "channels").await;
        assert_eq!(stored_section(&pool, "g").await, "channels");
        // Fresh entry resets to join.
        set_section(&pool, "g", WELCOMER_ENTRY_SECTION).await;
        assert_eq!(stored_section(&pool, "g").await, "join");
        // Corrupt values fall back to join, never panic a render.
        {
            let mut cfg = crate::commands::guildconfig::load_guild_config(&pool, "g").await;
            crate::commands::guildconfig::welcomer_set(
                &mut cfg,
                "welcomerPanelSection",
                Some(serde_json::json!("nope")),
            );
            crate::commands::guildconfig::save_guild_config(&pool, "g", &cfg)
                .await
                .unwrap();
        }
        assert_eq!(stored_section(&pool, "g").await, "join");
    }
    #[tokio::test]
    async fn embed_existence_routes_through_embed_store() {
        // R8: the join/leave embed-id check reads through the shared
        // embed store (table-first, legacy kv fallback, keys
        // unchanged), mirroring the ticket panel `embed_exists`
        // precedent.
        let pool = crate::db::memory_pool().await;
        assert!(!welcomer_embed_exists(&pool, "g", "e1").await);
        // Legacy-only kv row still reads.
        let legacy = serde_json::json!({"embedSource": {"title": "legacy"}}).to_string();
        crate::db::kv_set(&pool, "g", "EMBED.e1", &legacy)
            .await
            .unwrap();
        assert!(welcomer_embed_exists(&pool, "g", "e1").await);
        // Table row wins when both stores hold the id.
        let table = serde_json::json!({"embedSource": {"title": "table"}}).to_string();
        crate::commands::owner::main::routed_set(&pool, "g", "g", "EMBED.e1", &table)
            .await
            .unwrap();
        assert!(welcomer_embed_exists(&pool, "g", "e1").await);
        // Row without an embedSource leaf reads as missing.
        crate::db::kv_set(&pool, "g", "EMBED.e0", r#"{"other":1}"#)
            .await
            .unwrap();
        assert!(!welcomer_embed_exists(&pool, "g", "e0").await);
    }
}

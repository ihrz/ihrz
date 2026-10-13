use super::*;
use super::{
    disable::sticky_disable, embed::sticky_embed, list::sticky_list, refresh::sticky_refresh,
    show::sticky_show, text::sticky_text,
};

/// Manage sticky messages in text channels
#[poise::command(
    slash_command,
    prefix_command,
    category = "sticky",
    rename = "sticky",
    subcommands(
        "sticky_text",
        "sticky_embed",
        "sticky_disable",
        "sticky_show",
        "sticky_list",
        "sticky_refresh"
    ),
    subcommand_required
)]
pub async fn sticky(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Raw sticky loader without the enabled filter. `show` uses it so a
/// disabled config displays its Disabled status instead of "not found";
/// every other command keeps the enabled-only `load_sticky`, mirroring
/// TS `getStickyChannelConfig` (null when `!config.enabled`).
pub async fn load_sticky_any(
    pool: &crate::db::Pool,
    guild_id: &str,
    channel_id: u64,
) -> Option<StickyConfig> {
    let key = sticky_key(channel_id);
    let backend = crate::backends::Backend::sqlite(pool.clone());
    if let Ok(Some(v)) = backend.table(guild_id).get::<serde_json::Value>(&key).await {
        if let Ok(cfg) = serde_json::from_value::<StickyConfig>(v) {
            return Some(cfg);
        }
    }
    let s = crate::db::kv_get(pool, guild_id, &key).await?;
    serde_json::from_str(&s).ok()
}

/// Normalize an optional embed id the way TS truthiness does: empty or
/// whitespace-only counts as absent for the type/line labels.
pub fn present_embed_id(id: Option<&str>) -> Option<&str> {
    id.map(str::trim).filter(|s| !s.is_empty())
}

#[cfg(test)]
mod helper_tests {
    use super::*;

    #[test]
    fn blank_embed_id_counts_as_absent() {
        assert_eq!(present_embed_id(None), None);
        assert_eq!(present_embed_id(Some("")), None);
        assert_eq!(present_embed_id(Some("   ")), None);
        assert_eq!(present_embed_id(Some("e1")), Some("e1"));
    }

    #[test]
    fn template_placeholders_fill() {
        let template = "${client.iHorizon_Emojis.No} | ${interaction.user}, no channel.";
        let mut s = template.to_string();
        s = s.replace("${client.iHorizon_Emojis.No}", "NO");
        let out = s.replace("${interaction.user}", "<@1>");
        assert_eq!(out, "NO | <@1>, no channel.");
    }

    fn params_of(cmd: &poise::Command<crate::bot::Data, anyhow::Error>) -> Vec<(&str, bool)> {
        cmd.parameters
            .iter()
            .map(|p| (p.name.as_str(), p.required))
            .collect()
    }

    #[test]
    fn sticky_channel_params_are_required_like_ts() {
        // TS `sticky.ts` declares channel `required: true` on every
        // subcommand, so checkCommandArgs answers missing/bad prefix
        // channel input with the caret usage embed before run(). Poise
        // mirrors that gate only when the params are required: Option
        // params would swallow the miss and reply the plain-text
        // sticky_channel_command_error key instead (divergence verified
        // live vs prod on `.sticky show #general` and `.sticky text <id>`).
        let show = super::show::sticky_show();
        assert_eq!(params_of(&show), vec![("channel", true)]);
        let disable = super::disable::sticky_disable();
        assert_eq!(params_of(&disable), vec![("channel", true)]);
        let refresh = super::refresh::sticky_refresh();
        assert_eq!(params_of(&refresh), vec![("channel", true)]);
        let embed = super::embed::sticky_embed();
        assert_eq!(
            params_of(&embed),
            vec![
                ("channel", true),
                ("embed_id", true),
                ("message_content", false)
            ]
        );
        let text = super::text::sticky_text();
        assert_eq!(params_of(&text), vec![("channel", true), ("message", true)]);
    }
}

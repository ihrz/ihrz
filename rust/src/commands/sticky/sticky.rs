use super::*;
use super::{
    disable::sticky_disable, embed::sticky_embed, list::sticky_list, refresh::sticky_refresh,
    show::sticky_show, text::sticky_text,
};
use poise::serenity_prelude as serenity;

/// Subcommand for sticky category!
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

/// Prefix-shape channel error. Mirrors the TS
/// `client.func.method.channel(interaction, args, 0)` null path: every
/// sticky subcommand answers `sticky_channel_command_error` with the No
/// emoji and the invoking user filled, instead of a framework parse error.
pub async fn invalid_channel_text(
    http: &std::sync::Arc<serenity::Http>,
    template: &str,
    user_mention: &str,
) -> String {
    let no = no_markup(http).await;
    fill(
        template,
        &[
            ("${client.iHorizon_Emojis.No}", no.as_str()),
            ("${interaction.user}", user_mention),
        ],
    )
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
}

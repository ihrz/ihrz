use super::*;
use super::{
    add::notifier_add, channel::notifier_channel, list::notifier_list, message::notifier_message,
    remove::notifier_remove,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "notifier",
    rename = "notifier",
    subcommands(
        "notifier_add",
        "notifier_remove",
        "notifier_list",
        "notifier_channel",
        "notifier_message"
    )
)]
pub async fn notifier(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

// Newsletter subscription state. Mirrors the `newsletter_bl`
// bot-scope map (metasTable) toggled by the newsletter-toggle button
// (`newsletter-toggle%<guildId>?dm`) and the +updates command.
// Reuses the existing newsletter_* YAML keys; no new strings here.

/// Bot-scope kv key for the unsubscribe map. Same key as TS.
pub const NEWSLETTER_BL_KEY: &str = "newsletter_bl";
/// Custom-id prefix of the unsubscribe button in the owner DM.
pub const NEWSLETTER_TOGGLE_PREFIX: &str = "newsletter-toggle%";

/// Extract the guild id from a `newsletter-toggle%<guildId>?dm`
/// button id. Returns None for foreign ids.
pub fn newsletter_toggle_guild(custom_id: &str) -> Option<&str> {
    let rest = custom_id.strip_prefix(NEWSLETTER_TOGGLE_PREFIX)?;
    Some(rest.split('?').next().unwrap_or(rest))
}

/// Pure toggle: returns true when the owner is now unsubscribed.
pub fn newsletter_toggle(
    map: &mut std::collections::HashMap<String, bool>,
    owner_id: &str,
) -> bool {
    if map.remove(owner_id).is_some() {
        false
    } else {
        map.insert(owner_id.to_string(), true);
        true
    }
}

async fn newsletter_map(pool: &crate::db::Pool) -> std::collections::HashMap<String, bool> {
    crate::db::kv_get(pool, "0", NEWSLETTER_BL_KEY)
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// True when the owner unsubscribed from release DMs.
pub async fn newsletter_unsubscribed(pool: &crate::db::Pool, owner_id: &str) -> bool {
    newsletter_map(pool)
        .await
        .get(owner_id)
        .copied()
        .unwrap_or(false)
}

/// Flip the subscription, persisting the map. Returns the new
/// unsubscribed state.
pub async fn newsletter_set(
    pool: &crate::db::Pool,
    owner_id: &str,
    unsubscribed: bool,
) -> anyhow::Result<bool> {
    let mut map = newsletter_map(pool).await;
    if unsubscribed {
        map.insert(owner_id.to_string(), true);
    } else {
        map.remove(owner_id);
    }
    crate::db::kv_set(pool, "0", NEWSLETTER_BL_KEY, &serde_json::to_string(&map)?).await?;
    Ok(unsubscribed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn toggle_id_parsing() {
        assert_eq!(
            newsletter_toggle_guild("newsletter-toggle%123?dm"),
            Some("123")
        );
        assert_eq!(
            newsletter_toggle_guild("newsletter-toggle%123"),
            Some("123")
        );
        assert_eq!(newsletter_toggle_guild("other%123?dm"), None);
    }

    #[test]
    fn toggle_flips_map() {
        let mut map = std::collections::HashMap::new();
        assert!(newsletter_toggle(&mut map, "o1"));
        assert!(map.contains_key("o1"));
        assert!(!newsletter_toggle(&mut map, "o1"));
        assert!(!map.contains_key("o1"));
    }
}

// Owned-component collector guard.
//
// Shared wrapper enforcing the per-user interaction rule on every
// interactive flow (panels, toggles, confirms), in the spirit of the
// TS `iHorizonModalBuilder` helper: one reusable gate instead of
// ad-hoc checks per handler.
//
// Rule: a component click is honored only when the clicker is the
// flow owner (the user who opened the panel / ran the command).
// Anyone else gets an EPHEMERAL denial reply (`interaction_not_for_you`)
// — never silence, never action. This mirrors the TS collector
// `filter: (i) => i.user.id === authorId` pattern, enforced
// server-side where no collector object exists.
//
// Usage:
// ```ignore
// // at send time (panel open, toggle prompt):
// crate::collector::collector_bind("welcomer:123", user_id);
// // at click time (handler head):
// let Some(owner) = crate::collector::collector_owner("welcomer:123") else {
//     crate::collector::deny_not_owner(http, comp, &lang).await;
//     return Ok(());
// };
// if !crate::collector::check_owner(comp.user.id.get(), owner) {
//     crate::collector::deny_not_owner(http, comp, &lang).await;
//     return Ok(());
// }
// ```
//
// TS rule: no user-visible string hardcoded; the denial text lives
// in YAML (`interaction_not_for_you`) with an EN fallback.

use poise::serenity_prelude as serenity;

static FLOW_OWNERS: std::sync::OnceLock<
    std::sync::Mutex<std::collections::HashMap<String, (u64, u64)>>,
> = std::sync::OnceLock::new();

fn owners() -> &'static std::sync::Mutex<std::collections::HashMap<String, (u64, u64)>> {
    FLOW_OWNERS.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()))
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Pure ownership predicate. The clicker proceeds only on equality.
pub fn check_owner(viewer_id: u64, owner_id: u64) -> bool {
    viewer_id == owner_id
}

/// Bind a flow key (e.g. `"welcomer:<msg_id>"`) to its owner for
/// `ttl_secs`. Re-binding refreshes owner + expiry; expired entries
/// are swept on every bind.
pub fn collector_bind(key: &str, owner_id: u64, ttl_secs: u64) {
    let now = now_secs();
    if let Ok(mut map) = owners().lock() {
        map.retain(|_, (_, exp)| *exp > now);
        map.insert(key.to_string(), (owner_id, now.saturating_add(ttl_secs)));
    }
}

/// Resolve the live owner of a flow key. `None` when never bound or
/// expired — callers deny on `None` (secure default: unknown flows
/// never run).
pub fn collector_owner(key: &str) -> Option<u64> {
    let now = now_secs();
    owners()
        .lock()
        .ok()
        .and_then(|map| map.get(key).copied())
        .and_then(|(owner, exp)| (exp > now).then_some(owner))
}

/// Ephemeral "not for you" denial. Always replies (never silent) so
/// the clicker gets feedback instead of a dead interaction.
pub async fn deny_not_owner(
    http: &std::sync::Arc<serenity::Http>,
    comp: &serenity::ComponentInteraction,
    lang_code: &str,
) {
    let text = crate::lang::get(lang_code, "interaction_not_for_you")
        .unwrap_or_else(|| "This interaction isn't for you.".to_string());
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(text)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// Full gate for a bound flow key: resolves the owner, denies (and
/// returns `None`) on unknown/expired key or owner mismatch, returns
/// `Some(owner_id)` when the clicker may proceed.
pub async fn check_collector_owner(
    http: &std::sync::Arc<serenity::Http>,
    comp: &serenity::ComponentInteraction,
    key: &str,
    lang_code: &str,
) -> Option<u64> {
    let owner = collector_owner(key)?;
    if !check_owner(comp.user.id.get(), owner) {
        deny_not_owner(http, comp, lang_code).await;
        return None;
    }
    Some(owner)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn check_owner_allows_self_denies_other() {
        assert!(check_owner(7, 7));
        assert!(!check_owner(8, 7));
        assert!(!check_owner(7, 8));
    }

    #[test]
    fn bind_resolves_owner_until_expiry() {
        collector_bind("test:owner-basic", 42, 60);
        assert_eq!(collector_owner("test:owner-basic"), Some(42));
        assert_eq!(collector_owner("test:owner-missing"), None);
    }

    #[test]
    fn expired_binding_resolves_none() {
        collector_bind("test:owner-expired", 43, 0);
        // ttl 0 -> expiry == now -> not strictly greater -> denied.
        assert_eq!(collector_owner("test:owner-expired"), None);
    }

    #[test]
    fn rebind_refreshes_owner() {
        collector_bind("test:owner-rebind", 44, 60);
        collector_bind("test:owner-rebind", 45, 60);
        assert_eq!(collector_owner("test:owner-rebind"), Some(45));
    }
}

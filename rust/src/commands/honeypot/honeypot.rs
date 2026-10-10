use super::*;
use super::{config::honeypot_config, post::honeypot_post};

#[poise::command(
    slash_command,
    prefix_command,
    category = "honeypot",
    rename = "honeypot",
    subcommands("honeypot_config", "honeypot_post"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn honeypot(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Two-hour trap window. Mirrors HONEYPOT_WINDOW_MS in
/// src/core/modules/honeypotManager.ts.
pub const HONEYPOT_WINDOW_MS: i64 = 1000 * 60 * 60 * 2;
/// Debounce before the pipeline runs. Mirrors HONEYPOT_TRIGGER_DELAY.
pub const HONEYPOT_TRIGGER_DELAY_MS: u64 = 1500;
/// Delay between the two cleanup sweeps. Mirrors
/// HONEYPOT_SECOND_PASS_DELAY_MS.
pub const HONEYPOT_SECOND_PASS_DELAY_MS: u64 = 8000;

/// Queue key for the debounced trigger. Mirrors getHoneypotQueueKey
/// (`guild.channel.user`, latest message wins).
pub fn honeypot_queue_key(guild_id: &str, channel_id: &str, user_id: &str) -> String {
    format!("{guild_id}.{channel_id}.{user_id}")
}

/// Next debounce sequence + trigger count. Mirrors the reschedule
/// branch of scheduleHoneypotTrigger: each new message bumps both.
pub fn honeypot_next_schedule(prev: Option<(u64, u64)>) -> (u64, u64) {
    let (seq, count) = prev.unwrap_or((0, 0));
    (seq + 1, count + 1)
}

/// Event-level trigger evaluation. Mirrors src/Events/honeypot/honeypot.ts
/// (bot/webhook skip, staff exemption, enabled trap channel match).
pub fn should_schedule_honeypot_trigger(
    is_bot: bool,
    is_webhook: bool,
    staff_exempt: bool,
    enabled: bool,
    configured_channel_id: &str,
    message_channel_id: &str,
) -> bool {
    if is_bot || is_webhook || staff_exempt {
        return false;
    }
    if !enabled || configured_channel_id.is_empty() {
        return false;
    }
    message_channel_id == configured_channel_id
}

/// Pipeline-entry guard. Mirrors the configuration-changed early return
/// in processHoneypotTrigger (re-read after the debounce delay).
pub fn should_run_honeypot_pipeline(
    enabled: bool,
    configured_channel_id: &str,
    message_channel_id: &str,
) -> bool {
    if !enabled || configured_channel_id.is_empty() {
        return false;
    }
    message_channel_id == configured_channel_id
}

/// Sweep cutoff for the 2h window. Mirrors `Date.now() - HONEYPOT_WINDOW_MS`.
pub fn honeypot_sweep_cutoff(now_ms: i64) -> i64 {
    now_ms - HONEYPOT_WINDOW_MS
}

/// Sweep target filter. Mirrors the deleteRecentMessages predicate
/// (same author, created at or after the cutoff).
pub fn honeypot_message_in_sweep(author_matches: bool, created_ms: i64, cutoff_ms: i64) -> bool {
    author_matches && created_ms >= cutoff_ms
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn timing_mirrors_ts_manager() {
        assert_eq!(HONEYPOT_WINDOW_MS, 7_200_000);
        assert_eq!(HONEYPOT_TRIGGER_DELAY_MS, 1500);
        assert_eq!(HONEYPOT_SECOND_PASS_DELAY_MS, 8000);
        assert_eq!(honeypot_sweep_cutoff(7_200_001), 1);
    }

    #[test]
    fn queue_key_shape_matches_ts() {
        assert_eq!(honeypot_queue_key("g", "c", "u"), "g.c.u");
    }

    #[test]
    fn debounce_bumps_seq_and_count() {
        assert_eq!(honeypot_next_schedule(None), (1, 1));
        assert_eq!(honeypot_next_schedule(Some((1, 1))), (2, 2));
        // Latest message wins: stale sequences never reuse a slot.
        assert_eq!(honeypot_next_schedule(Some((7, 3))), (8, 4));
    }

    #[test]
    fn trigger_gate_mirrors_event_guard() {
        assert!(should_schedule_honeypot_trigger(
            false, false, false, true, "c", "c"
        ));
        assert!(!should_schedule_honeypot_trigger(
            true, false, false, true, "c", "c"
        ));
        assert!(!should_schedule_honeypot_trigger(
            false, true, false, true, "c", "c"
        ));
        assert!(!should_schedule_honeypot_trigger(
            false, false, true, true, "c", "c"
        ));
        assert!(!should_schedule_honeypot_trigger(
            false, false, false, false, "c", "c"
        ));
        assert!(!should_schedule_honeypot_trigger(
            false, false, false, true, "", "c"
        ));
        assert!(!should_schedule_honeypot_trigger(
            false, false, false, true, "c", "other"
        ));
    }

    #[test]
    fn pipeline_reruns_config_check() {
        assert!(should_run_honeypot_pipeline(true, "c", "c"));
        assert!(!should_run_honeypot_pipeline(false, "c", "c"));
        assert!(!should_run_honeypot_pipeline(true, "", "c"));
        assert!(!should_run_honeypot_pipeline(true, "c", "other"));
    }

    #[test]
    fn sweep_filter_matches_ts_predicate() {
        assert!(honeypot_message_in_sweep(true, 100, 100));
        assert!(honeypot_message_in_sweep(true, 101, 100));
        assert!(!honeypot_message_in_sweep(true, 99, 100));
        assert!(!honeypot_message_in_sweep(false, 200, 100));
    }
}

use super::*;

/// Presence-bucket counts. Mirrors calculateMemberStats
/// (missing presence falls into invisible, like the TS default).
#[derive(Debug, Default, PartialEq)]
pub struct MemberStats {
    pub total: usize,
    pub online: usize,
    pub idle: usize,
    pub dnd: usize,
    pub invisible: usize,
}

pub fn count_member_stats(statuses: &[Option<&str>]) -> MemberStats {
    let mut stats = MemberStats {
        total: statuses.len(),
        ..Default::default()
    };
    for status in statuses {
        match *status {
            Some("online") => stats.online += 1,
            Some("idle") => stats.idle += 1,
            Some("dnd") => stats.dnd += 1,
            _ => stats.invisible += 1,
        }
    }
    stats
}

/// Voice counts over states with a channel. Mirrors
/// calculateVoiceStats (total = distinct users = rows here).
#[derive(Debug, Default, PartialEq)]
pub struct VoiceStats {
    pub total: usize,
    pub streaming: usize,
    pub self_deaf: usize,
    pub self_mute: usize,
    pub self_video: usize,
}

pub fn count_voice_stats(states: &[(bool, bool, bool, bool, bool)]) -> VoiceStats {
    // (in_channel, streaming, self_deaf, self_mute, self_video)
    let in_channel: Vec<&(bool, bool, bool, bool, bool)> = states.iter().filter(|s| s.0).collect();
    VoiceStats {
        total: in_channel.len(),
        streaming: in_channel.iter().filter(|s| s.1).count(),
        self_deaf: in_channel.iter().filter(|s| s.2).count(),
        self_mute: in_channel.iter().filter(|s| s.3).count(),
        self_video: in_channel.iter().filter(|s| s.4).count(),
    }
}

/// Server-stats embed description. Short mode drops emoji prefixes
/// and large-only rows, like the TS forEach.
pub fn vc_description(rows: &[(&str, &str, String, bool)], is_large: bool) -> String {
    rows.iter()
        .filter(|(_, _, _, large_only)| is_large || !large_only)
        .map(|(emoji, label, value, _)| {
            if is_large {
                format!("{emoji}  {label} : **{value}**\n")
            } else {
                format!("{label} : **{value}**\n")
            }
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// App-emoji markup with empty fallback (stat rows tolerate
/// missing synced emojis).
pub(crate) async fn stat_emoji(http: &std::sync::Arc<serenity::Http>, name: &str) -> String {
    crate::emojis::app_emoji_markup(http, name)
        .await
        .unwrap_or_default()
}

#[cfg(test)]
mod vc_stats_tests {
    use super::{count_member_stats, count_voice_stats, vc_description};

    #[test]
    fn member_buckets_match_ts() {
        let s = count_member_stats(&[
            Some("online"),
            Some("idle"),
            Some("dnd"),
            Some("offline"),
            None,
        ]);
        assert_eq!(s.total, 5);
        assert_eq!(s.online, 1);
        assert_eq!(s.idle, 1);
        assert_eq!(s.dnd, 1);
        // offline + missing presence fall into invisible (TS default).
        assert_eq!(s.invisible, 2);
    }

    #[test]
    fn voice_counts_skip_channeless() {
        let v = count_voice_stats(&[
            (true, true, false, false, true),
            (true, false, true, false, false),
            (false, true, true, true, true),
        ]);
        assert_eq!(v.total, 2);
        assert_eq!(v.streaming, 1);
        assert_eq!(v.self_deaf, 1);
        assert_eq!(v.self_mute, 0);
        assert_eq!(v.self_video, 1);
    }

    #[test]
    fn description_short_vs_large() {
        let rows = vec![
            ("E1", "Members", "10".to_string(), false),
            ("E2", "Camera", "3".to_string(), true),
        ];
        assert_eq!(vc_description(&rows, false), "Members : **10**");
        assert_eq!(
            vc_description(&rows, true),
            "E1  Members : **10**\nE2  Camera : **3**"
        );
    }
}

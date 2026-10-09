// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/invitesmanager/*.
//
// TS keys: <guild>.USER.<uid>.INVITES {invites, regular, bonus, leaves}.
// Leaderboard scans USER table sorted desc with 15/page pagination.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct InviteStats {
    #[serde(default)]
    pub invites: i64,
    #[serde(default)]
    pub regular: i64,
    #[serde(default)]
    pub bonus: i64,
    #[serde(default)]
    pub leaves: i64,
}

pub fn invites_key(user_id: u64) -> String {
    format!("USER.{user_id}.INVITES")
}

pub fn add_invites(s: &InviteStats, amount: i64) -> InviteStats {
    InviteStats {
        invites: s.invites + amount,
        regular: s.regular,
        bonus: s.bonus + amount,
        leaves: s.leaves,
    }
}

pub fn remove_invites(s: &InviteStats, amount: i64) -> InviteStats {
    InviteStats {
        invites: (s.invites - amount).max(0),
        regular: s.regular,
        bonus: (s.bonus - amount).max(0),
        leaves: s.leaves,
    }
}

/// Sort desc by invites, stable by user id asc. Mirrors leaderboard tri.
pub fn sort_leaderboard(mut rows: Vec<(u64, InviteStats)>) -> Vec<(u64, InviteStats)> {
    rows.sort_by(|a, b| b.1.invites.cmp(&a.1.invites).then(a.0.cmp(&b.0)));
    rows
}

pub async fn load_invites(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> InviteStats {
    crate::db::kv_get(pool, guild_id, &invites_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_invites(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    stats: &InviteStats,
) -> anyhow::Result<()> {
    crate::db::kv_set(
        pool,
        guild_id,
        &invites_key(user_id),
        &serde_json::to_string(stats)?,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_goes_to_bonus_not_regular() {
        let s = add_invites(&InviteStats::default(), 5);
        assert_eq!(s.invites, 5);
        assert_eq!(s.bonus, 5);
        assert_eq!(s.regular, 0);
    }

    #[test]
    fn remove_floors_at_zero() {
        let s = remove_invites(
            &InviteStats {
                invites: 3,
                bonus: 3,
                ..Default::default()
            },
            10,
        );
        assert_eq!(s.invites, 0);
        assert_eq!(s.bonus, 0);
    }

    #[test]
    fn leaderboard_sorts_desc_then_id() {
        let rows = vec![
            (
                2,
                InviteStats {
                    invites: 5,
                    ..Default::default()
                },
            ),
            (
                1,
                InviteStats {
                    invites: 5,
                    ..Default::default()
                },
            ),
            (
                3,
                InviteStats {
                    invites: 9,
                    ..Default::default()
                },
            ),
        ];
        let sorted = sort_leaderboard(rows);
        assert_eq!(sorted[0].0, 3);
        assert_eq!(sorted[1].0, 1);
        assert_eq!(sorted[2].0, 2);
    }
}

pub mod addinvites;
pub mod invites;
pub mod leaderboard;
pub mod removeinvites;
pub mod reset;
pub mod see;

/// Old registry path (`invitesmanager::main::*`) kept working.
#[allow(clippy::module_inception)]
#[allow(unused_imports)]
pub mod main {
    pub use super::addinvites::*;
    pub use super::invites::*;
    pub use super::leaderboard::*;
    pub use super::removeinvites::*;
    pub use super::reset::*;
    pub use super::see::*;
    pub use super::*;
}

/// Older registry path (`invitesmanager::inv::*`) kept working.
#[allow(unused_imports)]
pub mod inv {
    pub use super::addinvites::*;
    pub use super::invites::*;
    pub use super::leaderboard::*;
    pub use super::removeinvites::*;
    pub use super::reset::*;
    pub use super::see::*;
    pub use super::*;
}

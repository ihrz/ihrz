/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

// Per-user economy transaction locks.
//
// DELIBERATE HARDENING (no TS equivalent): neither TS (`!pay.ts`,
// `!deposit.ts`, `economyHelper.ts` — no lock/queue anywhere in `src/`)
// nor the previous Rust code serializes the load-modify-save of a user
// account, so two concurrent transfers can interleave (both read the same
// balance, both write). Hold one guard per touched user across the whole
// read-modify-write. Same poison-tolerant pattern as
// `sticky::refresh_queued` (`sticky/mod.rs`).

use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

static ECON_LOCKS: Lazy<Mutex<HashMap<u64, Arc<tokio::sync::Mutex<()>>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn lock_for(uid: u64) -> Arc<tokio::sync::Mutex<()>> {
    ECON_LOCKS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .entry(uid)
        .or_default()
        .clone()
}

/// Hold across the full read-modify-write of one user's account.
pub async fn guard_user(uid: u64) -> tokio::sync::OwnedMutexGuard<()> {
    lock_for(uid).lock_owned().await
}

/// Hold across a two-party transfer. Locks are always taken in ascending
/// id order, so two opposite-direction transfers cannot deadlock. A
/// self-transfer yields the same lock twice — callers must skip the
/// second guard in that case (see `pay.rs`).
pub fn ordered_pair(a: u64, b: u64) -> (u64, u64) {
    if a <= b {
        (a, b)
    } else {
        (b, a)
    }
}

#[cfg(test)]
mod tx_lock_tests {
    use super::*;

    #[test]
    fn ordered_pair_is_ascending_and_stable() {
        assert_eq!(ordered_pair(3, 9), (3, 9));
        assert_eq!(ordered_pair(9, 3), (3, 9));
        assert_eq!(ordered_pair(5, 5), (5, 5));
    }

    #[test]
    fn lock_for_returns_shared_arc_per_user() {
        assert!(Arc::ptr_eq(&lock_for(424242), &lock_for(424242)));
    }
}

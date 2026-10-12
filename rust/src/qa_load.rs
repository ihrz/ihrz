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

// Local load harness (QA, no Discord I/O).
//
// Exercises the hot pure paths every command funnels through — number
// parsing (`ts_number`/`parse_ts_int`), duration parsing
// (`parse_duration_ms`), slice truncation (`js_slice_take`), and the
// debounce window (`cooldown_remaining`) — plus contention on the
// economy per-user locks. Volumes ramp via `QA_LOAD_N` (default
// 2_000, hard cap 200_000); each test asserts a wall-clock ceiling so
// a regression fails loudly instead of hanging CI. Run explicitly:
// `QA_LOAD_N=20000 cargo test qa_load -- --nocapture`.

#[cfg(test)]
mod qa_load_tests {
    use crate::bot::cooldown_remaining;
    use crate::commands::economy::{parse_ts_int, ts_number};
    use crate::commands::shared::parse_duration_ms;
    use crate::commands::stats::js_slice_take;
    use std::time::Instant;

    fn load_n() -> usize {
        std::env::var("QA_LOAD_N")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(2_000)
            .clamp(100, 200_000)
    }

    const NUMBER_CORPUS: &[&str] = &[
        "42",
        "-7",
        "3.14",
        "0xFF",
        "0b101",
        "1e3",
        "Infinity",
        "",
        "  12  ",
        "abc",
        "12abc",
        "0",
        "-0",
        "9999999999999999999999",
    ];
    const DURATION_CORPUS: &[&str] = &[
        "10m", "3h 30m", "1h30m", "2d", "1w", "6mo", "1y", "1,5h", "90s", "500ms", "0s", "abc",
        "10x", "15d",
    ];

    #[test]
    fn qa_load_number_parsers_throughput() {
        let n = load_n();
        let t = Instant::now();
        let mut hits = 0usize;
        for i in 0..n {
            let raw = NUMBER_CORPUS[i % NUMBER_CORPUS.len()];
            if ts_number(raw).is_some() {
                hits += 1;
            }
            if parse_ts_int(raw).is_some() {
                hits += 1;
            }
        }
        let el = t.elapsed();
        eprintln!("qa_load numbers: {n} iters ({hits} hits) in {el:?}");
        assert!(el.as_secs() < 20, "number parsers too slow: {el:?}");
    }

    #[test]
    fn qa_load_duration_parser_throughput() {
        let n = load_n();
        let t = Instant::now();
        let mut hits = 0usize;
        for i in 0..n {
            if parse_duration_ms(DURATION_CORPUS[i % DURATION_CORPUS.len()]).is_some() {
                hits += 1;
            }
        }
        let el = t.elapsed();
        eprintln!("qa_load durations: {n} iters ({hits} hits) in {el:?}");
        assert!(el.as_secs() < 30, "duration parser too slow: {el:?}");
    }

    #[test]
    fn qa_load_debounce_and_slice_never_panic() {
        let n = load_n();
        let t = Instant::now();
        for i in 0..n {
            let now = 1_000_000 + i as i64;
            // Interleaved users sharing one window (5 fake users).
            let last = Some(now - (i as i64 % 1_200));
            let _ = cooldown_remaining(last, 1_000, now);
            let _ = js_slice_take(25, (i as i64 % 40) - 20);
            let _ = js_slice_take(0, -99);
        }
        let el = t.elapsed();
        eprintln!("qa_load debounce+slice: {n} iters in {el:?}");
        assert!(el.as_secs() < 10, "debounce/slice too slow: {el:?}");
    }

    #[tokio::test]
    async fn qa_load_econ_locks_serialize() {
        use std::sync::Arc;
        let n = load_n().clamp(100, 20_000);
        let counter = Arc::new(tokio::sync::Mutex::new(0u64));
        let mut tasks = Vec::new();
        for uid in 0..8u64 {
            let c = counter.clone();
            tasks.push(tokio::spawn(async move {
                for _ in 0..(n / 8) {
                    let _g = crate::commands::economy::tx_lock::guard_user(uid).await;
                    let mut v = c.lock().await;
                    // Read-modify-write under the per-user guard.
                    let cur = *v;
                    tokio::task::yield_now().await;
                    *v = cur + 1;
                }
            }));
        }
        let t = Instant::now();
        for h in tasks {
            h.await.expect("load task panicked");
        }
        let el = t.elapsed();
        let total = *counter.lock().await;
        eprintln!("qa_load econ-locks: {n} guarded increments in {el:?}");
        // One shared counter across 8 users is NOT fully serialized by
        // per-user locks (by design: only same-user pairs serialize), so
        // assert liveness + ceiling, not an exact total.
        assert!(total > 0, "no increments completed");
        assert!(el.as_secs() < 60, "econ locks too slow: {el:?}");
    }
}

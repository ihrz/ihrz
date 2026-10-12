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

// Command verbose debug. Opt-in dev tracer for "commands don't
// respond" reports: with `IHRZ_DEBUG_COMMANDS=1` every command and
// component interaction logs one line per pipeline stage (received,
// gate verdict + elapsed ms, defer result, handler outcome, response
// error) to stderr. Zero-cost default: a single OnceLock env read,
// no output unless enabled. Uses eprintln (not tracing) so it shows
// even when the tracing filter hides debug noise.

use std::sync::OnceLock;

static VERBOSE: OnceLock<bool> = OnceLock::new();

/// Pure env-value parser (unit-tested): 1/true/yes/on enable.
pub fn verbose_enabled(value: Option<&str>) -> bool {
    matches!(
        value.map(str::trim).map(str::to_ascii_lowercase),
        Some(v) if v == "1" || v == "true" || v == "yes" || v == "on"
    )
}

/// True when `IHRZ_DEBUG_COMMANDS` enables the tracer.
pub fn verbose() -> bool {
    *VERBOSE.get_or_init(|| verbose_enabled(std::env::var("IHRZ_DEBUG_COMMANDS").ok().as_deref()))
}

/// One tracer line to stderr when enabled. Format:
/// `[cmd-dbg] <stage> <detail>`.
pub fn log(stage: &str, detail: std::fmt::Arguments<'_>) {
    if verbose() {
        eprintln!("[cmd-dbg] {stage} {detail}");
    }
}

/// Millisecond clock for stage timings.
pub fn now_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verbose_flag_parsing() {
        assert!(verbose_enabled(Some("1")));
        assert!(verbose_enabled(Some("true")));
        assert!(verbose_enabled(Some("YES")));
        assert!(verbose_enabled(Some(" on ")));
        assert!(!verbose_enabled(Some("0")));
        assert!(!verbose_enabled(Some("false")));
        assert!(!verbose_enabled(Some("")));
        assert!(!verbose_enabled(None));
    }
}

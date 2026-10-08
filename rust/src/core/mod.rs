// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/core.ts main() init + src/core/modules/releaseNotifier.ts.

pub mod release {
    /// Mirrors writeVersionFile(): compares Cargo version against v.txt so
    /// shard 0 can run checkAndNotifyRelease() once per release.
    pub fn write_version_file(version: &str) -> anyhow::Result<()> {
        write_version_file_to(version, &repo_root())
    }

    pub fn write_version_file_to(version: &str, root: &std::path::Path) -> anyhow::Result<()> {
        let v = root.join("v.txt");
        let v_old = root.join("v.old.txt");
        let current = std::fs::read_to_string(&v).unwrap_or_default();
        if current.trim() != version.trim() {
            if !current.trim().is_empty() {
                let _ = std::fs::write(&v_old, current);
            }
            std::fs::write(&v, version)?;
            tracing::info!("version bumped to {version}");
        }
        Ok(())
    }

    fn repo_root() -> std::path::PathBuf {
        let mut p = std::env::current_dir().unwrap_or_else(|_| ".".into());
        if p.ends_with("rust") {
            p.pop();
        }
        p
    }

    /// One-shot release gate. Mirrors checkAndNotifyRelease() claim-before-send:
    /// returns the version to announce when v.txt advanced past v.old.txt,
    /// rotating v.old.txt forward so shard 0 announces exactly once.
    pub fn consume_release_note(root: &std::path::Path) -> Option<String> {
        let v = root.join("v.txt");
        let v_old = root.join("v.old.txt");
        let current = std::fs::read_to_string(&v).unwrap_or_default();
        let current = current.trim();
        if current.is_empty() {
            return None;
        }
        let previous = std::fs::read_to_string(&v_old).unwrap_or_default();
        if previous.trim() == current {
            return None;
        }
        let _ = std::fs::write(&v_old, current);
        Some(current.to_string())
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn tmpdir(name: &str) -> std::path::PathBuf {
            let p = std::path::PathBuf::from("/tmp/opencode/ihrz-test").join(name);
            let _ = std::fs::remove_dir_all(&p);
            std::fs::create_dir_all(&p).unwrap();
            p
        }

        #[test]
        fn writes_version_on_first_run() {
            let dir = tmpdir("release-first");
            write_version_file_to("2026.10.1", &dir).unwrap();
            assert_eq!(
                std::fs::read_to_string(dir.join("v.txt")).unwrap(),
                "2026.10.1"
            );
            assert!(!dir.join("v.old.txt").exists());
        }

        #[test]
        fn is_idempotent_for_same_version() {
            let dir = tmpdir("release-idem");
            write_version_file_to("1.0", &dir).unwrap();
            write_version_file_to("1.0", &dir).unwrap();
            assert!(!dir.join("v.old.txt").exists());
        }

        #[test]
        fn archives_previous_version_on_bump() {
            let dir = tmpdir("release-bump");
            write_version_file_to("1.0", &dir).unwrap();
            write_version_file_to("2.0", &dir).unwrap();
            assert_eq!(std::fs::read_to_string(dir.join("v.txt")).unwrap(), "2.0");
            assert_eq!(
                std::fs::read_to_string(dir.join("v.old.txt")).unwrap(),
                "1.0"
            );
        }

        #[test]
        fn consume_announces_once_per_bump() {
            let dir = tmpdir("release-consume");
            write_version_file_to("1.0", &dir).unwrap();
            // Fresh bump without old marker: announces, then silent.
            assert_eq!(consume_release_note(&dir).as_deref(), Some("1.0"));
            assert_eq!(consume_release_note(&dir), None);
            // Next bump announces again exactly once.
            write_version_file_to("2.0", &dir).unwrap();
            assert_eq!(consume_release_note(&dir).as_deref(), Some("2.0"));
            assert_eq!(consume_release_note(&dir), None);
        }
    }
}

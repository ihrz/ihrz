use super::*;

// Parent for `/git lines` (mirrors gitlines.ts declaration; the
// toggle itself lives in the `lines` subcommand like !lines.ts).
/// Git lines module.
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "git",
    subcommands("git_lines_toggle"),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
)]
pub async fn git_parent(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

// Flip UTILS.git_lines (default-on like the TS `!state` toggle)
// and confirm with git_lines_work[_disabled].
/// Toggle Git lines unfurls.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lines",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn git_lines_toggle(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let stored = crate::db::tbl_get(&ctx.data().pool, &gid, "UTILS.git_lines").await;
    let enabled = !crate::commands::utils::github_lines_enabled(stored.as_deref());
    crate::db::tbl_set(
        &ctx.data().pool,
        &gid,
        "UTILS.git_lines",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            if enabled {
                "git_lines_work"
            } else {
                "git_lines_work_disabled"
            },
            if enabled {
                "Git lines on."
            } else {
                "Git lines off."
            },
        )
        .await,
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn git_lines_toggle_roundtrip() {
        let pool = mem_pool().await;
        // Default-on: no row reads as missing (enabled).
        assert_eq!(
            crate::db::tbl_get(&pool, "g", "UTILS.git_lines").await,
            None
        );
        crate::db::tbl_set(&pool, "g", "UTILS.git_lines", "1")
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g", "UTILS.git_lines")
                .await
                .as_deref(),
            Some("1")
        );
        assert!(crate::commands::utils::github_lines_enabled(Some("1")));
        assert!(!crate::commands::utils::github_lines_enabled(Some("0")));
    }

    #[tokio::test]
    async fn git_lines_reads_legacy_only_row() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "UTILS.git_lines", "0")
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g", "UTILS.git_lines")
                .await
                .as_deref(),
            Some("0")
        );
    }
}

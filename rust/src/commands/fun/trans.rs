use super::*;

/// Measure a member's trans rate!
#[poise::command(slash_command, prefix_command, category = "fun", rename = "trans")]
// Mirrors !trans.ts (random 0-99, fun_trans_command_ok).
pub async fn trans(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    // No disabled-category check in `!trans.ts`: no fun_guard here.
    percent_user(
        &ctx,
        user,
        "fun_trans_command_ok",
        "The user ${user} is **${random}%** transgender 🏳️‍⚧️",
    )
    .await
}

#[cfg(test)]
mod trans_tests {
    #[test]
    fn fallback_carries_both_tokens() {
        let fb = "The user ${user} is **${random}%** transgender 🏳️‍⚧️";
        assert!(fb.contains("${user}"));
        assert!(fb.contains("${random}"));
    }
}

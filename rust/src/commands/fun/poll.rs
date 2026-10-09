use super::*;

/// Poll command (options as comma list; reactions tallied by clients).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "poll")]
pub async fn poll(
    ctx: Ctx<'_>,
    #[description = "Comma-separated options"] options: String,
) -> Result<(), anyhow::Error> {
    let opts: Vec<String> = options
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if opts.len() < 2 {
        ctx.say(
            crate::lang::get(&code, "msg_give_at_least_2_options")
                .unwrap_or_else(|| "Give at least 2 options.".to_string()),
        )
        .await?;
        return Ok(());
    }
    ctx.say(
        opts.iter()
            .enumerate()
            .map(|(i, o)| format!("{}. {o}", i + 1))
            .collect::<Vec<_>>()
            .join("\n"),
    )
    .await?;
    Ok(())
}

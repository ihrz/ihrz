use super::*;

/// 8-ball command.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "question",
    aliases("8ball")
)]
pub async fn question(
    ctx: Ctx<'_>,
    #[description = "Your question"] _q: String,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let answers = crate::lang::get_list(&code, "question_s");
    let now = now_ms_sys();
    let answer = if answers.is_empty() {
        eightball(now).to_string()
    } else {
        answers[(now as usize) % answers.len()].clone()
    };
    ctx.say(answer).await?;
    Ok(())
}

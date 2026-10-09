use super::*;

/// Help command.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "help")]
pub async fn help_here(
    ctx: Ctx<'_>,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let all: Vec<(String, Option<String>)> = crate::commands::all()
        .iter()
        .map(|c| (c.name.clone(), c.category.clone()))
        .collect();
    let total = crate::executor::total_pages(all.len(), 20);
    let page = page.unwrap_or(1).clamp(1, total.max(1) as i64) as usize;
    let body = help_page(&all, page, 20);
    ctx.say(format!("Commands (p{page}/{total}):\n{body}"))
        .await?;
    Ok(())
}

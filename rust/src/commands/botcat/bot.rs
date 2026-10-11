use crate::bot::Ctx;

// FLATTEN-B1: the 13 leaves (andru, botinfo, ether, help, invite,
// iris, kisakay, links, noaimie, ping, say, setlang, status) moved
// to top-level slash commands registered in crate::commands::all().
// Emptied parent left in place on purpose (B4 decides orphans).
/// Subcommand for bot category!
#[poise::command(slash_command, prefix_command, category = "bot", rename = "bot")]
pub async fn bot(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

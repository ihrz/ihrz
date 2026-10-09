use super::*;

/// Status embed. Mirrors bot !status.ts (CPU/memory/uptime/OS/version).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "status",
    aliases("server")
)]
pub async fn status(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let (total, free) = crate::funcs::system_memory_kb();
    let embed = serenity::CreateEmbed::default()
        .title("Status")
        .field("Cpu", cpu_model(), false)
        .field(
            "Memory",
            format!(
                "{}/{}",
                crate::funcs::nice_bytes((total - free.min(total)) as f64),
                crate::funcs::nice_bytes(total as f64)
            ),
            false,
        )
        .field("Machine Uptime", machine_uptime(), false)
        .field(
            "OS",
            format!("{} {}", std::env::consts::OS, std::env::consts::ARCH),
            false,
        )
        .field("Bot Version", env!("CARGO_PKG_VERSION"), false);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

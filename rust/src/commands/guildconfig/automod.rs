use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "automod",
    subcommands(
        "gc_automod_link",
        "gc_automod_spam",
        "gc_automod_mass",
        "gc_automod_discord",
        "gc_automod_telegram"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_automod(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

automod_toggle!(gc_automod_link, "link", "link");

automod_toggle!(gc_automod_spam, "spam", "spam");

automod_toggle!(gc_automod_mass, "mass-mention", "mass-mention");

automod_toggle!(gc_automod_discord, "discord-invite", "discord-invite");

automod_toggle!(gc_automod_telegram, "telegram-link", "telegram");

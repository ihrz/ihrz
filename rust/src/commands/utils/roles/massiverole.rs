use super::*;

/// Add/remove a role for every member. Mirrors !massiverole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "massiverole",
    aliases("massrole", "massroles"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn massiverole(
    ctx: Ctx<'_>,
    #[description = "add or remove"] action: String,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let add = !matches!(
        action.to_ascii_lowercase().as_str(),
        "remove" | "del" | "off"
    );
    let members = guild_id
        .members(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let mut n = 0;
    for m in &members {
        if let Ok(full) = guild_id.member(ctx.http(), m.user.id).await {
            let ok = if add {
                full.add_role(ctx.http(), role.id).await.is_ok()
            } else {
                full.remove_role(ctx.http(), role.id).await.is_ok()
            };
            if ok {
                n += 1;
            }
        }
    }
    ctx.say(format!("Done for {n} members.")).await?;
    Ok(())
}

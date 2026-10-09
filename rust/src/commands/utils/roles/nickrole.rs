use super::*;

/// Mass-assign a role by nickname match. Mirrors !nickrole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "nickrole",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn nickrole(
    ctx: Ctx<'_>,
    #[description = "add or remove"] action: String,
    #[description = "Nickname part"] nickname: String,
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
    let part = nickname.to_ascii_lowercase();
    let mut n = 0;
    for m in &members {
        let nick = m.nick.clone().unwrap_or_default().to_ascii_lowercase();
        let name = m.user.name.to_ascii_lowercase();
        if nick.contains(&part) || name.contains(&part) {
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
    }
    ctx.say(format!("Done for {n} members.")).await?;
    Ok(())
}

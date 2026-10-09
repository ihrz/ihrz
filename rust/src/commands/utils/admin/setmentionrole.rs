use super::*;

/// Nickname-role rule (GUILD.RANK_ROLES.nicknames).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "setmentionrole",
    aliases("setrank", "setranks", "rankset"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn setmentionrole(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Role"] role: Option<poise::serenity_prelude::Role>,
    #[description = "Nickname part"] part: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    if action.trim().eq_ignore_ascii_case("off") {
        for key in [
            "GUILD.RANK_ROLES",
            "GUILD.RANK_ROLES.roles",
            "GUILD.RANK_ROLES.nicknames",
        ] {
            let _ =
                crate::commands::owner::main::routed_del(&ctx.data().pool, &gid, &gid, key).await;
        }
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "setrankroles_command_work_disable")
                .map(|s| s.replace("${interaction.user.id}", &ctx.author().id.get().to_string()))
                .unwrap_or_else(|| {
                    "<@${interaction.user.id}>, you have deleted the rank role!".to_string()
                }),
        )
        .await?;
        return Ok(());
    }
    // TS (!setmentionrole.ts): `on` needs a role; the nickname part is
    // optional. Storage is `GUILD.RANK_ROLES.roles` (role id string) plus
    // an optional `GUILD.RANK_ROLES.nicknames` raw string (not a map).
    let Some(role) = role else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "setrankroles_not_roles_typed")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| {
                    "${client.iHorizon_Emojis.No} You have not included any roles in your command!"
                        .to_string()
                }),
        )
        .await?;
        return Ok(());
    };
    let part = part.map(|p| p.trim().to_string()).filter(|p| !p.is_empty());
    let already = crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.RANK_ROLES.roles",
    )
    .await;
    if already_configured(already.as_deref(), role.id.get()) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "setrankroles_already_this_in_db")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| {
                    "${client.iHorizon_Emojis.No} The rank roles are already in the database for this server."
                        .to_string()
                }),
        )
        .await?;
        return Ok(());
    }
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.RANK_ROLES.roles",
        &role.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if let Some(nick) = part {
        crate::commands::owner::main::routed_set(
            &ctx.data().pool,
            &gid,
            &gid,
            "GUILD.RANK_ROLES.nicknames",
            &nick,
        )
        .await?;
        let tail = crate::lang::get(&code, "setrankroles_command_work_with_nicknames_2")
            .unwrap_or_else(|| {
                "\n**Note**:\nIf the person removes the part of the nickname, the role will be automatically removed. When they put it back, I will give it back to them."
                    .to_string()
            });
        ctx.say(format!(
            "{}{}",
            fill_work_with_nicknames(
                &crate::lang::get(&code, "setrankroles_command_work_with_nicknames")
                    .unwrap_or_else(|| {
                        "Now, when you ping me `@iHorizon` I will add the following roles: <@&${argsid}> **Only if the user has** `${nicknames}` in their username or globalName"
                            .to_string()
                    }),
                role.id.get(),
                &nick,
            ),
            tail,
        ))
        .await?;
    } else {
        ctx.say(fill_work(
            &crate::lang::get(&code, "setrankroles_command_work").unwrap_or_else(|| {
                "Now, when you ping me `@iHorizon` I will add the following roles: <@&${argsid}>"
                    .to_string()
            }),
            role.id.get(),
        ))
        .await?;
    }
    Ok(())
}

/// Already-this-role guard. Mirrors `already === argsid.id` in
/// !setmentionrole.ts (stored role id string, plain compare).
pub fn already_configured(stored: Option<&str>, role_id: u64) -> bool {
    stored == Some(role_id.to_string()).as_deref()
}

/// Fill `setrankroles_command_work` (`${argsid}` is the bare id).
pub fn fill_work(template: &str, role_id: u64) -> String {
    template.replace("${argsid}", &role_id.to_string())
}

/// Fill `setrankroles_command_work_with_nicknames`
/// (`${argsid}` bare id, `${nicknames}` raw string).
pub fn fill_work_with_nicknames(template: &str, role_id: u64, nicknames: &str) -> String {
    template
        .replace("${argsid}", &role_id.to_string())
        .replace("${nicknames}", nicknames)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn already_guard_compares_plain_id() {
        assert!(already_configured(Some("7"), 7));
        assert!(!already_configured(Some("8"), 7));
        assert!(!already_configured(None, 7));
    }

    #[test]
    fn work_templates_fill() {
        assert_eq!(fill_work("roles: <@&${argsid}>", 7), "roles: <@&7>");
        assert_eq!(
            fill_work_with_nicknames("roles: <@&${argsid}> if `${nicknames}`", 7, "pro"),
            "roles: <@&7> if `pro`"
        );
    }
}

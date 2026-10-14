use super::*;

// Setmentionrole action choice. Mirrors the `action` option `choices`
// in utils.ts:449-469 (note `Power Off` first): slash shows the
// localized display names, the handler maps each variant back to the
// TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum SetmentionAction {
    #[name = "off"]
    #[name_localized("en-US", "Power Off")]
    #[name_localized("en-GB", "Power Off")]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "power_off")]
    #[name_localized("ru", "power_off")]
    #[name_localized("es-ES", "power_off")]
    Off,
    #[name = "on"]
    #[name_localized("en-US", "Power On")]
    #[name_localized("en-GB", "Power On")]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "power_on")]
    #[name_localized("ru", "power_on")]
    #[name_localized("es-ES", "power_on")]
    On,
}

impl SetmentionAction {
    /// TS `value` (`off` / `on`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Off => "off",
            Self::On => "on",
        }
    }
}

/// Nickname-role rule (GUILD.RANK_ROLES.nicknames).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "setmentionrole",
    aliases("setrank", "setranks", "rankset"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Donner un rôle spécifique à l'utilisateur qui me ping"),
    description_localized("ja", "ピンしたユーザーに特定のロールを付与！"),
    description_localized("ru", "Дать определенную роль тому, кто меня упомянет!"),
    description_localized("es-ES", "Dar un rol específico al usuario que me mencione!")
)]
pub async fn setmentionrole(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Que veux-tu faire?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    #[description = "on or off"]
    action: SetmentionAction,
    #[description_localized("fr", "Les rôles spécifiques à donner")]
    #[description_localized("ja", "付与する特定のロール！")]
    #[description_localized("ru", "Конкретные роли для выдачи!")]
    #[description_localized("es-ES", "Los roles específicos a dar!")]
    #[description = "Role"]
    #[rename = "roles"]
    role: Option<poise::serenity_prelude::Role>,
    #[description_localized(
        "fr",
        "The part of the nickname you want the person to have in their nickname"
    )]
    #[description_localized("ja", "相手のニックネームに含めたい部分")]
    #[description_localized("ru", "Часть ника, которую вы хотите видеть в нике человека")]
    #[description_localized(
        "es-ES",
        "La parte del apodo que deseas que la persona tenga en su apodo"
    )]
    #[description = "Nickname part"]
    #[rename = "part-of-nickname"]
    part: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let action = action.as_str();
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
        // TS posts the disable audit embed before answering.
        post_rankrole_log(&ctx, false, None, &code).await;
        let desc = crate::lang::get(&code, "setrankroles_command_work_disable")
            .map(|s| s.replace("${interaction.user.id}", &ctx.author().id.get().to_string()))
            .unwrap_or_else(|| {
                "<@${interaction.user.id}>, you have deleted the rank role!".to_string()
            });
        let embed = poise::serenity_prelude::CreateEmbed::default().description(desc);
        ctx.send(poise::CreateReply::default().embed(embed)).await?;
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
    // TS answers the work message as an embed description, after the
    // enable audit embed.
    post_rankrole_log(&ctx, true, Some(role.id.get()), &code).await;
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
        let desc = format!(
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
        );
        let embed = poise::serenity_prelude::CreateEmbed::default().description(desc);
        ctx.send(poise::CreateReply::default().embed(embed)).await?;
    } else {
        let desc = fill_work(
            &crate::lang::get(&code, "setrankroles_command_work").unwrap_or_else(|| {
                "Now, when you ping me `@iHorizon` I will add the following roles: <@&${argsid}>"
                    .to_string()
            }),
            role.id.get(),
        );
        let embed = poise::serenity_prelude::CreateEmbed::default().description(desc);
        ctx.send(poise::CreateReply::default().embed(embed)).await?;
    }
    Ok(())
}

/// Post the rank-role audit embed to the `ihorizon-logs` channel.
/// Mirrors `client.func.ihorizon_logs` in !setmentionrole.ts; silent
/// when the channel is absent.
async fn post_rankrole_log(ctx: &Ctx<'_>, enable: bool, role_id: Option<u64>, code: &str) {
    use poise::serenity_prelude as serenity;
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = guild_id.channels(ctx.http()).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|(id, c)| (id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let author = ctx.author().id.get().to_string();
    let (title_key, desc_key, fallback_desc) = if enable {
        (
            "setrankroles_logs_embed_title_enable",
            "setrankroles_logs_embed_description_enable",
            format!(
                "<@{}> set the rankrole to <@&{}>",
                author,
                role_id.unwrap_or_default()
            ),
        )
    } else {
        (
            "setrankroles_logs_embed_title_disable",
            "setrankroles_logs_embed_description_disable",
            format!("<@{author}> deleted the rank role!"),
        )
    };
    let title = crate::lang::get(code, title_key).unwrap_or_else(|| "Set RankRole".to_string());
    let desc = crate::lang::get(code, desc_key)
        .map(|s| {
            s.replace("${interaction.user.id}", &author)
                .replace("${argsid}", &role_id.unwrap_or_default().to_string())
        })
        .unwrap_or(fallback_desc);
    let embed = serenity::CreateEmbed::default()
        .colour(0xBF0BB9)
        .title(title)
        .description(desc);
    let _ = serenity::ChannelId::new(log_id)
        .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
        .await;
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
    fn setmention_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        // TS order: off first, then on.
        let names: Vec<_> = SetmentionAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["off".to_string(), "on".to_string()]);
        assert_eq!(SetmentionAction::Off.as_str(), "off");
        assert_eq!(SetmentionAction::On.as_str(), "on");
        assert_eq!(
            SetmentionAction::from_name("off"),
            Some(SetmentionAction::Off)
        );
        assert_eq!(
            SetmentionAction::from_name("on"),
            Some(SetmentionAction::On)
        );
        assert_eq!(SetmentionAction::from_name("bogus"), None);
        assert_eq!(SetmentionAction::from_index(0), Some(SetmentionAction::Off));
        assert_eq!(SetmentionAction::from_index(1), Some(SetmentionAction::On));
        let list = SetmentionAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Désactiver")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(SetmentionAction::On.localized_name("ja"), Some("power_on"));
    }

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

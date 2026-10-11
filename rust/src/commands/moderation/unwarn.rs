use super::*;
use poise::serenity_prelude as serenity;

/// unwarn a user
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unwarn",
    default_member_permissions = "MODERATE_MEMBERS",
    description_localized("fr", "supprimer un avertissement d'un utilisateur"),
    description_localized("ja", "ユーザーの警告を解除"),
    description_localized("ru", "снять предупреждение"),
    description_localized("es-ES", "quitar advertencia")
)]
pub async fn mod_unwarn(
    ctx: Ctx<'_>,
    #[description_localized("fr", "le membre que vous voulez enlever sont signalement")]
    #[description_localized("ja", "警告を解除したいメンバー")]
    #[description_localized("ru", "Участник для снятия предупреждения")]
    #[description_localized("es-ES", "El miembro al que quieres quitar la advertencia")]
    #[description = "Member"]
    member: serenity::User,
    #[description_localized("fr", "l'identifiant du warn")]
    #[description_localized("ja", "警告ID")]
    #[description_localized("ru", "ID предупреждения")]
    #[description_localized("es-ES", "El ID de la advertencia")]
    #[description = "Warn id"]
    #[rename = "warn-id"]
    warn_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = member.id.get();
    let warns = load_warns(&ctx.data().pool, &gid, uid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = emoji(&ctx, "No", "❌").await;
    // TS splits empty-list vs bad-id into two messages; mirror exactly.
    if warns.is_empty() {
        ctx.say(
            t("unwarn_cannot_found")
                .replace("${client.iHorizon_Emojis.No}", &no)
                .replace("${member?.toString()}", &member.to_string()),
        )
        .await?;
        return Ok(());
    }
    let (next, removed) = remove_warn(warns, &warn_id);
    if removed {
        save_warns(&ctx.data().pool, &gid, uid, &next).await?;
        let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
            .await
            .unwrap_or_else(|| "✅".to_string());
        ctx.say(
            crate::lang::get(&code, "unwarn_command_ok")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                        .replace("${member?.toString()}", &member.to_string())
                })
                .unwrap_or_else(|| "Warn removed.".to_string()),
        )
        .await?;
        if let Some(guild_id) = ctx.guild_id() {
            post_mod_log(
                ctx.http(),
                guild_id,
                t("unwarn_logEmbed_title"),
                t("unwarn_logEmbed_desc")
                    .replace(
                        "${interaction.member.toString()}",
                        &ctx.author().to_string(),
                    )
                    .replace("${member?.toString()}", &member.to_string()),
            )
            .await;
        }
    } else {
        ctx.say(
            crate::lang::get(&code, "unwarn_cannot_found_id")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.No}", &no)
                        // TS interpolates the invoker here, not the target.
                        .replace("${member?.toString()}", &ctx.author().to_string())
                })
                .unwrap_or_else(|| "Warn not found.".to_string()),
        )
        .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slash_option_names_match_ts() {
        // TS mod.ts unwarn options: member, warn-id.
        let cmd = mod_unwarn();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["member", "warn-id"]);
    }
}

use super::*;
use poise::serenity_prelude as serenity;

/// Channel where are been the verification process for new member(s)!
// Verdict (ADMINISTRATOR default, kept): mirrors the TS per-leg
// `permission: Administrator` gate (`security.ts`, channel leg).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR",
    name_localized("fr", "définir-cannal"),
    name_localized("ja", "channel"),
    name_localized("ru", "channel"),
    name_localized("es-ES", "channel"),
    description_localized(
        "fr",
        "Canal où se déroule le processus de vérification pour les nouveaux membres"
    ),
    description_localized("ja", "新規メンバーの認証プロセスが行われるチャンネル！"),
    description_localized("ru", "Канал для процесса верификации новых участников!"),
    description_localized(
        "es-ES",
        "Canal donde se realiza el proceso de verificación para nuevos miembros!"
    )
)]
pub async fn security_channel(
    ctx: Ctx<'_>,
    // TS HybridCommands/security/!channel.ts reads getChannel("id").
    #[description = "Verification channel"]
    #[channel_types("Text")]
    #[rename = "id"]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_str(&ctx).await else {
        return Ok(());
    };
    save_security_string(
        &ctx.data().pool,
        &gid,
        "SECURITY.channel",
        &channel.id.get().to_string(),
    )
    .await?;
    let lang = ctx.data().pool.clone();
    let code = crate::db::guild_lang(&lang, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "security_channel_command_work")
        .map(|s| {
            s.replace("${interaction.user}", &ctx.author().to_string())
                .replace("${channel}", &format!("<#{}>", channel.id.get()))
        })
        .unwrap_or_else(|| {
            "${interaction.user}, you have set the channel to ${channel} for the Security Module!"
                .to_string()
        });
    ctx.say(msg).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn security_channel_registers_localizations() {
        let cmd = super::security_channel();
        assert_eq!(
            cmd.name_localizations.get("fr").map(String::as_str),
            Some("définir-cannal")
        );
        assert_eq!(
            cmd.name_localizations.get("ja").map(String::as_str),
            Some("channel")
        );
        assert_eq!(
            cmd.name_localizations.get("ru").map(String::as_str),
            Some("channel")
        );
        assert_eq!(
            cmd.name_localizations.get("es-ES").map(String::as_str),
            Some("channel")
        );
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Canal où se déroule le processus de vérification pour les nouveaux membres")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("新規メンバーの認証プロセスが行われるチャンネル！")
        );
        assert_eq!(
            cmd.description_localizations.get("ru").map(String::as_str),
            Some("Канал для процесса верификации новых участников!")
        );
        assert_eq!(
            cmd.description_localizations
                .get("es-ES")
                .map(String::as_str),
            Some("Canal donde se realiza el proceso de verificación para nuevos miembros!")
        );
    }
}

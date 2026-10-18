use super::*;

use crate::commands::h247::join::prefix_channel_token_id;

/// Prefix voice-type gate. Mirrors the TS decl
/// (`voicedashboard.ts`: set-voice-channel `channel` is
/// `ChannelType.GuildVoice`, required): a first token resolving to a
/// cached non-voice channel answers the caret usage embed — the same
/// framework gate prod enforces on the sibling `+h247 join` leaf
/// (HZ93 live). Bare and unresolvable inputs keep flowing into poise's
/// required-arg parse, which renders the central usage embed.
pub fn lobby_prefix_wrong_type(
    first_token: Option<&str>,
    kind_of: &dyn Fn(u64) -> Option<bool>,
) -> Option<String> {
    let token = first_token?;
    let id = prefix_channel_token_id(token)?;
    match kind_of(id) {
        Some(false) => Some(token.to_string()),
        _ => None,
    }
}

/// Set the channel for Join4Create!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-voice-channel",
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définit le salon où le membre se connecte pour créer son propre canal"
    ),
    description_localized("ja", "Join4Createのチャンネルを設定！"),
    description_localized("ru", "Установить канал для Join4Create!"),
    description_localized("es-ES", "Establecer el canal para Join4Create!")
)]
pub async fn vd_lobby(
    ctx: Ctx<'_>,
    #[description = "The channel you want"]
    #[description_localized(
        "fr",
        "Le salon où les gens devront rejoindre pour créer leur propre salon"
    )]
    #[description_localized("ja", "希望するチャンネル")]
    #[description_localized("ru", "Желаемый канал")]
    #[description_localized("es-ES", "El canal que deseas")]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the Administrator leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::ADMINISTRATOR,
    )
    .await
    {
        return Ok(());
    }
    // Prefix voice-type head (see lobby_prefix_wrong_type): a
    // resolvable-but-non-voice channel answers the caret usage embed
    // per the TS GuildVoice decl, instead of being stored as the
    // Join4Create lobby.
    if let poise::Context::Prefix(pctx) = ctx {
        let tokens = crate::bot::prefix_args::split_caret_args(pctx.args);
        let gid_opt = ctx.guild_id();
        let wrong = lobby_prefix_wrong_type(tokens.first().map(String::as_str), &|id| {
            gid_opt
                .and_then(|gid| ctx.serenity_context().cache.guild(gid))
                .and_then(|g| {
                    g.channels
                        .get(&poise::serenity_prelude::ChannelId::new(id))
                        .map(|c| c.kind == poise::serenity_prelude::ChannelType::Voice)
                })
        });
        if let Some(tok) = wrong {
            crate::bot::prefix_usage_denial(ctx, Some(tok)).await;
            return Ok(());
        }
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel"),
        &channel.id.get().to_string(),
    )
    .await?;
    // Ack mirrors !set-voice-channel.ts (`Yes | <#id>`).
    let yes = yes_markup(ctx.http()).await;
    ctx.say(format!("{yes} | <#{}>", channel.id.get())).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wrong_type_gate_flags_text_only() {
        // kind_of: 7 = voice, 9 = text, other = unknown.
        let kind_of = |id: u64| match id {
            7 => Some(true),
            9 => Some(false),
            _ => None,
        };
        assert_eq!(lobby_prefix_wrong_type(None, &kind_of), None);
        assert_eq!(
            lobby_prefix_wrong_type(Some("<#9>"), &kind_of),
            Some("<#9>".to_string())
        );
        assert_eq!(lobby_prefix_wrong_type(Some("<#7>"), &kind_of), None);
        assert_eq!(lobby_prefix_wrong_type(Some("nope"), &kind_of), None);
        assert_eq!(lobby_prefix_wrong_type(Some("<#555>"), &kind_of), None);
    }
}

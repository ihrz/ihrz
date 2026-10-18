// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// `rolereaction` slash command (pure move from rolereaction.rs;
// zero logic change). Compat re-exports keep the historic
// `rolereactions::rolereaction::*` paths working for events_handler.rs
// and commands/mod.rs.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub use super::common::*;
pub use super::rolebutton::{handle_button_reaction, rolebutton};
pub use super::roleselect::{
    handle_roleselect_grant, handle_roleselect_main, handle_roleselect_role_pick, roleselect,
    ROLESELECT_MAIN_ID, ROLESELECT_ROLES_PREFIX, ROLESELECT_ROLE_PICK_PREFIX,
};

/// Rolereaction value choice. Mirrors the `value` option `choices` in
/// HybridCommands/rolereactions/rolereaction.ts:65-86: slash shows the
/// localized display names, the handler dispatches on the variant.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum RolereactionValue {
    #[name = "add"]
    #[name_localized("en-US", "Add another")]
    #[name_localized("en-GB", "Add another")]
    #[name_localized("fr", "Ajouter un autre")]
    #[name_localized("ja", "add_another")]
    #[name_localized("ru", "add_another")]
    #[name_localized("es-ES", "add_another")]
    Add,
    #[name = "remove"]
    #[name_localized("en-US", "Remove one")]
    #[name_localized("en-GB", "Remove one")]
    #[name_localized("fr", "Supprimer un")]
    #[name_localized("ja", "remove_one")]
    #[name_localized("ru", "remove_one")]
    #[name_localized("es-ES", "remove_one")]
    Remove,
}

impl RolereactionValue {
    /// TS `value` (`add` / `remove`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Add => "add",
            Self::Remove => "remove",
        }
    }
}

/// Set a roles when user react to a message with specific emoji
#[poise::command(
    slash_command,
    prefix_command,
    category = "rolereactions",
    rename = "rolereaction",
    aliases("rolereact"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définir des rôles lorsque l'utilisateur réagit à un message avec des emoji spécifiques"
    ),
    description_localized("ja", "特定の絵文字でメッセージにリアクションした時にロールを設定"),
    description_localized("ru", "Установить роли при реакции на сообщение с эмодзи"),
    description_localized(
        "es-ES",
        "Establecer roles cuando el usuario reacciona a un mensaje con emoji específico"
    )
)]
pub async fn rolereaction(
    ctx: Ctx<'_>,
    #[description = "Please make your choice."]
    #[description_localized("fr", "Merci de faire votre choix")]
    #[description_localized("ja", "選択してください。")]
    #[description_localized("ru", "Пожалуйста, сделайте выбор.")]
    #[description_localized("es-ES", "Por favor, haz tu elección.")]
    value: RolereactionValue,
    #[description = "The channel where is the message"]
    #[description_localized("fr", "Le salon textuelle où se trouve le message")]
    #[description_localized("ja", "メッセージがあるチャンネル")]
    #[description_localized("ru", "Канал, где находится сообщение")]
    #[description_localized("es-ES", "El canal donde está el mensaje")]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "Please copy the identifiant of the message you want to configure"]
    #[description_localized(
        "fr",
        "Veuillez copier l'identifiant du message que vous souhaitez configurer"
    )]
    #[description_localized("ja", "設定したいメッセージの識別子をコピーしてください")]
    #[description_localized(
        "ru",
        "Пожалуйста, скопируйте идентификатор сообщения, которое вы хотите настроить"
    )]
    #[description_localized(
        "es-ES",
        "Por favor, copia el identificador del mensaje que quieres configurar"
    )]
    message_id: String,
    #[description = "The emojis you want"]
    #[description_localized("fr", "Les emojis que tu veux")]
    #[description_localized("ja", "使用したい絵文字")]
    #[description_localized("ru", "Эмодзи, которые вы хотите")]
    #[description_localized("es-ES", "Los emojis que deseas")]
    reaction: Option<String>,
    #[description = "The role you want to configure"]
    #[description_localized("fr", "Le rôle que vous souhaitez configurer")]
    #[description_localized("ja", "設定したいロール")]
    #[description_localized("ru", "Роль, которую вы хотите настроить")]
    #[description_localized("es-ES", "El rol que quieres configurar")]
    role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    match value {
        RolereactionValue::Add => {
            rolereaction_add(&ctx, guild_id, &channel, &message_id, reaction, role).await?;
        }
        RolereactionValue::Remove => {
            rolereaction_remove(&ctx, guild_id, &channel, &message_id, reaction).await?;
        }
    }
    Ok(())
}

/// Add leg of rolereaction. Mirrors the `type == "add"` branch in
/// HybridCommands/rolereactions/rolereaction.ts.
async fn rolereaction_add(
    ctx: &Ctx<'_>,
    guild_id: serenity::GuildId,
    channel: &serenity::GuildChannel,
    message_id: &str,
    reaction: Option<String>,
    role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let gid = guild_id.get().to_string();
    let Some(role) = role else {
        // Missing role: the blue help embed, like TS.
        ctx.send(poise::CreateReply::default().embed(
                serenity::CreateEmbed::default()
                    .colour(serenity::Colour::new(0x0000ff))
                    .title("/reactionroles Help !")
                    .description(
                        crate::commands::lang_for(
                            ctx,
                            "reactionroles_embed_message_description_added",
                            "__How to use?__\n/rolesreaction add `<message id>` `<reaction>` `<rolesid>`\n/rolesreaction remove `<message id>` `<reaction>`\n/rolesreaction list `<message id>`",
                        )
                        .await,
                    ),
            ),
        )
        .await?;
        return Ok(());
    };
    let reaction_raw = reaction.unwrap_or_default();
    if reaction_raw.trim().is_empty() {
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "reactionroles_missing_reaction_added",
                "Missing argument: Reaction's Emoji",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let reaction = normalize_button_reaction(&reaction_raw);
    let dont_found = crate::commands::lang_for(
        ctx,
        "reactionroles_dont_message_found",
        "I can't retrieve the message with your current message ID, or the emoji you selected is not on a server where I am!",
    )
    .await;
    let Ok(mid) = message_id.trim().parse::<u64>() else {
        ctx.say(dont_found).await?;
        return Ok(());
    };
    let Ok(msg) = channel
        .id
        .message(ctx.http(), serenity::MessageId::new(mid))
        .await
    else {
        ctx.say(dont_found).await?;
        return Ok(());
    };
    // Seed the reaction first; a failure reports dont_message_found.
    if msg
        .react(ctx.http(), reaction_type_for(&reaction))
        .await
        .is_err()
    {
        ctx.say(dont_found).await?;
        return Ok(());
    }
    if !is_valid_button_reaction(&reaction) {
        let http = ctx.serenity_context().http.clone();
        let no = crate::emojis::app_emoji_markup(&http, "No")
            .await
            .unwrap_or_default();
        ctx.say(crate::commands::lang_for(
                ctx,
                "reactionroles_invalid_emote_format_added",
                "${client.iHorizon_Emojis.No} | You can't send me a `CUSTOM_EMOJI` in format `<::xxx>`! I only need its ID!",
            )
            .await
            .replace("${client.iHorizon_Emojis.No}", &no),
        )
        .await?;
        return Ok(());
    }
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &reaction_row_key(mid, &reaction),
        &serde_json::json!({
            "rolesID": role.id.get().to_string(),
            "reactionNAME": reaction,
            "enable": true,
        })
        .to_string(),
    )
    .await?;
    let http = ctx.serenity_context().http.clone();
    let uid = ctx.author().id.get().to_string();
    post_ihorizon_log(
        &http,
        guild_id,
        &crate::commands::lang_for(
            ctx,
            "reactionroles_logs_embed_title_added",
            "ReactionRoles Logs",
        )
        .await,
        &crate::commands::lang_for(
            ctx,
            "reactionroles_logs_embed_description_added",
            "<@${interaction.user.id}> set a reaction role: Message: `${messagei}` | Reaction: `${reaction}` | Role: ${role}",
        )
        .await
        .replace("${interaction.user.id}", &uid)
        .replace("${messagei}", &mid.to_string())
        .replace("${reaction}", &reaction)
        .replace("${role}", &format!("<@&{}>", role.id.get())),
    )
    .await;
    ctx.send(
        poise::CreateReply::default()
            .content(
                crate::commands::lang_for(
                    ctx,
                    "reactionroles_command_work_added",
                    "${reaction} has been added to message ${messagei} to give ${role}",
                )
                .await
                .replace("${messagei}", &mid.to_string())
                .replace("${reaction}", &reaction)
                .replace("${role}", &format!("<@&{}>", role.id.get())),
            )
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

/// Remove leg of rolereaction. Mirrors the `type == "remove"` branch in
/// HybridCommands/rolereactions/rolereaction.ts.
async fn rolereaction_remove(
    ctx: &Ctx<'_>,
    guild_id: serenity::GuildId,
    channel: &serenity::GuildChannel,
    message_id: &str,
    reaction: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = guild_id.get().to_string();
    let reaction_raw = reaction.unwrap_or_default();
    if reaction_raw.trim().is_empty() {
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "reactionroles_missing_remove",
                "Missing argument: Reaction's Emoji",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let reaction = normalize_button_reaction(&reaction_raw);
    let cant_fetch = crate::commands::lang_for(
        ctx,
        "reactionroles_cant_fetched_reaction_remove",
        "Can't fetch targeted reaction on this message!",
    )
    .await;
    let Ok(mid) = message_id.trim().parse::<u64>() else {
        ctx.say(cant_fetch.clone()).await?;
        return Ok(());
    };
    let Ok(msg) = channel
        .id
        .message(ctx.http(), serenity::MessageId::new(mid))
        .await
    else {
        ctx.say(cant_fetch).await?;
        return Ok(());
    };
    let key = reaction_row_key(mid, &reaction);
    let row: Option<ButtonRoleRow> =
        crate::commands::owner::main::routed_get(&ctx.data().pool, &gid, &gid, &key)
            .await
            .and_then(|s| serde_json::from_str(&s).ok());
    let Some(fetched) = row else {
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "reactionroles_missing_reaction_remove",
                "Reaction Roles were not found in my database...",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    // The bot's own seeded reaction must still be present (TS
    // reactions.cache.get(reactionNAME), then users.remove(bot)).
    let present = msg.reactions.iter().any(|r| match &r.reaction_type {
        serenity::ReactionType::Unicode(u) => *u == fetched.reaction_name,
        serenity::ReactionType::Custom { id, .. } => id.get().to_string() == fetched.reaction_name,
        _ => false,
    });
    if !present {
        ctx.say(cant_fetch).await?;
        return Ok(());
    }
    let http = ctx.serenity_context().http.clone();
    // TS logs remove failures and still deletes the row.
    if http
        .delete_reaction_me(
            channel.id,
            msg.id,
            &reaction_type_for(&fetched.reaction_name),
        )
        .await
        .is_err()
    {
        tracing::warn!("rolereactions: failed to remove own reaction");
    }
    let _ = crate::commands::owner::main::routed_del(&ctx.data().pool, &gid, &gid, &key).await;
    let uid = ctx.author().id.get().to_string();
    post_ihorizon_log(
        &http,
        guild_id,
        &crate::commands::lang_for(
            ctx,
            "reactionroles_logs_embed_title_remove",
            "ReactionRoles Logs",
        )
        .await,
        &crate::commands::lang_for(
            ctx,
            "reactionroles_logs_embed_description_remove",
            "<@${interaction.user.id}> deleted a reaction role: Message: `${messagei}` | Reaction: `${reaction}`",
        )
        .await
        .replace("${interaction.user.id}", &uid)
        .replace("${messagei}", &mid.to_string())
        .replace("${reaction}", &reaction),
    )
    .await;
    ctx.send(
        poise::CreateReply::default()
            .content(
                crate::commands::lang_for(
                    ctx,
                    "reactionroles_command_work_remove",
                    "${reaction} has been deleted from message ${messagei}",
                )
                .await
                .replace("${reaction}", &reaction)
                .replace("${messagei}", &mid.to_string()),
            )
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rolereaction_value_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = RolereactionValue::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["add".to_string(), "remove".to_string()]);
        assert_eq!(RolereactionValue::Add.as_str(), "add");
        assert_eq!(RolereactionValue::Remove.as_str(), "remove");
        assert_eq!(
            RolereactionValue::from_name("add"),
            Some(RolereactionValue::Add)
        );
        assert_eq!(
            RolereactionValue::from_name("remove"),
            Some(RolereactionValue::Remove)
        );
        assert_eq!(RolereactionValue::from_name("bogus"), None);
        let list = RolereactionValue::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Ajouter un autre")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Supprimer un")
        );
        assert_eq!(
            list[0].localizations.get("ja").map(String::as_str),
            Some("add_another")
        );
        assert_eq!(
            RolereactionValue::Remove.localized_name("es-ES"),
            Some("remove_one")
        );
    }

    #[test]
    fn rolereaction_registers_description_localizations() {
        let cmd = super::rolereaction();
        assert_eq!(cmd.description_localizations.get("fr").map(String::as_str), Some("Définir des rôles lorsque l'utilisateur réagit à un message avec des emoji spécifiques"));
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("特定の絵文字でメッセージにリアクションした時にロールを設定")
        );
        assert_eq!(
            cmd.description_localizations.get("ru").map(String::as_str),
            Some("Установить роли при реакции на сообщение с эмодзи")
        );
        assert_eq!(
            cmd.description_localizations
                .get("es-ES")
                .map(String::as_str),
            Some("Establecer roles cuando el usuario reacciona a un mensaje con emoji específico")
        );
    }
}

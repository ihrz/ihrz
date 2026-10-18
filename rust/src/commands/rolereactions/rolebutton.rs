// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// `rolebutton` slash command + button-press handler
// (pure move from rolereaction.rs; zero logic change).

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

use super::common::*;

/// Rolebutton value choice. Mirrors the `value` option `choices` in
/// rolebutton.ts:66-89: slash shows the localized display names, the
/// handler dispatches on the variant (same add/remove arms as the old
/// lowercased match).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum RolebuttonValue {
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

impl RolebuttonValue {
    /// TS `value` (`add` / `remove`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Add => "add",
            Self::Remove => "remove",
        }
    }
}

/// Set a roles when user react to a button with specific emoji
#[poise::command(
    slash_command,
    prefix_command,
    category = "rolereactions",
    rename = "rolebutton",
    aliases("btnreact"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définir des rôles lorsque l'utilisateur réagit à un message avec un boutton spécifique"
    ),
    description_localized("ja", "特定の絵文字でボタンにリアクションした時にロールを設定"),
    description_localized("ru", "Установить роли при реакции на кнопку с эмодзи"),
    description_localized(
        "es-ES",
        "Establecer roles cuando el usuario reacciona a un botón con emoji específico"
    )
)]
pub async fn rolebutton(
    ctx: Ctx<'_>,
    #[description = "Please make your choice."]
    #[description_localized("fr", "Merci de faire votre choix")]
    #[description_localized("ja", "選択してください。")]
    #[description_localized("ru", "Пожалуйста, сделайте выбор.")]
    #[description_localized("es-ES", "Por favor, haz tu elección.")]
    value: RolebuttonValue,
    #[description = "The channel where is the message"]
    #[description_localized("fr", "Le salon textuelle où se trouve le message")]
    #[description_localized("ja", "メッセージがあるチャンネル")]
    #[description_localized("ru", "Канал, где находится сообщение")]
    #[description_localized("es-ES", "El canal donde está el mensaje")]
    #[channel_types("Text")]
    #[rename = "channel"]
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
    // Helpers take the wire id string (their invalid-id legs stay for
    // the manual-parse path); the Channel-typed option guarantees a
    // resolvable text channel on both legs.
    let channel_id = channel.id.get().to_string();
    match value {
        RolebuttonValue::Add => {
            rolebutton_add(&ctx, guild_id, &channel_id, &message_id, reaction, role).await?;
        }
        RolebuttonValue::Remove => {
            rolebutton_remove(&ctx, guild_id, &channel_id, &message_id, reaction).await?;
        }
    }
    Ok(())
}

async fn rolebutton_add(
    ctx: &Ctx<'_>,
    guild_id: serenity::GuildId,
    channel_id: &str,
    message_id: &str,
    reaction: Option<String>,
    role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(role) = role else {
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "buttonreaction_roles_not_found",
                "Missing arguments: You haven't specified the roles to set!",
            )
            .await,
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
    let cant_fetch = crate::commands::lang_for(
        ctx,
        "reactionroles_cant_fetched_reaction_remove",
        "Can't fetch targeted reaction on this message!",
    )
    .await;
    let (Ok(ch), Ok(mid)) = (
        channel_id.trim().parse::<u64>(),
        message_id.trim().parse::<u64>(),
    ) else {
        ctx.say(cant_fetch).await?;
        return Ok(());
    };
    let channel = serenity::ChannelId::new(ch);
    let Ok(msg) = channel
        .message(ctx.http(), serenity::MessageId::new(mid))
        .await
    else {
        ctx.say(cant_fetch).await?;
        return Ok(());
    };
    let bot_id = ctx.serenity_context().cache.current_user().id;
    if msg.author.id != bot_id {
        ctx.say(crate::commands::lang_for(
                ctx,
                "buttonreaction_message_other_user_error",
                "I can't modify the components of another user's message. You need to choose a message sent by myself. Tip: Do `/utils embed` to create your own beautiful embed!",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    // Raw component JSON edit, like msg.edit({components}).
    let mut rows = serde_json::to_value(&msg.components)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default();
    // TS setEmoji passthrough: the normalized reaction as the emoji
    // name (bare custom ids render as text there too).
    let emoji_json = serde_json::json!({"name": reaction});
    let http = ctx.serenity_context().http.clone();
    let edited = append_button_row(&mut rows, &button_reaction_id(role.id.get()), emoji_json)
        .is_ok()
        && http
            .edit_message(
                channel,
                msg.id,
                &serde_json::json!({"components": rows}),
                vec![],
            )
            .await
            .is_ok();
    if !edited {
        ctx.say(crate::commands::lang_for(
                ctx,
                "buttonreaction_dont_message_found",
                "Can't add this button, the roles seem to be already set in one of the existing buttons!",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    if !is_valid_button_reaction(&reaction) {
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
    let gid = guild_id.get().to_string();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &button_role_key(mid, &role.id.get().to_string()),
        &serde_json::json!({
            "rolesID": role.id.get().to_string(),
            "reactionNAME": reaction,
            "enable": true,
        })
        .to_string(),
    )
    .await?;
    let uid = ctx.author().id.get().to_string();
    post_ihorizon_log(
        &http,
        guild_id,
        &crate::commands::lang_for(
            ctx,
            "buttonreaction_logs_embed_title_added",
            "ButtonReaction Logs",
        )
        .await,
        &crate::commands::lang_for(
            ctx,
            "buttonreaction_logs_embed_description_added",
            "<@${interaction.user.id}> set a reaction with button: Message: `${messagei}` | Reaction: `${reaction}` | Role: ${role}",
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

async fn rolebutton_remove(
    ctx: &Ctx<'_>,
    guild_id: serenity::GuildId,
    channel_id: &str,
    message_id: &str,
    reaction: Option<String>,
) -> Result<(), anyhow::Error> {
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
    let (Ok(ch), Ok(mid)) = (
        channel_id.trim().parse::<u64>(),
        message_id.trim().parse::<u64>(),
    ) else {
        ctx.say(cant_fetch.clone()).await?;
        return Ok(());
    };
    let channel = serenity::ChannelId::new(ch);
    let Ok(msg) = channel
        .message(ctx.http(), serenity::MessageId::new(mid))
        .await
    else {
        ctx.say(cant_fetch).await?;
        return Ok(());
    };
    if msg.author.id != ctx.serenity_context().cache.current_user().id {
        ctx.say(crate::commands::lang_for(
                ctx,
                "buttonreaction_message_other_user_error",
                "I can't modify the components of another user's message. You need to choose a message sent by myself. Tip: Do `/utils embed` to create your own beautiful embed!",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let gid = guild_id.get().to_string();
    let rows = load_button_rows(&ctx.data().pool, &gid, mid).await;
    let Some((key, _)) = rows.iter().find(|(_, r)| r.reaction_name == reaction) else {
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
    // buttonUnreact only edits when a button actually drops (TS
    // returns the message untouched otherwise and still proceeds).
    let mut comps = serde_json::to_value(&msg.components)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default();
    if remove_button_by_emoji(&mut comps, &reaction) {
        let http = ctx.serenity_context().http.clone();
        let Ok(_) = http
            .edit_message(
                channel,
                msg.id,
                &serde_json::json!({"components": comps}),
                vec![],
            )
            .await
        else {
            ctx.say(cant_fetch).await?;
            return Ok(());
        };
    }
    let _ = crate::commands::owner::main::routed_del(&ctx.data().pool, &gid, &gid, key).await;
    let uid = ctx.author().id.get().to_string();
    let http = ctx.serenity_context().http.clone();
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

/// Button press on a role button. Mirrors
/// Interaction/Components/Buttons/button_reaction.ts
/// (`button_reaction%<role>`): row lookup, role fetch, bot
/// hierarchy check, add/remove toggle.
pub async fn handle_button_reaction(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    role_id: u64,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let mid = comp.message.id.get();
    let ephemeral = |content: String| {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
    };
    let row: Option<ButtonRoleRow> = crate::commands::owner::main::routed_get(
        pool,
        &gid,
        &gid,
        &button_role_key(mid, &role_id.to_string()),
    )
    .await
    .and_then(|s| serde_json::from_str(&s).ok());
    let Some(_) = row else { return Ok(()) };
    let roles = guild_id.roles(&ctx.http).await.unwrap_or_default();
    let Some(target) = roles.get(&serenity::RoleId::new(role_id)) else {
        ephemeral(t("buttonreaction_role_doesnt_exit")).await?;
        return Ok(());
    };
    let bot_id = ctx.cache.current_user().id;
    let bot_top = guild_id
        .member(&ctx.http, bot_id)
        .await
        .ok()
        .map(|m| {
            m.roles
                .iter()
                .filter_map(|r| roles.get(r))
                .map(|r| r.position)
                .max()
                .unwrap_or(0)
        })
        .unwrap_or(0);
    if target.position >= bot_top {
        ephemeral(t("buttonreaction_role_too_high")).await?;
        return Ok(());
    }
    // Delta: serenity 0.12 add/remove_role takes no audit reason, so
    // the TS "[ButtonReaction] Module" reason is dropped.
    let mention = format!("<@&{}>", role_id);
    let member = guild_id.member(&ctx.http, comp.user.id).await?;
    if member.roles.contains(&target.id) {
        member.remove_role(&ctx.http, target.id).await?;
        ephemeral(t("buttonreaction_role_remove").replace("${fetched_role.toString()}", &mention))
            .await?;
    } else {
        member.add_role(&ctx.http, target.id).await?;
        ephemeral(t("buttonreaction_role_add").replace("${fetched_role.toString()}", &mention))
            .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rolebutton_value_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = RolebuttonValue::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["add".to_string(), "remove".to_string()]);
        assert_eq!(RolebuttonValue::Add.as_str(), "add");
        assert_eq!(RolebuttonValue::Remove.as_str(), "remove");
        assert_eq!(
            RolebuttonValue::from_name("add"),
            Some(RolebuttonValue::Add)
        );
        assert_eq!(
            RolebuttonValue::from_name("remove"),
            Some(RolebuttonValue::Remove)
        );
        assert_eq!(RolebuttonValue::from_name("bogus"), None);
        assert_eq!(RolebuttonValue::from_index(0), Some(RolebuttonValue::Add));
        assert_eq!(
            RolebuttonValue::from_index(1),
            Some(RolebuttonValue::Remove)
        );
        let list = RolebuttonValue::list();
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
            RolebuttonValue::Remove.localized_name("es-ES"),
            Some("remove_one")
        );
    }
}

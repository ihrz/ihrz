use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// Role id from a reaction-role row: TS `{rolesID}` object, falling
/// back to legacy bare-id rows written by the old stub.
pub fn parse_reaction_role(raw: &str) -> Option<u64> {
    serde_json::from_str::<ButtonRoleRow>(raw)
        .ok()
        .and_then(|r| r.roles_id.parse::<u64>().ok())
        .or_else(|| raw.trim().parse::<u64>().ok())
}

/// ReactionType for a stored reactionNAME (bare custom id or
/// unicode). Bare ids react as custom emoji without a name, like
/// the TS msg.react(normalized) call.
pub fn reaction_type_for(stored: &str) -> serenity::ReactionType {
    if !stored.is_empty() && stored.chars().all(|c| c.is_ascii_digit()) {
        if let Ok(id) = stored.parse::<u64>() {
            return serenity::ReactionType::Custom {
                animated: false,
                id: serenity::EmojiId::new(id),
                name: None,
            };
        }
    }
    serenity::ReactionType::Unicode(stored.to_string())
}

/// Lookup keys for a reaction press: emoji name then emoji id, like
/// the two legs in onReactAdd.ts (name, then nitro id).
pub fn reaction_role_keys(emoji: &serenity::ReactionType) -> Vec<String> {
    match emoji {
        serenity::ReactionType::Unicode(u) => vec![u.clone()],
        serenity::ReactionType::Custom { id, name, .. } => {
            let mut keys = vec![];
            if let Some(n) = name {
                keys.push(n.clone());
            }
            keys.push(id.get().to_string());
            keys
        }
        _ => vec![],
    }
}

fn reaction_row_key(message_id: u64, emoji_key: &str) -> String {
    format!("GUILD.REACTION_ROLES.{message_id}.{emoji_key}")
}

/// Role id for a reaction press (name key, then nitro id key).
/// Mirrors the two-leg lookup in onReactAdd.ts.
pub async fn lookup_reaction_role(
    pool: &crate::db::Pool,
    gid: &str,
    mid: u64,
    emoji: &serenity::ReactionType,
) -> Option<serenity::RoleId> {
    for key in reaction_role_keys(emoji) {
        let raw = crate::db::kv_get(pool, gid, &reaction_row_key(mid, &key)).await;
        if let Some(id) = raw.as_deref().and_then(parse_reaction_role) {
            return Some(serenity::RoleId::new(id));
        }
    }
    None
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "rolereactions",
    rename = "rolereaction",
    aliases("rolereact"),
    subcommands("rr_add", "rr_remove"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rolereaction(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rr_add(
    ctx: Ctx<'_>,
    #[description = "Channel id"] channel_id: String,
    #[description = "Message id"] message_id: String,
    #[description = "Emoji or emoji id"] reaction: Option<String>,
    #[description = "Role"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let Some(role) = role else {
        // Missing role: the blue help embed, like TS.
        ctx.send(
            poise::CreateReply::default().embed(
                serenity::CreateEmbed::default()
                    .colour(serenity::Colour::new(0x0000ff))
                    .title("/reactionroles Help !")
                    .description(
                        crate::commands::lang_for(
                            &ctx,
                            "reactionroles_embed_message_description_added",
                            "How to use?",
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
                &ctx,
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
        &ctx,
        "reactionroles_dont_message_found",
        "I can't retrieve the message!",
    )
    .await;
    let (Ok(ch), Ok(mid)) = (
        channel_id.trim().parse::<u64>(),
        message_id.trim().parse::<u64>(),
    ) else {
        ctx.say(dont_found).await?;
        return Ok(());
    };
    let channel = serenity::ChannelId::new(ch);
    let Ok(msg) = channel
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
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "reactionroles_invalid_emote_format_added",
                "You can't send me a CUSTOM_EMOJI in format!",
            )
            .await
            .replace("${client.iHorizon_Emojis.No}", &no),
        )
        .await?;
        return Ok(());
    }
    crate::db::kv_set(
        &ctx.data().pool,
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
            &ctx,
            "reactionroles_logs_embed_title_added",
            "ReactionRoles Logs",
        )
        .await,
        &crate::commands::lang_for(
            &ctx,
            "reactionroles_logs_embed_description_added",
            "<@${interaction.user.id}> set a reaction role",
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
                    &ctx,
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

#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rr_remove(
    ctx: Ctx<'_>,
    #[description = "Channel id"] channel_id: String,
    #[description = "Message id"] message_id: String,
    #[description = "Emoji or emoji id"] reaction: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let reaction_raw = reaction.unwrap_or_default();
    if reaction_raw.trim().is_empty() {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
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
        &ctx,
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
    let key = reaction_row_key(mid, &reaction);
    let row: Option<ButtonRoleRow> = crate::db::kv_get(&ctx.data().pool, &gid, &key)
        .await
        .and_then(|s| serde_json::from_str(&s).ok());
    let Some(fetched) = row else {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
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
        .delete_reaction_me(channel, msg.id, &reaction_type_for(&fetched.reaction_name))
        .await
        .is_err()
    {
        tracing::warn!("rolereactions: failed to remove own reaction");
    }
    let _ = crate::db::kv_del(&ctx.data().pool, &gid, &key).await;
    let uid = ctx.author().id.get().to_string();
    post_ihorizon_log(
        &http,
        guild_id,
        &crate::commands::lang_for(
            &ctx,
            "reactionroles_logs_embed_title_remove",
            "ReactionRoles Logs",
        )
        .await,
        &crate::commands::lang_for(
            &ctx,
            "reactionroles_logs_embed_description_remove",
            "removed",
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
                    &ctx,
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

/// Stored button row. Mirrors `{rolesID, reactionNAME, enable}` at
/// `GUILD.REACTION_ROLES.<msg>.button_reaction%<role>`.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct ButtonRoleRow {
    #[serde(rename = "rolesID", default)]
    pub roles_id: String,
    #[serde(rename = "reactionNAME", default)]
    pub reaction_name: String,
    #[serde(default)]
    pub enable: bool,
}

/// Verbatim press id. Mirrors ``button_reaction%${role?.id}``.
pub const BUTTON_REACTION_PREFIX: &str = "button_reaction%";

pub fn button_reaction_id(role_id: u64) -> String {
    format!("{BUTTON_REACTION_PREFIX}{role_id}")
}

pub fn button_role_key(message_id: u64, role_id: &str) -> String {
    format!("GUILD.REACTION_ROLES.{message_id}.{BUTTON_REACTION_PREFIX}{role_id}")
}

/// Custom `<:name:id>` / `<a:name:id>` -> id, else the raw reaction.
/// Mirrors the regex in rolebutton.ts.
pub fn normalize_button_reaction(raw: &str) -> String {
    let s = raw.trim();
    if s.starts_with('<') && s.ends_with('>') {
        if let Some(pos) = s.rfind(':') {
            let id: String = s[pos + 1..s.len() - 1]
                .chars()
                .take_while(|c| c.is_ascii_digit())
                .collect();
            if !id.is_empty() {
                return id;
            }
        }
    }
    s.to_string()
}

/// TS rejects anything still shaped like a custom emoji after
/// normalization (contains `<`, `>` or `:`).
pub fn is_valid_button_reaction(reaction: &str) -> bool {
    !(reaction.contains('<') || reaction.contains('>') || reaction.contains(':'))
}

/// buttonReact: append a Secondary button to the first row with <5
/// components that already holds a button, else push a new row.
/// Err past 5 rows (TS throws "Too much components on this
/// message!").
pub fn append_button_row(
    rows: &mut Vec<serde_json::Value>,
    custom_id: &str,
    emoji: serde_json::Value,
) -> Result<(), &'static str> {
    if rows.len() >= 5 {
        return Err("Too much components on this message!");
    }
    let button = serde_json::json!({"type": 2, "style": 2, "custom_id": custom_id, "emoji": emoji});
    for row in rows.iter_mut() {
        let comps = row.get_mut("components").and_then(|c| c.as_array_mut());
        let Some(comps) = comps else { continue };
        if comps.len() < 5
            && comps
                .iter()
                .any(|c| c.get("type").and_then(|x| x.as_u64()) == Some(2))
        {
            comps.push(button);
            return Ok(());
        }
    }
    rows.push(serde_json::json!({"type": 1, "components": [button]}));
    Ok(())
}

/// buttonUnreact: drop buttons whose `emoji.id` equals the reaction
/// (TS compares `component.emoji?.id === buttonEmoji`, so unicode
/// name-emojis never match there either); drop emptied rows.
pub fn remove_button_by_emoji(rows: &mut Vec<serde_json::Value>, reaction: &str) -> bool {
    let mut removed = false;
    rows.retain_mut(|row| {
        if let Some(comps) = row.get_mut("components").and_then(|c| c.as_array_mut()) {
            comps.retain(|c| {
                let hit = c.get("type").and_then(|x| x.as_u64()) == Some(2)
                    && c.get("emoji")
                        .and_then(|e| e.get("id"))
                        .and_then(|x| x.as_str())
                        == Some(reaction);
                if hit {
                    removed = true;
                }
                !hit
            });
            !comps.is_empty()
        } else {
            true
        }
    });
    removed
}

/// All button rows for a message (the TS nested-object read over
/// `GUILD.REACTION_ROLES.<msg>`).
pub async fn load_button_rows(
    pool: &crate::db::Pool,
    gid: &str,
    mid: u64,
) -> Vec<(String, ButtonRoleRow)> {
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE ?",
    )
    .bind(gid)
    .bind(format!("GUILD.REACTION_ROLES.{mid}.%"))
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    rows.into_iter()
        .filter_map(|(k, v)| {
            serde_json::from_str::<ButtonRoleRow>(&v)
                .ok()
                .map(|r| (k, r))
        })
        .collect()
}

/// #bf0bb9 log embed to the name-contains `ihorizon-logs` channel.
/// Mirrors ihorizon_logs.ts (best-effort, silent when missing).
pub async fn post_ihorizon_log(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    title: &str,
    description: &str,
) {
    let Ok(channels) = http.get_channels(guild_id).await else {
        return;
    };
    let Some(ch) = channels.iter().find(|c| c.name.contains("ihorizon-logs")) else {
        return;
    };
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(0xbf0bb9))
        .title(title.to_string())
        .description(description.to_string());
    let _ = ch
        .id
        .send_message(http, serenity::CreateMessage::new().embed(embed))
        .await;
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "rolereactions",
    rename = "rolebutton",
    aliases("btnreact"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rolebutton(
    ctx: Ctx<'_>,
    #[description = "add or remove"] value: String,
    #[description = "Channel id"] channel_id: String,
    #[description = "Message id"] message_id: String,
    #[description = "Emoji or emoji id"] reaction: Option<String>,
    #[description = "Role"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    match value.trim().to_ascii_lowercase().as_str() {
        "add" => {
            rolebutton_add(&ctx, guild_id, &channel_id, &message_id, reaction, role).await?;
        }
        "remove" => {
            rolebutton_remove(&ctx, guild_id, &channel_id, &message_id, reaction).await?;
        }
        _ => {}
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
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "buttonreaction_message_other_user_error",
                "I can't modify the components of another user's message.",
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
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "buttonreaction_dont_message_found",
                "Can't add this button, the roles seem to be already set!",
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
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "reactionroles_invalid_emote_format_added",
                "You can't send me a CUSTOM_EMOJI in format!",
            )
            .await
            .replace("${client.iHorizon_Emojis.No}", &no),
        )
        .await?;
        return Ok(());
    }
    let gid = guild_id.get().to_string();
    crate::db::kv_set(
        &ctx.data().pool,
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
            "<@${interaction.user.id}> set a reaction with button",
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
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "buttonreaction_message_other_user_error",
                "I can't modify the components of another user's message.",
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
    let _ = crate::db::kv_del(&ctx.data().pool, &gid, key).await;
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
            "removed",
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
    let row: Option<ButtonRoleRow> =
        crate::db::kv_get(pool, &gid, &button_role_key(mid, &role_id.to_string()))
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

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RoleSelectEntry {
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub role_id: String,
    #[serde(default)]
    pub emoji: String,
    #[serde(default)]
    pub desc: String,
}

/// In-progress builder state (the 50-min TS collector becomes a
/// kv draft until save/cancel).
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct RoleSelectDraft {
    #[serde(default)]
    pub target_channel: String,
    #[serde(default)]
    pub target_msg: String,
    #[serde(default)]
    pub data: Vec<RoleSelectEntry>,
    #[serde(default)]
    pub placeholder: String,
    #[serde(default)]
    pub invoker: String,
    #[serde(default)]
    pub pending: Option<RoleSelectPending>,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct RoleSelectPending {
    #[serde(default)]
    pub emoji: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub desc: String,
}

/// Builder main-menu id + saved-select prefix. Mirrors
/// `roleselect_main_menu` and ``roleselect_roles%${messageId}``.
pub const ROLESELECT_MAIN_ID: &str = "roleselect_main_menu";
pub const ROLESELECT_ROLES_PREFIX: &str = "roleselect_roles%";
pub const ROLESELECT_ADD_MODAL: &str = "roleselect_add_fields";
pub const ROLESELECT_PLACEHOLDER_MODAL: &str = "roleselect_placeholder";
pub const ROLESELECT_ROLE_PICK_PREFIX: &str = "roleselect_role_pick:";

pub fn roleselect_key(message_id: u64) -> String {
    format!("GUILD.ROLE_SELECT.{message_id}")
}

pub fn roleselect_draft_key(config_message_id: u64) -> String {
    format!("GUILD.ROLE_SELECT_DRAFT.{config_message_id}")
}

pub fn roleselect_preview_id(message_id: u64) -> String {
    format!("{ROLESELECT_ROLES_PREFIX}{message_id}")
}

/// Main-menu select (add/remove/placeholder/save/cancel). Labels
/// come from YAML at the call site.
pub fn build_main_menu(labels: [&str; 5], placeholder: &str) -> serenity::CreateSelectMenu {
    let values = ["add", "remove", "placeholder", "save", "cancel"];
    let emojis = ["🔹", "🔸", "🏷️", "💾", "🚫"];
    let options = labels
        .iter()
        .zip(values)
        .zip(emojis)
        .map(|((label, value), emoji)| {
            serenity::CreateSelectMenuOption::new((*label).to_string(), value)
                .emoji(serenity::ReactionType::Unicode(emoji.to_string()))
        })
        .collect();
    serenity::CreateSelectMenu::new(
        ROLESELECT_MAIN_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(placeholder.to_string())
}

/// Live preview select over the draft entries. Mirrors
/// generateSelectMenu (label, `role_<id>` value, emoji when valid,
/// desc).
pub fn build_preview_select(
    message_id: u64,
    placeholder: &str,
    data: &[RoleSelectEntry],
) -> serenity::CreateSelectMenu {
    let options = data
        .iter()
        .map(|item| {
            let mut opt = serenity::CreateSelectMenuOption::new(
                item.label.clone(),
                format!("role_{}", item.role_id),
            );
            if !item.emoji.is_empty()
                && (crate::funcs::is_single_emoji(&item.emoji)
                    || crate::funcs::is_discord_emoji(&item.emoji))
            {
                opt = opt.emoji(serenity::ReactionType::Unicode(item.emoji.clone()));
            }
            if !item.desc.is_empty() {
                opt = opt.description(item.desc.clone());
            }
            opt
        })
        .collect();
    serenity::CreateSelectMenu::new(
        roleselect_preview_id(message_id),
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(placeholder.to_string())
}

/// Config embed field for one entry:
/// `[emoji|None] ・ label` / `Roles: <mention>|Unknown\n<desc>: ...`.
/// Mirrors updateConfiguration.
pub fn config_field(
    entry: &RoleSelectEntry,
    var_none: &str,
    roles_word: &str,
    desc_label: &str,
    role_known: bool,
) -> (String, String) {
    let emoji = if entry.emoji.is_empty() {
        var_none.to_string()
    } else {
        entry.emoji.clone()
    };
    let name = format!("[{emoji}] ・ {}", entry.label);
    let role = if role_known {
        format!("<@&{}>", entry.role_id)
    } else {
        var_none.to_string()
    };
    let desc = if entry.desc.is_empty() {
        var_none.to_string()
    } else {
        entry.desc.clone()
    };
    (name, format!("{roles_word}: {role}\n{desc_label}: {desc}"))
}

/// Pure helper: parse a "role_<id>" select value into a RoleId.
pub fn parse_roleselect_value(value: &str) -> Option<serenity::RoleId> {
    value
        .strip_prefix("role_")?
        .trim()
        .parse::<u64>()
        .ok()
        .map(serenity::RoleId::new)
}

pub async fn load_roleselect(
    pool: &crate::db::Pool,
    guild_id: &str,
    message_id: u64,
) -> Vec<RoleSelectEntry> {
    crate::db::kv_get(pool, guild_id, &roleselect_key(message_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "rolereactions",
    rename = "roleselect",
    aliases("selectreact"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn roleselect(
    ctx: Ctx<'_>,
    #[description = "Channel id with the target message"] channel_id: String,
    #[description = "Message id to configure"] message_id: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    // TS validates length>=9, fetches the message, requires bot authorship.
    if message_id.trim().len() < 9 {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "roleselect_invalid_message_id",
                "Invalid message ID provided.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let (Ok(ch), Ok(mid)) = (
        channel_id.trim().parse::<u64>(),
        message_id.trim().parse::<u64>(),
    ) else {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "roleselect_message_not_found",
                "Message not found in the specified channel.",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    let channel = serenity::ChannelId::new(ch);
    let Ok(target) = channel
        .message(ctx.http(), serenity::MessageId::new(mid))
        .await
    else {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "roleselect_message_not_found",
                "Message not found in the specified channel.",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    if target.author.id != ctx.serenity_context().cache.current_user().id {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "buttonreaction_message_other_user_error",
                "I can't modify the components of another user's message.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let base_data = load_roleselect(&ctx.data().pool, &gid, mid).await;
    let draft = RoleSelectDraft {
        target_channel: ch.to_string(),
        target_msg: mid.to_string(),
        placeholder: t("roleselect_default_placeholder"),
        invoker: ctx.author().id.get().to_string(),
        data: base_data,
        pending: None,
    };
    let known = roles_known(
        ctx.serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| g.roles.clone())
            .as_ref(),
        &draft.data,
    );
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(config_full_embed(
                    &draft,
                    &known,
                    &t("roleselect_menu1_embed_title"),
                    &t("roleselect_menu1_embed_description"),
                    &t("var_none"),
                    &t("var_roles"),
                    &t("roleselect_modal1_fields3_label"),
                ))
                .components(config_rows(
                    &draft,
                    [
                        &t("roleselect_menu1_add"),
                        &t("roleselect_menu1_remove"),
                        &t("roleselect_menu1_change_placeholder"),
                        &t("roleselect_menu1_save"),
                        &t("roleselect_menu1_cancel"),
                        &t("roleselect_menu1_placeholder"),
                    ],
                )),
        )
        .await?;
    let config_msg = handle.message().await?.id.get();
    let _ = crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &roleselect_draft_key(config_msg),
        &serde_json::to_string(&draft)?,
    )
    .await;
    Ok(())
}

/// Cache-only role knowledge flags (TS reads roles.cache only).
fn roles_known(
    roles: Option<&std::collections::HashMap<serenity::RoleId, serenity::Role>>,
    data: &[RoleSelectEntry],
) -> Vec<bool> {
    data.iter()
        .map(|e| {
            e.role_id
                .parse::<u64>()
                .ok()
                .map(|id| {
                    roles
                        .map(|m| m.contains_key(&serenity::RoleId::new(id)))
                        .unwrap_or(false)
                })
                .unwrap_or(false)
        })
        .collect()
}

/// Config embed fields from entries + knowledge flags.
fn config_fields(
    data: &[RoleSelectEntry],
    known: &[bool],
    var_none: &str,
    roles_word: &str,
    desc_label: &str,
) -> Vec<(String, String, bool)> {
    data.iter()
        .zip(known.iter())
        .map(|(entry, is_known)| {
            let (name, value) = config_field(entry, var_none, roles_word, desc_label, *is_known);
            (name, value, false)
        })
        .collect()
}

/// Builder main-menu row. Labels resolved by the caller.
fn main_menu_row(
    add: &str,
    remove: &str,
    change_placeholder: &str,
    save: &str,
    cancel: &str,
    menu_placeholder: &str,
) -> serenity::CreateActionRow {
    serenity::CreateActionRow::SelectMenu(build_main_menu(
        [add, remove, change_placeholder, save, cancel],
        menu_placeholder,
    ))
}

/// Config message rows: main menu + live preview when non-empty.
fn config_rows(draft: &RoleSelectDraft, menu: [&str; 6]) -> Vec<serenity::CreateActionRow> {
    let mut rows = vec![main_menu_row(
        menu[0], menu[1], menu[2], menu[3], menu[4], menu[5],
    )];
    if !draft.data.is_empty() {
        rows.push(serenity::CreateActionRow::SelectMenu(build_preview_select(
            draft.target_msg.parse::<u64>().unwrap_or(0),
            &draft.placeholder,
            &draft.data,
        )));
    }
    rows
}

/// Full config embed from a draft.
fn config_full_embed(
    draft: &RoleSelectDraft,
    known: &[bool],
    title: &str,
    desc: &str,
    var_none: &str,
    roles_word: &str,
    desc_label: &str,
) -> serenity::CreateEmbed {
    serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(0x2f3136))
        .title(title.to_string())
        .description(desc.to_string())
        .fields(config_fields(
            &draft.data,
            known,
            var_none,
            roles_word,
            desc_label,
        ))
}

/// Re-render the config message from the draft (http edit, like
/// interaction2.editReply/update in the TS collector).
async fn refresh_config(
    http: &std::sync::Arc<serenity::Http>,
    roles: Option<&std::collections::HashMap<serenity::RoleId, serenity::Role>>,
    lang_code: &str,
    config_msg: u64,
    config_channel: u64,
    draft: &RoleSelectDraft,
) {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let known = roles_known(roles, &draft.data);
    let embed = config_full_embed(
        draft,
        &known,
        &t("roleselect_menu1_embed_title"),
        &t("roleselect_menu1_embed_description"),
        &t("var_none"),
        &t("var_roles"),
        &t("roleselect_modal1_fields3_label"),
    );
    let rows = config_rows(
        draft,
        [
            &t("roleselect_menu1_add"),
            &t("roleselect_menu1_remove"),
            &t("roleselect_menu1_change_placeholder"),
            &t("roleselect_menu1_save"),
            &t("roleselect_menu1_cancel"),
            &t("roleselect_menu1_placeholder"),
        ],
    );
    let _ = serenity::ChannelId::new(config_channel)
        .edit_message(
            http,
            serenity::MessageId::new(config_msg),
            serenity::EditMessage::new().embed(embed).components(rows),
        )
        .await;
}

/// Load a builder draft by config message id.
async fn load_draft(pool: &crate::db::Pool, gid: &str, config_msg: u64) -> Option<RoleSelectDraft> {
    crate::db::kv_get(pool, gid, &roleselect_draft_key(config_msg))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
}

async fn save_draft(pool: &crate::db::Pool, gid: &str, config_msg: u64, draft: &RoleSelectDraft) {
    let _ = crate::db::kv_set(
        pool,
        gid,
        &roleselect_draft_key(config_msg),
        &serde_json::to_string(draft).unwrap_or_default(),
    )
    .await;
}

fn modal_field(submit: &serenity::ModalInteraction, field_id: &str) -> String {
    for row in &submit.data.components {
        if let Some(serenity::ActionRowComponent::InputText(input)) = row.components.first() {
            if input.custom_id == field_id {
                return input.value.clone().unwrap_or_default();
            }
        }
    }
    String::new()
}

/// Builder main-menu presses (add/remove/placeholder/save/cancel
/// with the invoker gate). Mirrors the TS collector legs.
pub async fn handle_roleselect_main(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let config_msg = comp.message.id.get();
    let Some(mut draft) = load_draft(pool, &gid, config_msg).await else {
        return Ok(());
    };
    if comp.user.id.get().to_string() != draft.invoker {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(t("help_not_for_you"))
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
    let value = match &comp.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().cloned().unwrap_or_default()
        }
        _ => String::new(),
    };
    let http = ctx.http.clone();
    let roles_snapshot = ctx.cache.guild(guild_id).map(|g| g.roles.clone());
    match value.as_str() {
        "add" => {
            let modal =
                serenity::CreateModal::new(ROLESELECT_ADD_MODAL, t("roleselect_modal1_title"))
                    .components(vec![
                        serenity::CreateActionRow::InputText(
                            serenity::CreateInputText::new(
                                serenity::InputTextStyle::Short,
                                t("roleselect_modal1_fields1_label"),
                                "case_emoji",
                            )
                            .placeholder(t("roleselect_modal1_fields1_placeholder"))
                            .required(false)
                            .min_length(1)
                            .max_length(120),
                        ),
                        serenity::CreateActionRow::InputText(
                            serenity::CreateInputText::new(
                                serenity::InputTextStyle::Short,
                                t("roleselect_modal1_fields2_label"),
                                "case_title",
                            )
                            .placeholder(t("roleselect_modal1_fields2_placeholder"))
                            .required(true)
                            .min_length(4)
                            .max_length(50),
                        ),
                        serenity::CreateActionRow::InputText(
                            serenity::CreateInputText::new(
                                serenity::InputTextStyle::Paragraph,
                                t("roleselect_modal1_fields3_label"),
                                "case_desc",
                            )
                            .placeholder(t("roleselect_modal1_fields3_placeholder"))
                            .required(false)
                            .max_length(120),
                        ),
                    ]);
            comp.create_response(&http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, ROLESELECT_ADD_MODAL).await
            else {
                return Ok(());
            };
            let emoji = modal_field(&submit, "case_emoji").trim().to_string();
            let label = modal_field(&submit, "case_title").trim().to_string();
            let desc = modal_field(&submit, "case_desc").trim().to_string();
            draft.pending = Some(RoleSelectPending { emoji, label, desc });
            save_draft(pool, &gid, config_msg, &draft).await;
            // Ephemeral role picker (the 60s RoleSelect wait,
            // stateless via the pick id below).
            submit
                .create_response(
                    &http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(t("roleselect_awaiting1_msg"))
                            .components(vec![serenity::CreateActionRow::SelectMenu(
                                serenity::CreateSelectMenu::new(
                                    format!("{ROLESELECT_ROLE_PICK_PREFIX}{config_msg}"),
                                    serenity::CreateSelectMenuKind::Role {
                                        default_roles: None,
                                    },
                                )
                                .placeholder(t("roleselect_awaiting1_menu_placeholder"))
                                .min_values(1)
                                .max_values(1),
                            )])
                            .ephemeral(true),
                    ),
                )
                .await?;
        }
        "remove" => {
            if draft.data.is_empty() {
                comp.create_response(
                    &http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(t("roleselect_no_role_found"))
                            .ephemeral(true),
                    ),
                )
                .await?;
                return Ok(());
            }
            draft.data.pop();
            save_draft(pool, &gid, config_msg, &draft).await;
            if draft.data.is_empty() {
                // TS clears embeds and drops the preview row.
                comp.create_response(
                    &http,
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new()
                            .embeds(vec![])
                            .components(vec![serenity::CreateActionRow::SelectMenu(
                                build_main_menu(
                                    [
                                        &t("roleselect_menu1_add"),
                                        &t("roleselect_menu1_remove"),
                                        &t("roleselect_menu1_change_placeholder"),
                                        &t("roleselect_menu1_save"),
                                        &t("roleselect_menu1_cancel"),
                                    ],
                                    &t("roleselect_menu1_placeholder"),
                                ),
                            )]),
                    ),
                )
                .await?;
                comp.create_followup(
                    &http,
                    serenity::CreateInteractionResponseFollowup::new()
                        .content(t("roleselect_all_role_removed"))
                        .ephemeral(true),
                )
                .await?;
                return Ok(());
            }
            refresh_config(
                &http,
                roles_snapshot.as_ref(),
                &code,
                config_msg,
                comp.channel_id.get(),
                &draft,
            )
            .await;
            comp.create_response(
                &http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("roleselect_last_role_removed"))
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "placeholder" => {
            let modal = serenity::CreateModal::new(
                ROLESELECT_PLACEHOLDER_MODAL,
                t("roleselect_modal2_title"),
            )
            .components(vec![serenity::CreateActionRow::InputText(
                serenity::CreateInputText::new(
                    serenity::InputTextStyle::Short,
                    t("roleselect_modal2_label"),
                    "placeholder",
                )
                .placeholder(t("roleselect_modal2_placeholder"))
                .required(true)
                .min_length(8)
                .max_length(50),
            )]);
            comp.create_response(&http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, ROLESELECT_PLACEHOLDER_MODAL).await
            else {
                return Ok(());
            };
            draft.placeholder = modal_field(&submit, "placeholder").trim().to_string();
            save_draft(pool, &gid, config_msg, &draft).await;
            refresh_config(
                &http,
                roles_snapshot.as_ref(),
                &code,
                config_msg,
                comp.channel_id.get(),
                &draft,
            )
            .await;
            let _ = submit
                .create_response(&http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
        }
        "save" => {
            let key = roleselect_key(draft.target_msg.parse::<u64>().unwrap_or(0));
            if crate::db::kv_set(
                pool,
                &gid,
                &key,
                &serde_json::to_string(&draft.data).unwrap_or_default(),
            )
            .await
            .is_err()
            {
                comp.create_response(
                    &http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(t("roleselect_failed_to_save_config"))
                            .ephemeral(true),
                    ),
                )
                .await?;
                return Ok(());
            }
            // Apply the preview select to the target message (or
            // clear it when empty).
            if let (Ok(ch), Ok(mid)) = (
                draft.target_channel.parse::<u64>(),
                draft.target_msg.parse::<u64>(),
            ) {
                let channel = serenity::ChannelId::new(ch);
                if let Ok(target) = channel.message(&http, serenity::MessageId::new(mid)).await {
                    let mut edit = serenity::EditMessage::new();
                    if !draft.data.is_empty() {
                        edit = edit.components(vec![serenity::CreateActionRow::SelectMenu(
                            build_preview_select(mid, &draft.placeholder, &draft.data),
                        )]);
                    } else {
                        edit = edit.components(vec![]);
                    }
                    let _ = channel.edit_message(&http, target.id, edit).await;
                }
            }
            comp.create_response(
                &http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("roleselect_save_command_ok"))
                        .ephemeral(true),
                ),
            )
            .await?;
            // Collector-end parity: strip the config message rows.
            let _ = comp
                .channel_id
                .edit_message(
                    &http,
                    comp.message.id,
                    serenity::EditMessage::new().components(vec![]),
                )
                .await;
            let _ = crate::db::kv_del(pool, &gid, &roleselect_draft_key(config_msg)).await;
        }
        _ => {
            // cancel (and anything unknown): confirm + strip rows.
            comp.create_response(
                &http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("roleselect_canceled_command_ok"))
                        .ephemeral(true),
                ),
            )
            .await?;
            let _ = comp
                .channel_id
                .edit_message(
                    &http,
                    comp.message.id,
                    serenity::EditMessage::new().components(vec![]),
                )
                .await;
            let _ = crate::db::kv_del(pool, &gid, &roleselect_draft_key(config_msg)).await;
        }
    }
    Ok(())
}

/// Role picker for the builder add flow
/// (`roleselect_role_pick:<config>`). Dup roles are rejected,
// otherwise the pending entry joins the draft.
pub async fn handle_roleselect_role_pick(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    config_msg: u64,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let Some(mut draft) = load_draft(pool, &gid, config_msg).await else {
        return Ok(());
    };
    let role_id = match &comp.data.kind {
        serenity::ComponentInteractionDataKind::RoleSelect { values } => values
            .first()
            .map(|r| r.get().to_string())
            .unwrap_or_default(),
        _ => String::new(),
    };
    let Some(pending) = draft.pending.clone() else {
        let _ = comp
            .create_response(&ctx.http, serenity::CreateInteractionResponse::Acknowledge)
            .await;
        return Ok(());
    };
    if role_id.is_empty() || draft.data.iter().any(|x| x.role_id == role_id) {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(t("roleselect_role_already_exist"))
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
    let mut entry = RoleSelectEntry {
        label: pending.label,
        role_id,
        ..Default::default()
    };
    if !pending.emoji.is_empty()
        && (crate::funcs::is_single_emoji(&pending.emoji)
            || crate::funcs::is_discord_emoji(&pending.emoji))
    {
        entry.emoji = pending.emoji;
    }
    if !pending.desc.is_empty() {
        entry.desc = pending.desc;
    }
    draft.data.push(entry);
    draft.pending = None;
    save_draft(pool, &gid, config_msg, &draft).await;
    let http = ctx.http.clone();
    let roles_snapshot = ctx.cache.guild(guild_id).map(|g| g.roles.clone());
    refresh_config(
        &http,
        roles_snapshot.as_ref(),
        &code,
        config_msg,
        comp.channel_id.get(),
        &draft,
    )
    .await;
    // Delta: the ephemeral role prompt is left in place (TS deletes
    // the prompt message, whose id stateless Rust does not track).
    let _ = comp
        .create_response(&ctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    Ok(())
}

/// Saved-select presses (`roleselect_roles%<msg>`). Mirrors
/// SelectMenu/roleselect_roles.ts: saved-data lookup, role fetch,
/// bot hierarchy check, add/remove toggle.
pub async fn handle_roleselect_grant(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let mid = comp.message.id.get();
    let data = load_roleselect(pool, &gid, mid).await;
    if data.is_empty() {
        return Ok(());
    }
    let value = match &comp.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().cloned().unwrap_or_default()
        }
        _ => String::new(),
    };
    let Some(role_id) = parse_roleselect_value(&value) else {
        return Ok(());
    };
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
    let roles = guild_id.roles(&ctx.http).await.unwrap_or_default();
    let Some(target) = roles.get(&role_id) else {
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
    // Delta: "[RoleSelect] Module" audit reason unavailable in 0.12.
    let mention = format!("<@&{}>", role_id.get());
    let member = guild_id.member(&ctx.http, comp.user.id).await?;
    if member.roles.contains(&role_id) {
        member.remove_role(&ctx.http, role_id).await?;
        ephemeral(t("buttonreaction_role_remove").replace("${fetched_role.toString()}", &mention))
            .await?;
    } else {
        member.add_role(&ctx.http, role_id).await?;
        ephemeral(t("buttonreaction_role_add").replace("${fetched_role.toString()}", &mention))
            .await?;
    }
    Ok(())
}

/// Grant a role to all message reactors.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "addrolereact"
)]
pub async fn addrolereact(
    ctx: Ctx<'_>,
    #[description = "Message id"] message_id: String,
    #[description = "Role"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    if let Err(e) = addrolereact_inner(&ctx, &message_id, &role).await {
        // Catch-all. Mirrors the TS try/catch -> addrolereact_error.
        let _ = e;
        ctx.say(
            crate::commands::lang_for(&ctx, "addrolereact_error", "Error executing the command.")
                .await,
        )
        .await?;
    }
    Ok(())
}

async fn addrolereact_inner(
    ctx: &Ctx<'_>,
    message_id: &str,
    role: &serenity::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let Some(member) = ctx.author_member().await else {
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "addrolereact_cannot_check_permissions",
                "Cannot check your permissions.",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    let highest = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| {
            member
                .roles
                .iter()
                .filter_map(|r| g.roles.get(r))
                .max_by_key(|r| r.position)
                .map(|r| r.position)
        })
        .unwrap_or(0);
    if role.position >= highest {
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "addrolereact_role_too_high",
                "You cannot add a role higher than or equal to your highest role.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let Some(ch) = ctx.guild_channel().await else {
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "addrolereact_must_be_text_channel",
                "This command must be executed in a text channel.",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let Ok(target) = ch.id.message(ctx.http(), mid).await else {
        ctx.say(
            crate::commands::lang_for(ctx, "addrolereact_message_not_found", "Message not found.")
                .await,
        )
        .await?;
        return Ok(());
    };
    if target.reactions.is_empty() {
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "addrolereact_no_reactions",
                "This message has no reactions.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    ctx.say(
        crate::commands::lang_for(
            ctx,
            "addrolereact_adding_role",
            "Adding role {role} in progress...",
        )
        .await
        .replace("{role}", &role.name),
    )
    .await?;
    let mut total = 0u64;
    for reaction in &target.reactions {
        let users = ctx
            .http()
            .get_reaction_users(ch.id, target.id, &reaction.reaction_type, 100, None)
            .await
            .unwrap_or_default();
        let humans: Vec<_> = users.into_iter().filter(|u| !u.bot).collect();
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "addrolereact_adding_role_progress",
                "Adding role {role} in progress for {count} users...",
            )
            .await
            .replace("{role}", &role.name)
            .replace("{count}", &humans.len().to_string()),
        )
        .await?;
        for user in humans {
            let Ok(m) = guild_id.member(ctx.http(), user.id).await else {
                continue;
            };
            if m.roles.contains(&role.id) {
                continue;
            }
            if m.add_role(ctx.http(), role.id).await.is_ok() {
                total += 1;
            }
        }
    }
    ctx.say(
        crate::commands::lang_for(
            ctx,
            "addrolereact_role_added",
            "Role {role} added. {count} users received the role.",
        )
        .await
        .replace("{role}", &role.name)
        .replace("{count}", &total.to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_role_values() {
        assert_eq!(
            parse_roleselect_value("role_123"),
            Some(serenity::RoleId::new(123))
        );
        assert_eq!(parse_roleselect_value("role_abc"), None);
        assert_eq!(parse_roleselect_value("pick_123"), None);
        assert_eq!(parse_roleselect_value(""), None);
    }

    #[test]
    fn roleselect_key_shape() {
        assert_eq!(roleselect_key(42), "GUILD.ROLE_SELECT.42");
    }

    #[test]
    fn ts_row_shape_parses() {
        // TS writes {label, roleId, emoji?, desc?} (camelCase).
        let entry: RoleSelectEntry =
            serde_json::from_str(r#"{"label":"Mods","roleId":"7","emoji":"⭐","desc":"team"}"#)
                .unwrap();
        assert_eq!(entry.label, "Mods");
        assert_eq!(entry.role_id, "7");
        assert_eq!(entry.emoji, "⭐");
        assert_eq!(entry.desc, "team");
    }

    #[test]
    fn config_field_shape() {
        let entry = RoleSelectEntry {
            label: "Mods".to_string(),
            role_id: "7".to_string(),
            emoji: String::new(),
            desc: String::new(),
        };
        let (name, value) = config_field(&entry, "None", "Roles", "Description", true);
        assert_eq!(name, "[None] ・ Mods");
        assert_eq!(value, "Roles: <@&7>\nDescription: None");
        let (_, missing) = config_field(&entry, "None", "Roles", "Description", false);
        assert_eq!(missing, "Roles: None\nDescription: None");
    }

    #[test]
    fn preview_id_and_select_shape() {
        assert_eq!(roleselect_preview_id(9), "roleselect_roles%9");
        let data = vec![RoleSelectEntry {
            label: "Mods".to_string(),
            role_id: "7".to_string(),
            emoji: "⭐".to_string(),
            desc: "team".to_string(),
        }];
        let menu = build_preview_select(9, "Pick", &data);
        let v = serde_json::to_value(&menu).unwrap();
        assert_eq!(v["custom_id"], "roleselect_roles%9");
        assert_eq!(v["placeholder"], "Pick");
        assert_eq!(v["options"][0]["label"], "Mods");
        assert_eq!(v["options"][0]["value"], "role_7");
        assert_eq!(v["options"][0]["description"], "team");
    }

    #[test]
    fn main_menu_shape() {
        let menu = build_main_menu(["a", "r", "p", "s", "c"], "Choose");
        let v = serde_json::to_value(&menu).unwrap();
        assert_eq!(v["custom_id"], ROLESELECT_MAIN_ID);
        assert_eq!(v["placeholder"], "Choose");
        assert_eq!(v["options"].as_array().unwrap().len(), 5);
        assert_eq!(v["options"][0]["value"], "add");
        assert_eq!(v["options"][4]["value"], "cancel");
    }

    #[test]
    fn reaction_role_rows_parse() {
        assert_eq!(
            parse_reaction_role(r#"{"rolesID":"7","reactionNAME":"👍","enable":true}"#),
            Some(7)
        );
        // Legacy bare-id rows keep working.
        assert_eq!(parse_reaction_role("42"), Some(42));
        assert_eq!(parse_reaction_role("nope"), None);
        assert_eq!(parse_reaction_role(r#"{"rolesID":"x"}"#), None);
    }

    #[test]
    fn reaction_types_and_keys() {
        match reaction_type_for("👍") {
            serenity::ReactionType::Unicode(u) => assert_eq!(u, "👍"),
            _ => panic!("unicode"),
        }
        match reaction_type_for("12345") {
            serenity::ReactionType::Custom { id, name, .. } => {
                assert_eq!(id.get(), 12345);
                assert_eq!(name, None);
            }
            _ => panic!("custom"),
        }
        assert_eq!(
            reaction_role_keys(&serenity::ReactionType::Unicode("👍".to_string())),
            vec!["👍".to_string()]
        );
        assert_eq!(
            reaction_role_keys(&reaction_type_for("12345")),
            vec!["12345".to_string()]
        );
    }

    #[test]
    fn button_reaction_ids_and_keys() {
        assert_eq!(button_reaction_id(7), "button_reaction%7");
        assert_eq!(
            button_role_key(9, "7"),
            "GUILD.REACTION_ROLES.9.button_reaction%7"
        );
        assert_eq!(normalize_button_reaction("<:pepe:123>"), "123");
        assert_eq!(normalize_button_reaction("<a:dance:678>"), "678");
        assert_eq!(normalize_button_reaction("👍"), "👍");
        assert!(!is_valid_button_reaction("<:x:1>"));
        assert!(is_valid_button_reaction("👍"));
        assert!(is_valid_button_reaction("123"));
        let row: ButtonRoleRow =
            serde_json::from_str(r#"{"rolesID":"7","reactionNAME":"👍","enable":true}"#).unwrap();
        assert_eq!(row.roles_id, "7");
        assert_eq!(row.reaction_name, "👍");
        assert!(row.enable);
    }

    #[test]
    fn button_rows_append_and_remove() {
        // Fresh message: new row.
        let mut rows = vec![];
        append_button_row(
            &mut rows,
            "button_reaction%7",
            serde_json::json!({"name": "👍"}),
        )
        .unwrap();
        assert_eq!(rows.len(), 1);
        // Existing button row with room: append in place.
        append_button_row(
            &mut rows,
            "button_reaction%8",
            serde_json::json!({"name": "🎫"}),
        )
        .unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0]["components"].as_array().unwrap().len(), 2);
        // Five rows: error like the TS throw.
        let mut full = vec![serde_json::json!({"type": 1, "components": []}); 5];
        assert!(append_button_row(&mut full, "x", serde_json::json!({"name": "y"})).is_err());
        // buttonUnreact matches emoji.id only (unicode never matches).
        let mut custom = vec![serde_json::json!({"type": 1, "components": [
            {"type": 2, "custom_id": "button_reaction%7", "emoji": {"id": "123"}},
            {"type": 2, "custom_id": "button_reaction%8", "emoji": {"name": "🎫"}}
        ]})];
        assert!(remove_button_by_emoji(&mut custom, "123"));
        assert_eq!(custom[0]["components"].as_array().unwrap().len(), 1);
        assert!(!remove_button_by_emoji(&mut custom, "🎫"));
        // Emptied rows drop.
        let mut solo = vec![serde_json::json!({"type": 1, "components": [
            {"type": 2, "custom_id": "button_reaction%7", "emoji": {"id": "123"}}
        ]})];
        assert!(remove_button_by_emoji(&mut solo, "123"));
        assert!(solo.is_empty());
    }
}

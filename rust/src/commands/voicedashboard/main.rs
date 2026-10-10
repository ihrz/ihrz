use crate::bot::Ctx;
use crate::commands::moderation::banlist::deny_foreign_press;
use poise::serenity_prelude as serenity;

// Interface-path decision (U-VOICE-IFACE): ADOPT FLAT, do not restore the
// TS `interface` subgroup (`/voicedashboard interface set-voice-channel|...`).
// Rationale: no Rust module on this branch uses poise subcommand groups (all
// flat `/voice lobby|panel|category|name|position|staff`), and restoring the
// subgroup would perpetuate the TS `set-voice-channel-catgory` typo in the
// public command tree. DB keys (`VOICE_INTERFACE.*`) are unchanged, so
// existing guild config carries over. Migration mapping:
//   interface set-voice-channel          -> /voice lobby (VOICE_INTERFACE.voice_channel)
//   interface set-text-channel           -> /voice panel (VOICE_INTERFACE.interface)
//   interface set-voice-channel-catgory  -> /voice category (VOICE_INTERFACE.voice_channel_category)
//   interface set-voice-channel-name     -> /voice name (VOICE_INTERFACE.voice_channel_name)
//   interface set-voice-channel-position -> /voice position (VOICE_INTERFACE.voice_channel_position)
//   set-staff-role                       -> /voice staff (VOICE_INTERFACE.staff_role)

pub fn vd_key(field: &str) -> String {
    format!("VOICE_INTERFACE.{field}")
}

/// `Yes | ...` acknowledgement prefix. Mirrors the
/// `${client.iHorizon_Emojis.Yes} | ...` replies in the
/// !set-voice-channel*.ts commands (app-emoji markup, ✅ fallback).
async fn yes_markup(http: &serenity::Http) -> String {
    crate::emojis::app_emoji_markup(http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string())
}

/// Subcommand for voice category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "voicedashboard",
    rename = "voice",
    subcommands(
        "vd_lobby",
        "vd_panel",
        "vd_category",
        "vd_name",
        "vd_position",
        "vd_staff"
    ),
    subcommand_required
)]
pub async fn voicedashboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Lobby command.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lobby",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_lobby(
    ctx: Ctx<'_>,
    #[description = "Lobby voice channel"]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
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

/// Making a panel for custom ticket configuration
#[poise::command(
    slash_command,
    prefix_command,
    rename = "panel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_panel(
    ctx: Ctx<'_>,
    #[description = "Text channel for the dashboard"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    ctx.defer().await?;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    // Dashboard embed. Mirrors !set-text-channel.ts: banner image,
    // description, 15 fields (11 emoji values + 4 spacers), footer.
    let mut embed = serenity::CreateEmbed::default()
        .colour(2829617)
        .description(t(
            "tempvoice_if_text_desc_embed",
            "## TempVoice Interface\nThis **interface** can be used to manage temporary voice channels.\n",
        ))
        .image(crate::funcs::guild_banner_url(pool, &gid).await);
    for slot in PANEL_FIELDS {
        match slot {
            Some((key, emoji_name, fallback)) => {
                let template = t(key, fallback);
                let markup = crate::emojis::app_emoji_markup(ctx.http(), emoji_name)
                    .await
                    .unwrap_or_default();
                embed = embed.field(
                    "** **",
                    render_panel_field(&template, emoji_name, &markup),
                    true,
                );
            }
            None => {
                embed = embed.field("** **", "** **", true);
            }
        }
    }
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some());
    let mut post = serenity::CreateMessage::new()
        .embed(embed)
        .components(panel_buttons(ctx.http()).await);
    if let Some(bytes) = fbytes {
        post = post.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    // Post into the target channel (TS `targetedChannel.send`), then
    // acknowledge with `Yes | <message url>` like the TS editReply.
    let sent = channel.id.send_message(ctx.http(), post).await?;
    // Persist the `{channelId, messageId}` object like
    // !set-text-channel.ts (`VOICE_INTERFACE.interface`); buttons read
    // it back via parse_interface_channel with legacy bare-string
    // read-compat.
    let iface_raw = serde_json::json!({
        "channelId": channel.id.get().to_string(),
        "messageId": sent.id.get().to_string(),
    })
    .to_string();
    crate::commands::owner::main::routed_set(pool, &gid, &gid, &vd_key("interface"), &iface_raw)
        .await?;
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let url = format!(
        "https://discord.com/channels/{gid}/{ch}/{msg}",
        ch = channel.id.get(),
        msg = sent.id.get()
    );
    ctx.say(format!("{yes} | {url}")).await?;
    Ok(())
}

/// The category to sync channels to
#[poise::command(
    slash_command,
    prefix_command,
    rename = "category",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_category(
    ctx: Ctx<'_>,
    #[description = "Category where temp channels are created"]
    #[channel_types("Category")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel_category"),
        &channel.id.get().to_string(),
    )
    .await?;
    // Ack mirrors !set-voice-channel-catgory.ts (`Yes | <#id>`).
    let yes = yes_markup(ctx.http()).await;
    ctx.say(format!("{yes} | <#{}>", channel.id.get())).await?;
    Ok(())
}

/// Change the iHorizon name into the server
#[poise::command(
    slash_command,
    prefix_command,
    rename = "name",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_name(
    ctx: Ctx<'_>,
    #[description = "Template, e.g. {user}'s room"] template: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let name = template.trim().to_string();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel_name"),
        &name,
    )
    .await?;
    // Ack mirrors !set-voice-channel-name.ts (`Yes | <name>`).
    let yes = yes_markup(ctx.http()).await;
    ctx.say(format!("{yes} | {name}")).await?;
    Ok(())
}

/// Voice-channel position choice. Mirrors the `position_type`
/// top/bottom choices in voicedashboard.ts (display names `Up (TOP)`
/// / `Down (Bottom)`): slash shows the two choices, and a bad prefix
/// value is rejected by the framework instead of silently storing a
/// default.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum PositionChoice {
    #[name = "Up (TOP)"]
    #[name = "top"]
    Top,
    #[name = "Down (Bottom)"]
    #[name = "bottom"]
    Bottom,
}

impl PositionChoice {
    /// Stored `VOICE_INTERFACE.voice_channel_position` value.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Top => "top",
            Self::Bottom => "bottom",
        }
    }
}

/// Position command.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "position",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_position(
    ctx: Ctx<'_>,
    #[description = "top or bottom"] position: PositionChoice,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pos = position.as_str();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel_position"),
        pos,
    )
    .await?;
    // Ack mirrors !set-voice-channel-position.ts (`Yes | ⬆/⬇`).
    let yes = yes_markup(ctx.http()).await;
    ctx.say(format!("{yes} | {}", if pos == "top" { "⬆" } else { "⬇" }))
        .await?;
    Ok(())
}

// Staff role setup. Mirrors !set-staff-role.ts: no slash options; the
// command posts an embed (current staff mentions) with a RoleSelect
// (up to 8) + a save button, both collected for 240s, and persists the
// picked ids as one JSON array on save-button confirm.
pub const STAFF_SELECT_ID: &str = "voice-staff-role-selecter";
pub const STAFF_SAVE_ID: &str = "voice-staff-role-save-button";
pub const STAFF_SETUP_TIMEOUT_SECS: u64 = 240;

/// Decode a stored `VOICE_INTERFACE.staff_role` value. This command
/// writes a JSON array; a bare role-id string is the legacy TS shape
/// (mirrors the `typeof staff_roles === "string"` backward-compat
/// branch in !set-staff-role.ts).
pub fn parse_staff_roles(raw: Option<&str>) -> Vec<String> {
    match raw.map(str::trim) {
        None | Some("") => vec![],
        Some(s) => serde_json::from_str::<Vec<String>>(s).unwrap_or_else(|_| vec![s.to_string()]),
    }
}

/// Staff ids rendered as role mentions, mirroring the TS
/// `staff_roles.map((x) => `<@&${x}>`).join(", ")` value.
pub fn staff_roles_value(ids: &[String]) -> String {
    ids.iter()
        .map(|id| format!("<@&{id}>"))
        .collect::<Vec<_>>()
        .join(", ")
}

/// Staff command.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "staff",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_staff(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    ctx.defer().await?;
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let author_id = ctx.author().id.get();
    let not_for_you = t("help_not_for_you", "This interaction is not for you");
    let none_word = t("setjoinroles_var_none", "None");
    // Field name mirrors the TS `|| "Staff Roles"` default.
    let field_name = t("setjoinroles_help_embed_fields_1_name", "Staff Roles");
    let desc = t(
        "tempvoice_staff_desc_embed",
        "## TempVoice Staff Role\nRoles listed here can now join and moderate the channel!\n",
    );
    let stored =
        crate::commands::owner::main::routed_get(pool, &gid, &gid, &vd_key("staff_role")).await;
    let staff_roles = parse_staff_roles(stored.as_deref());
    let mk_embed = |ids: &[String]| {
        let value = if ids.is_empty() {
            none_word.clone()
        } else {
            staff_roles_value(ids)
        };
        serenity::CreateEmbed::default()
            .colour(2829617)
            .description(desc.clone())
            .field(field_name.clone(), value, false)
    };
    let default_roles = {
        let ids: Vec<serenity::RoleId> = staff_roles
            .iter()
            .filter_map(|s| s.parse::<u64>().ok().map(serenity::RoleId::new))
            .collect();
        if ids.is_empty() {
            None
        } else {
            Some(ids)
        }
    };
    let menu = serenity::CreateSelectMenu::new(
        STAFF_SELECT_ID,
        serenity::CreateSelectMenuKind::Role { default_roles },
    )
    .min_values(0)
    .max_values(8);
    let mut save = serenity::CreateButton::new(STAFF_SAVE_ID).style(serenity::ButtonStyle::Primary);
    save = save.emoji(serenity::ReactionType::Unicode("💾".to_string()));
    let select_row = || serenity::CreateActionRow::SelectMenu(menu.clone());
    let save_row = |b: serenity::CreateButton| serenity::CreateActionRow::Buttons(vec![b]);
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let mut reply = poise::CreateReply::default()
        .embed(crate::commands::shared::embed_with_footer(
            mk_embed(&staff_roles),
            &fname,
            fbytes.is_some(),
        ))
        .components(vec![select_row(), save_row(save.clone())]);
    if let Some(bytes) = fbytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    // Untouched select saves the loaded array; a touched one saves the
    // latest pick (mirrors the TS collector reset + save-button write).
    let mut pending: Option<Vec<String>> = None;
    // Saved ids survive to the end-edit so the green success state is
    // kept (the TS end handler edits the same mutated builders).
    let mut saved_ids: Option<Vec<String>> = None;
    // Single loop drives both collectors (role select + save button),
    // author-gated like the TS filters, 240s like the TS `time`.
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(STAFF_SETUP_TIMEOUT_SECS))
            .await;
        let Some(press) = press else { break };
        if press.user.id.get() != author_id {
            deny_foreign_press(ctx.http(), &press, &not_for_you).await;
            continue;
        }
        if press.data.custom_id == STAFF_SELECT_ID {
            let ids = match &press.data.kind {
                serenity::ComponentInteractionDataKind::RoleSelect { values } => values
                    .iter()
                    .map(|r| r.get().to_string())
                    .collect::<Vec<_>>(),
                _ => continue,
            };
            pending = Some(ids.clone());
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new().embed(mk_embed(&ids)),
                    ),
                )
                .await;
        } else if press.data.custom_id == STAFF_SAVE_ID {
            let final_ids = pending.clone().unwrap_or_else(|| staff_roles.clone());
            let raw = serde_json::to_string(&final_ids).unwrap_or_else(|_| "[]".to_string());
            crate::commands::owner::main::routed_set(pool, &gid, &gid, &vd_key("staff_role"), &raw)
                .await?;
            // Config log, like `client.func.ihorizon_logs` in
            // !set-staff-role.ts (best-effort).
            let log_title = t(
                "setjoinroles_logs_embed_title_on_enable",
                "Staff Role Updated",
            );
            let log_desc = t(
                "setjoinroles_logs_embed_description_on_enable",
                "Staff roles updated by ${interaction.user.id}",
            )
            .replace("${interaction.user.id}", &author_id.to_string());
            crate::commands::economy::post_ihorizon_log(&ctx, &log_title, &log_desc).await;
            // Success state mirrors the TS save-button restyle
            // (Success + Yes emoji + disabled).
            let mut done = serenity::CreateButton::new(STAFF_SAVE_ID)
                .style(serenity::ButtonStyle::Success)
                .disabled(true);
            if let Some((id, name, animated)) =
                crate::emojis::cached_emoji_entry(ctx.http(), "Yes").await
            {
                done = done.emoji(serenity::ReactionType::Custom {
                    animated,
                    id: serenity::EmojiId::new(id),
                    name: Some(name),
                });
            } else {
                done = done.emoji(serenity::ReactionType::Unicode("✅".to_string()));
            }
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new()
                            .embed(mk_embed(&final_ids))
                            .components(vec![save_row(done)]),
                    ),
                )
                .await;
            saved_ids = Some(final_ids);
            break;
        }
    }
    // TS `end` handler disables both rows. When the save button already
    // confirmed, the saved ids render with the green disabled Yes
    // button (the TS end handler edits the same mutated builders, so
    // the success state survives); otherwise both rows just disable.
    let mut dead_menu = menu.clone();
    dead_menu = dead_menu.disabled(true);
    if let Some(ids) = saved_ids {
        let mut done = serenity::CreateButton::new(STAFF_SAVE_ID)
            .style(serenity::ButtonStyle::Success)
            .disabled(true);
        if let Some((id, name, animated)) =
            crate::emojis::cached_emoji_entry(ctx.http(), "Yes").await
        {
            done = done.emoji(serenity::ReactionType::Custom {
                animated,
                id: serenity::EmojiId::new(id),
                name: Some(name),
            });
        } else {
            done = done.emoji(serenity::ReactionType::Unicode("✅".to_string()));
        }
        let _ = msg
            .edit(
                ctx.http(),
                serenity::EditMessage::new()
                    .embed(mk_embed(&ids))
                    .components(vec![
                        serenity::CreateActionRow::SelectMenu(dead_menu),
                        save_row(done),
                    ]),
            )
            .await;
    } else {
        let _ = msg
            .edit(
                ctx.http(),
                serenity::EditMessage::new().components(vec![
                    serenity::CreateActionRow::SelectMenu(dead_menu),
                    save_row(save.disabled(true)),
                ]),
            )
            .await;
    }
    Ok(())
}

/// Temp-channel owner check. Entries: (key_suffix_user_id, channel_id).
pub fn is_temp_owner(entries: &[(String, String)], channel_id: &str, user_id: &str) -> bool {
    entries
        .iter()
        .any(|(uid, ch)| ch == channel_id && uid == user_id)
}

/// Presser's live voice channel from gateway state. Mirrors
/// `member.voice.channel` in the temporary_voice_* buttons: every
/// button operates on the voice channel the presser is sitting in,
/// never on the text channel hosting the interaction.
pub fn presser_voice(
    ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
) -> Option<serenity::ChannelId> {
    ctx.cache
        .guild(guild_id)
        .and_then(|g| g.voice_states.get(&user_id).and_then(|v| v.channel_id))
}

/// Live member count of a voice channel from gateway state. Mirrors
/// the `members.size` checks in the claim/transfer buttons.
pub fn voice_occupants(
    ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    channel: serenity::ChannelId,
) -> usize {
    ctx.cache.guild(guild_id).map_or(0, |g| {
        g.voice_states
            .values()
            .filter(|v| v.channel_id == Some(channel))
            .count()
    })
}

/// Fetch a guild voice channel from the API (not cache-only).
/// Non-voice channels map to None, mirroring the TS
/// `ownedChannel.type !== GuildVoice → null` guard.
pub async fn fetch_voice_channel(
    http: &std::sync::Arc<serenity::Http>,
    id: serenity::ChannelId,
) -> Option<serenity::GuildChannel> {
    match http.get_channel(id).await.ok()? {
        serenity::Channel::Guild(g) if g.kind == serenity::ChannelType::Voice => Some(g),
        _ => None,
    }
}

/// Parse a stored `VOICE_INTERFACE.interface` value. Current shape is
/// the `{channelId, messageId}` object posted by vd_panel; a bare
/// channel-id string is the legacy shape (read-compat).
pub fn parse_interface_channel(raw: &str) -> Option<String> {
    let t = raw.trim();
    if t.is_empty() {
        return None;
    }
    match serde_json::from_str::<serde_json::Value>(t) {
        Ok(v) => match &v {
            serde_json::Value::Object(m) => m
                .get("channelId")
                .and_then(|c| c.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(str::to_string),
            serde_json::Value::String(s) => {
                let s = s.trim();
                if s.is_empty() {
                    None
                } else {
                    Some(s.to_string())
                }
            }
            // Legacy bare id (`123`) parses as a JSON number.
            serde_json::Value::Number(n) => Some(n.to_string()),
            _ => None,
        },
        // Not JSON at all: legacy plain id string.
        Err(_) => Some(t.to_string()),
    }
}

/// Stored panel text-channel id (`VOICE_INTERFACE.interface`),
/// object shape with legacy string compat. Backs the
/// `result.interface?.channelId !== interaction.channelId` guard in
/// the temporary_voice_* buttons.
pub async fn interface_channel_id(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    let raw =
        crate::commands::owner::main::routed_get(pool, gid, gid, &vd_key("interface")).await?;
    parse_interface_channel(&raw)
}

/// Owner row for one user: the channel recorded at
/// `CUSTOM_VOICE.<gid>.<uid>`. Mirrors the TS `getChannelId` /
/// `getChannelOwner` lookups (`!== targetedChannel?.id → deferUpdate`).
pub fn owned_channel_id(temps: &[(String, String)], user_id: &str) -> Option<String> {
    temps
        .iter()
        .find(|(uid, _)| uid == user_id)
        .map(|(_, ch)| ch.clone())
}

/// Full allow set for a temp-channel owner. Mirrors the
/// permissionOverwrites.edit block applied after the move in
/// Events/voicedashboard/voiceState.ts and in the claim/transfer
/// buttons (view + voice + chat rights, no moderation rights —
/// unlike the staff set).
pub fn owner_voice_allow() -> serenity::Permissions {
    use serenity::Permissions as P;
    P::VIEW_CHANNEL
        | P::CONNECT
        | P::STREAM
        | P::SPEAK
        | P::SEND_MESSAGES
        | P::USE_APPLICATION_COMMANDS
        | P::ATTACH_FILES
        | P::ADD_REACTIONS
}

/// Temp-channel rename from the `VOICE_INTERFACE.voice_channel_name`
/// template. `{Username}` is replaced, otherwise the name is
/// appended (`template + " " + username`). Mirrors the spawn /
/// claim / transfer renames in TS.
pub fn render_temp_name(template: &str, username: &str) -> String {
    if template.contains("{Username}") {
        template.replace("{Username}", username)
    } else {
        format!("{template} {username}")
    }
}

/// Parse a voice user limit. Mirrors `parseInt` + the
/// `if (!userLimit)` reject in temporary_voice_limit_button.ts: 0
/// and non-numbers are rejected, with no upper clamp (Discord
/// enforces its own cap server-side).
pub fn parse_limit(raw: &str) -> Option<u32> {
    let n: u32 = raw.trim().parse().ok()?;
    if n == 0 {
        None
    } else {
        Some(n)
    }
}

pub const TEMPVOICE_PREFIX: &str = "tempvoice:";

/// Follow-up select menus posted by the block/trust/untrust/privacy
/// buttons. Mirrors the TS collectors (custom ids kept distinct from
/// the legacy `temporary_voice_*` ones, same semantics).
pub const TEMPVOICE_BLOCK_SELECT: &str = "tempvoice:block-select";
pub const TEMPVOICE_UNBLOCK_SELECT: &str = "tempvoice:unblock-select";
pub const TEMPVOICE_TRUST_SELECT: &str = "tempvoice:trust-select";
pub const TEMPVOICE_UNTRUST_SELECT: &str = "tempvoice:untrust-select";
pub const TEMPVOICE_PRIVACY_SELECT: &str = "tempvoice:privacy-select";
pub const TEMPVOICE_REGION_SELECT: &str = "tempvoice:region-select";
/// User-select menu posted by the transfer button. Mirrors the
/// `temporary_voice_transfer_selectmenue` collector in
/// temporary_voice_transfer_button.ts (note the TS id typo, kept
/// distinct here like the other tempvoice: ids).
pub const TEMPVOICE_TRANSFER_SELECT: &str = "tempvoice:transfer-select";

/// Voice region options. Mirrors the starter menu in
/// temporary_voice_region_button.ts (label, value).
pub const VOICE_REGIONS: &[(&str, &str)] = &[
    ("Singapore", "singapore"),
    ("Australia/Sydney", "sydney"),
    ("Russia", "russia"),
    ("India", "india"),
    ("Hong Kong", "hongkong"),
    ("South Africa", "southafrica"),
    ("Netherland/Rotterdam", "rotterdam"),
    ("Japan/Tokyo", "japan"),
    ("South Korea", "south-korea"),
    ("US/East", "us-east"),
    ("US/South", "us-south"),
    ("US/West", "us-west"),
    ("US/Central", "us-central"),
    ("Brazil", "brazil"),
];

/// String-select values of the privacy menu. Mirrors the
/// `temporary_channel_*` option values in
/// temporary_voice_privacy_button.ts.
pub const PRIVACY_LOCK: &str = "temporary_channel_lock_channel_menu";
pub const PRIVACY_UNLOCK: &str = "temporary_channel_unlock_channel_menu";
pub const PRIVACY_INVISIBLE: &str = "temporary_channel_invisible_channel_menu";
pub const PRIVACY_VISIBLE: &str = "temporary_channel_visible_channel_menu";
pub const PRIVACY_CLOSECHAT: &str = "temporary_channel_closechat_channel_menu";
pub const PRIVACY_OPENCHAT: &str = "temporary_channel_openchat_channel_menu";

/// Diff a user-select submission against current member overwrites.
/// Returns (added, removed); the clicker is never removed (mirrors the
/// `i.user.id !== overwriteId` guard in the TS collectors).
pub fn sync_members(
    selected: &[String],
    current: &[String],
    self_id: &str,
) -> (Vec<String>, Vec<String>) {
    let added = selected
        .iter()
        .filter(|id| !current.contains(id))
        .cloned()
        .collect();
    let removed = current
        .iter()
        .filter(|id| !selected.contains(id) && id.as_str() != self_id)
        .cloned()
        .collect();
    (added, removed)
}

/// @everyone overwrite for a privacy menu value, as
/// (allow_bits, deny_bits). Mirrors the three switch branches in
/// temporary_voice_privacy_button.ts.
pub fn privacy_rule(value: &str) -> Option<(u64, u64)> {
    use serenity::Permissions as P;
    match value {
        PRIVACY_LOCK => Some((0, (P::CONNECT | P::STREAM | P::SPEAK).bits())),
        PRIVACY_UNLOCK => Some(((P::CONNECT | P::STREAM | P::SPEAK).bits(), 0)),
        PRIVACY_INVISIBLE => Some((0, P::VIEW_CHANNEL.bits())),
        PRIVACY_VISIBLE => Some((P::VIEW_CHANNEL.bits(), 0)),
        PRIVACY_CLOSECHAT => Some((
            0,
            (P::SEND_MESSAGES | P::ADD_REACTIONS | P::USE_APPLICATION_COMMANDS).bits(),
        )),
        PRIVACY_OPENCHAT => Some((
            (P::SEND_MESSAGES | P::ADD_REACTIONS | P::USE_APPLICATION_COMMANDS).bits(),
            0,
        )),
        _ => None,
    }
}

/// Dashboard button layout: (action suffix, text label, emoji namespace).
/// Order mirrors the TS `buttonRows` in !set-text-channel.ts
/// (limit, name, claim, privacy, region / trust, block, transfer,
/// unblock, untrust / delete); chunked in fives like the TS rows.
pub const PANEL_BUTTONS: &[(&str, &str, &str)] = &[
    ("limit", "Limit", "VC_Limit"),
    ("name", "Name", "VC_Name"),
    ("claim", "Claim", "VC_Claim"),
    ("privacy", "Privacy", "VC_Privacy"),
    ("region", "Region", "VC_Region"),
    ("trust", "Trust", "VC_Trust"),
    ("block", "Block", "VC_Block"),
    ("transfer", "Transfer", "VC_Transfer"),
    ("unblock", "Unblock", "VC_Unblock"),
    ("untrust", "Untrust", "VC_Untrust"),
    ("delete", "Delete", "VC_Delete"),
];

fn panel_button_style(action: &str) -> serenity::ButtonStyle {
    use serenity::ButtonStyle;
    match action {
        "block" | "delete" => ButtonStyle::Danger,
        "claim" => ButtonStyle::Success,
        "trust" | "transfer" => ButtonStyle::Primary,
        _ => ButtonStyle::Secondary,
    }
}

fn panel_button(action: &str, label: &str) -> serenity::CreateButton {
    serenity::CreateButton::new(format!("{TEMPVOICE_PREFIX}{action}"))
        .label(label)
        .style(panel_button_style(action))
}

/// Emoji for a dashboard button: synced app emoji when warm, otherwise
/// the text label alone (the sync builder below covers the cold case).
async fn with_panel_emoji(
    http: &serenity::Http,
    button: serenity::CreateButton,
    emoji_name: &str,
) -> serenity::CreateButton {
    if let Some((id, name, animated)) = crate::emojis::cached_emoji_entry(http, emoji_name).await {
        button.emoji(serenity::ReactionType::Custom {
            animated,
            id: serenity::EmojiId::new(id),
            name: Some(name),
        })
    } else {
        button
    }
}

/// One live dashboard button (Secondary, VC_* emoji when warm).
async fn live_panel_button(
    http: &serenity::Http,
    action: &str,
    label: &str,
    emoji_name: &str,
) -> serenity::CreateButton {
    with_panel_emoji(
        http,
        serenity::CreateButton::new(format!("{TEMPVOICE_PREFIX}{action}"))
            .label(label)
            .style(serenity::ButtonStyle::Secondary),
        emoji_name,
    )
    .await
}

/// One disabled row-3 spacer (Empty emoji when warm, invisible label
/// otherwise so the button stays valid on a cold emoji cache).
async fn spacer_panel_button(http: &serenity::Http, n: u8) -> serenity::CreateButton {
    with_panel_emoji(
        http,
        serenity::CreateButton::new(format!("{TEMPVOICE_PREFIX}disable-{n}"))
            .label(" ")
            .style(serenity::ButtonStyle::Secondary)
            .disabled(true),
        "Empty",
    )
    .await
}

/// Dashboard buttons with VC_* emoji labels. Posted by vd_panel;
/// mirrors the `buttonRows` in !set-text-channel.ts: every button is
/// Secondary, row 3 holds the delete button centered between four
/// disabled Empty-emoji spacers.
pub async fn panel_buttons(http: &serenity::Http) -> Vec<serenity::CreateActionRow> {
    vec![
        serenity::CreateActionRow::Buttons(vec![
            live_panel_button(http, "limit", "Limit", "VC_Limit").await,
            live_panel_button(http, "name", "Name", "VC_Name").await,
            live_panel_button(http, "claim", "Claim", "VC_Claim").await,
            live_panel_button(http, "privacy", "Privacy", "VC_Privacy").await,
            live_panel_button(http, "region", "Region", "VC_Region").await,
        ]),
        serenity::CreateActionRow::Buttons(vec![
            live_panel_button(http, "trust", "Trust", "VC_Trust").await,
            live_panel_button(http, "block", "Block", "VC_Block").await,
            live_panel_button(http, "transfer", "Transfer", "VC_Transfer").await,
            live_panel_button(http, "unblock", "Unblock", "VC_Unblock").await,
            live_panel_button(http, "untrust", "Untrust", "VC_Untrust").await,
        ]),
        serenity::CreateActionRow::Buttons(vec![
            spacer_panel_button(http, 1).await,
            spacer_panel_button(http, 2).await,
            live_panel_button(http, "delete", "Delete", "VC_Delete").await,
            spacer_panel_button(http, 3).await,
            spacer_panel_button(http, 4).await,
        ]),
    ]
}

pub fn tempvoice_buttons() -> Vec<serenity::CreateActionRow> {
    PANEL_BUTTONS
        .chunks(5)
        .map(|c| {
            serenity::CreateActionRow::Buttons(
                c.iter().map(|(a, l, _)| panel_button(a, l)).collect(),
            )
        })
        .collect()
}

/// Dashboard embed fields in TS addFields order: (lang key, emoji
/// namespace, exact en-US fallback); None slots are the `** **` spacer
/// fields. Mirrors !set-text-channel.ts (15 fields).
pub const PANEL_FIELDS: &[Option<(&str, &str, &str)>] = &[
    Some((
        "tempvoice_if_text_fields_value_limit",
        "VC_Limit",
        "${client.iHorizon_Emojis.VC_Limit} **Change limit**",
    )),
    Some((
        "tempvoice_if_text_fields_value_name",
        "VC_Name",
        "${client.iHorizon_Emojis.VC_Name} **Change Name**",
    )),
    Some((
        "tempvoice_if_text_fields_value_region",
        "VC_Region",
        "${client.iHorizon_Emojis.VC_Region} **Change Region**",
    )),
    Some((
        "tempvoice_if_text_fields_value_trust",
        "VC_Trust",
        "${client.iHorizon_Emojis.VC_Trust} **Trust**",
    )),
    None,
    Some((
        "tempvoice_if_text_fields_value_untrust",
        "VC_Untrust",
        "${client.iHorizon_Emojis.VC_Untrust} **Untrust**",
    )),
    Some((
        "tempvoice_if_text_fields_value_block",
        "VC_Block",
        "${client.iHorizon_Emojis.VC_Block} **Block**",
    )),
    None,
    Some((
        "tempvoice_if_text_fields_value_unblock",
        "VC_Unblock",
        "${client.iHorizon_Emojis.VC_Unblock} **Unblock**",
    )),
    Some((
        "tempvoice_if_text_fields_value_claim",
        "VC_Claim",
        "${client.iHorizon_Emojis.VC_Claim} **Claim**",
    )),
    Some((
        "tempvoice_if_text_fields_value_privacy",
        "VC_Privacy",
        "${client.iHorizon_Emojis.VC_Privacy} **Privacy**",
    )),
    Some((
        "tempvoice_if_text_fields_value_transfer",
        "VC_Transfer",
        "${client.iHorizon_Emojis.VC_Transfer} **Transfer**",
    )),
    None,
    Some((
        "tempvoice_if_text_fields_value_delete",
        "VC_Delete",
        "${client.iHorizon_Emojis.VC_Delete} **Delete**",
    )),
    None,
];

/// Fill the `${client.iHorizon_Emojis.<Name>}` slot of a panel field
/// template with the resolved emoji markup. Mirrors the TS `.replace`.
pub fn render_panel_field(template: &str, emoji_name: &str, markup: &str) -> String {
    template.replace(&format!("${{client.iHorizon_Emojis.{emoji_name}}}"), markup)
}

/// Temp-voice sweep decision. Mirrors the cleanup legs of
/// Events/voicedashboard/voiceState.ts (`typeof channelId !==
/// "string"` guard, `!channel` guard, isMemberlessChannel).
/// Pure predicate backing the voice-state sweep and the guild-create
/// recovery, unit-tested below (no Discord needed).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TempSweep {
    /// Row is malformed or the channel is already gone: drop the key.
    CleanupKey,
    /// Channel exists and is empty: delete it, then drop the key.
    DeleteChannel,
    /// Channel exists and is occupied: keep everything.
    Keep,
}

/// Parse a CUSTOM_VOICE row value. None mirrors the TS
/// `typeof channelId !== "string"` guard (malformed rows are dropped).
pub fn parse_temp_channel_id(raw: &str) -> Option<u64> {
    let id = raw.trim().parse::<u64>().ok()?;
    if id == 0 {
        None
    } else {
        Some(id)
    }
}

/// Decide a temp row's fate from channel existence + occupancy.
/// Pure, unit-tested below.
pub fn temp_sweep_action(channel_exists: bool, occupied: bool) -> TempSweep {
    match (channel_exists, occupied) {
        (false, _) => TempSweep::CleanupKey,
        (true, false) => TempSweep::DeleteChannel,
        (true, true) => TempSweep::Keep,
    }
}

/// Load (user_id, channel_id) temp pairs for a guild: guild-table
/// subtree first, legacy kv rows filling gaps (table wins).
/// Mirrors the ticket TICKET_ALL prefix scan; keys unchanged.
pub async fn load_temps(pool: &crate::db::Pool, guild_id: &str) -> Vec<(String, String)> {
    use crate::commands::owner::main as routed;
    let mut by_uid: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for (k, v) in routed::legacy_scan(pool, guild_id, "CUSTOM_VOICE.").await {
        if let Some(uid) = k.rsplit('.').next() {
            by_uid.insert(uid.to_string(), v);
        }
    }
    // Table nests CUSTOM_VOICE.<gid>.<uid>; walk the guild layer.
    if let Some(root) = routed::tbl_get_value(pool, guild_id, "CUSTOM_VOICE").await {
        if let Some(obj) = routed::walk_path(&root, &[guild_id]).and_then(|v| v.as_object()) {
            for (uid, v) in obj {
                let ch = match v {
                    serde_json::Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
                by_uid.insert(uid.clone(), ch);
            }
        }
    }
    let mut rows: Vec<(String, String)> = by_uid.into_iter().collect();
    rows.sort();
    rows
}

/// `deferUpdate` equivalent for ignored temp-voice presses (wrong
/// channel, not in voice, not the owner). Best-effort, never fails.
async fn ack_press(ctx: &serenity::Context, comp: &serenity::ComponentInteraction) {
    let _ = comp
        .create_response(&ctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
}

/// Rename a temp channel for a new owner: the configured
/// `VOICE_INTERFACE.voice_channel_name` template (`{Username}` slot
/// or append fallback), else the lang `temporary_voice_channel_name`
/// default (`{nickname}` slot). Mirrors the claim/transfer renames.
async fn rename_for(
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    http: &std::sync::Arc<serenity::Http>,
    target: serenity::ChannelId,
    username: &str,
) {
    let tpl =
        crate::commands::owner::main::routed_get(pool, gid, gid, &vd_key("voice_channel_name"))
            .await
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
    let name = match tpl {
        Some(t) => render_temp_name(&t, username),
        None => {
            let def = crate::lang::get(lang_code, "temporary_voice_channel_name");
            crate::events::temp_channel_name_in(username, def.as_deref())
        }
    };
    let _ = target
        .edit(http, serenity::EditChannel::new().name(name))
        .await;
}

/// New/old-owner receipt embed. Mirrors the claim/transfer replies
/// (`temporary_voice_title_embec` + new/old member fields + banner).
async fn claim_transfer_embed(
    lang_code: &str,
    pool: &crate::db::Pool,
    gid: &str,
    new_mention: &str,
    old_mention: &str,
) -> serenity::CreateEmbed {
    serenity::CreateEmbed::default()
        .description(crate::lang::get(lang_code, "temporary_voice_title_embec").unwrap_or_default())
        .colour(2829617)
        .image(crate::funcs::guild_banner_url(pool, gid).await)
        .field(
            crate::lang::get(lang_code, "temporary_voice_new_member").unwrap_or_default(),
            new_mention.to_string(),
            false,
        )
        .field(
            crate::lang::get(lang_code, "temporary_voice_old_member").unwrap_or_default(),
            old_mention.to_string(),
            false,
        )
}

/// Single-field receipt embed for the name/limit renames. Mirrors
/// the TS replies (`temporary_voice_title_embec` + new-name /
/// new-userlimit field with the VC_* emoji + banner).
async fn receipt_embed(
    lang_code: &str,
    pool: &crate::db::Pool,
    gid: &str,
    field_key: &str,
    field_value: String,
) -> serenity::CreateEmbed {
    serenity::CreateEmbed::default()
        .description(crate::lang::get(lang_code, "temporary_voice_title_embec").unwrap_or_default())
        .colour(2829617)
        .image(crate::funcs::guild_banner_url(pool, gid).await)
        .field(
            crate::lang::get(lang_code, field_key).unwrap_or_default(),
            field_value,
            true,
        )
}

/// Dashboard button handler. Called from events_handler interaction_create.
pub async fn handle_tempvoice_button(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(action) = comp.data.custom_id.strip_prefix(TEMPVOICE_PREFIX) else {
        return Ok(());
    };
    if action.ends_with("-select") {
        return handle_tempvoice_select(ctx, comp, pool).await;
    }
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let user_id = comp.user.id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    // Interface-channel guard (mirrors `result.interface?.channelId !==
    // interaction.channelId → deferUpdate` in every temporary_voice_*
    // button): presses from any other text channel are ignored.
    let panel_ch = interface_channel_id(pool, &gid).await;
    if panel_ch.as_deref() != Some(comp.channel_id.get().to_string().as_str()) {
        ack_press(ctx, comp).await;
        return Ok(());
    }
    // Button target: the presser's live voice channel (mirrors
    // `member.voice.channel`), never the interaction text channel.
    // Ownership below is the presser's own row matching that channel
    // (mirrors `getChannelOwner !== targetedChannel?.id → deferUpdate`).
    let Some(target) = presser_voice(ctx, guild_id, comp.user.id) else {
        ack_press(ctx, comp).await;
        return Ok(());
    };
    let target_s = target.get().to_string();
    let temps = load_temps(pool, &gid).await;
    let owned = owned_channel_id(&temps, &user_id).as_deref() == Some(target_s.as_str());
    match action {
        "claim" => {
            // Full claim flow (mirrors temporary_voice_claim_button.ts):
            // the presser's channel must be a temp channel whose
            // recorded owner has left it; the claimer must sit in voice.
            let Some(prev_uid) = temps
                .iter()
                .find(|(_, ch)| *ch == target_s)
                .map(|(u, _)| u.clone())
            else {
                ack_press(ctx, comp).await;
                return Ok(());
            };
            let Ok(prev_num) = prev_uid.parse::<u64>() else {
                ack_press(ctx, comp).await;
                return Ok(());
            };
            // Previous owner still inside their channel: nothing to claim.
            if presser_voice(ctx, guild_id, serenity::UserId::new(prev_num)) == Some(target) {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            // The claimer's own prior channel: refuse while it is still
            // occupied, otherwise delete it and drop the row (mirrors
            // the existingOwnedChannel leg).
            if let Some(prior) = owned_channel_id(&temps, &user_id) {
                if prior != target_s {
                    if let Ok(prior_num) = prior.parse::<u64>() {
                        let prior_ch = serenity::ChannelId::new(prior_num);
                        if fetch_voice_channel(&ctx.http, prior_ch).await.is_some()
                            && voice_occupants(ctx, guild_id, prior_ch) > 0
                        {
                            ack_press(ctx, comp).await;
                            return Ok(());
                        }
                        let _ = prior_ch.delete(&ctx.http).await;
                    }
                    let _ = crate::commands::owner::main::routed_del(
                        pool,
                        &gid,
                        &gid,
                        &format!("CUSTOM_VOICE.{gid}.{user_id}"),
                    )
                    .await;
                }
            }
            // Move the DB key from the previous owner to the claimer.
            let _ = crate::commands::owner::main::routed_del(
                pool,
                &gid,
                &gid,
                &format!("CUSTOM_VOICE.{gid}.{prev_uid}"),
            )
            .await;
            let _ = crate::commands::owner::main::routed_set(
                pool,
                &gid,
                &gid,
                &crate::events::temp_voice_key(guild_id.get(), comp.user.id.get()),
                &target_s,
            )
            .await;
            // Rename for the new owner (`displayName || username`).
            rename_for(
                pool,
                &gid,
                &lang_code,
                &ctx.http,
                target,
                comp.user.display_name(),
            )
            .await;
            // Swap overwrites: the previous owner loses theirs, the
            // claimer gets the full owner set.
            let _ = target
                .delete_permission(
                    &ctx.http,
                    serenity::PermissionOverwriteType::Member(serenity::UserId::new(prev_num)),
                )
                .await;
            let _ = target
                .create_permission(
                    &ctx.http,
                    serenity::PermissionOverwrite {
                        allow: owner_voice_allow(),
                        deny: serenity::Permissions::empty(),
                        kind: serenity::PermissionOverwriteType::Member(comp.user.id),
                    },
                )
                .await;
            // Claim receipt (mirrors the TS new/old-owner embed).
            let embed = claim_transfer_embed(
                &lang_code,
                pool,
                &gid,
                &format!("<@{}>", comp.user.id.get()),
                &format!("<@{prev_uid}>"),
            )
            .await;
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "delete" => {
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let _ = target.delete(&ctx.http).await;
            let _ = crate::commands::owner::main::routed_del(
                pool,
                &gid,
                &gid,
                &format!("CUSTOM_VOICE.{gid}.{user_id}"),
            )
            .await;
            let embed = serenity::CreateEmbed::default()
                .description(
                    crate::lang::get(&lang_code, "temporary_voice_delete_button_desc_embed")
                        .unwrap_or_default(),
                )
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "privacy" => {
            // Privacy menu with the 6 TS options (lock/unlock,
            // invisible/visible, closechat/openchat). Mirrors
            // temporary_voice_privacy_button.ts.
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let opt = |label_key: &str, desc_key: &str, value: &str| {
                serenity::CreateSelectMenuOption::new(
                    crate::lang::get(&lang_code, label_key).unwrap_or_default(),
                    value.to_string(),
                )
                .description(crate::lang::get(&lang_code, desc_key).unwrap_or_default())
            };
            let options = vec![
                opt(
                    "temporary_voice_privacy_menu_lock_label",
                    "temporary_voice_privacy_menu_lock_desc",
                    PRIVACY_LOCK,
                ),
                opt(
                    "temporary_voice_privacy_menu_unlock_label",
                    "temporary_voice_privacy_menu_unlock_desc",
                    PRIVACY_UNLOCK,
                ),
                opt(
                    "temporary_voice_privacy_menu_invisible_label",
                    "temporary_voice_privacy_menu_invisible_desc",
                    PRIVACY_INVISIBLE,
                ),
                opt(
                    "temporary_voice_privacy_menu_visible_label",
                    "temporary_voice_privacy_menu_visible_desc",
                    PRIVACY_VISIBLE,
                ),
                opt(
                    "temporary_voice_privacy_menu_closechat_label",
                    "temporary_voice_privacy_menu_closechat_desc",
                    PRIVACY_CLOSECHAT,
                ),
                opt(
                    "temporary_voice_privacy_menu_openchat_label",
                    "temporary_voice_privacy_menu_openchat_desc",
                    PRIVACY_OPENCHAT,
                ),
            ];
            let menu = serenity::CreateSelectMenu::new(
                TEMPVOICE_PRIVACY_SELECT,
                serenity::CreateSelectMenuKind::String { options },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_privacy_menu_placeholder")
                    .unwrap_or_default(),
            );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "region" => {
            // Region menu with the 14 TS options. Mirrors
            // temporary_voice_region_button.ts (owner gate + menu).
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let options: Vec<serenity::CreateSelectMenuOption> = VOICE_REGIONS
                .iter()
                .map(|(label, value)| {
                    serenity::CreateSelectMenuOption::new(label.to_string(), value.to_string())
                })
                .collect();
            let menu = serenity::CreateSelectMenu::new(
                TEMPVOICE_REGION_SELECT,
                serenity::CreateSelectMenuKind::String { options },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_region_menu_placeholder")
                    .unwrap_or_default(),
            );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "block" | "unblock" => {
            // Block menu: selected members get deny overwrites; unblock
            // shares the shape (mirrors temporary_voice_unblock_button.ts,
            // whose added members get the same deny set while removed ones
            // are cleared, like the block collector).
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let (custom_id, placeholder_key, placeholder_fb) = if action == "block" {
                (
                    TEMPVOICE_BLOCK_SELECT,
                    "temporary_voice_block_button_menu_placeholder",
                    "Selected users will be untrusted to join",
                )
            } else {
                (
                    TEMPVOICE_UNBLOCK_SELECT,
                    "temporary_voice_transfer_unblocked_placeholder",
                    "Selected users will be unblocked to join",
                )
            };
            let menu = serenity::CreateSelectMenu::new(
                custom_id,
                serenity::CreateSelectMenuKind::User {
                    default_users: None,
                },
            )
            .placeholder(
                crate::lang::get(&lang_code, placeholder_key)
                    .unwrap_or_else(|| placeholder_fb.to_string()),
            )
            .min_values(0)
            .max_values(10);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "trust" | "untrust" => {
            // Trust menu: selected members get full allow overwrites;
            // untrust removes them. Mirrors
            // temporary_voice_trust_button.ts (+ untrust variant).
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let custom_id = if action == "trust" {
                TEMPVOICE_TRUST_SELECT
            } else {
                TEMPVOICE_UNTRUST_SELECT
            };
            let menu = serenity::CreateSelectMenu::new(
                custom_id,
                serenity::CreateSelectMenuKind::User {
                    default_users: None,
                },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_transfer_trust_placeholder")
                    .unwrap_or_default(),
            )
            .min_values(0)
            .max_values(10);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "transfer" => {
            // Member picker for the new owner (mirrors the
            // `temporary_voice_transfer_selectmenue` user-select menu;
            // the follow-up runs in handle_tempvoice_select).
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let menu = serenity::CreateSelectMenu::new(
                TEMPVOICE_TRANSFER_SELECT,
                serenity::CreateSelectMenuKind::User {
                    default_users: None,
                },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_transfer_menu_placeholder")
                    .unwrap_or_default(),
            )
            .min_values(1)
            .max_values(1);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "name" | "limit" => {
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            // TS modal bounds: name 2-20, limit 1-20; title/label from
            // lang (no hardcoded strings).
            let (modal_id, label_key, max_len, min_len) = if action == "name" {
                (
                    "tempvoice-name",
                    "temporary_voice_name_button_menu_label",
                    20,
                    2,
                )
            } else {
                (
                    "tempvoice-limit",
                    "temporary_voice_limit_button_menu_label",
                    20,
                    1,
                )
            };
            let modal_title =
                crate::lang::get(&lang_code, "temporary_voice_modal_title").unwrap_or_default();
            let modal_label = crate::lang::get(&lang_code, label_key).unwrap_or_default();
            let mut modal_opts = crate::modal_helper::ModalOptions::new(&modal_title, modal_id);
            modal_opts
                .fields
                .push(crate::modal_helper::ModalField::Text(
                    crate::modal_helper::TextField {
                        custom_id: "value".to_string(),
                        label: modal_label,
                        placeholder: None,
                        style: crate::modal_helper::TextStyle::Short,
                        required: true,
                        max_length: Some(max_len),
                        min_length: Some(min_len),
                        value: None,
                    },
                ));
            let modal = crate::modal_helper::build_modal(&modal_opts)
                .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
            comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) = crate::commands::await_modal_submit(ctx, comp, modal_id).await
            else {
                return Ok(());
            };
            let reply = |embed: serenity::CreateEmbed| {
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                )
            };
            let value = crate::modal_helper::text_value(&submit, "value");
            if action == "name" {
                let raw = value.clone();
                let _ = target
                    .edit(
                        &ctx.http,
                        serenity::EditChannel::new().name(crate::funcs::mask_link(raw.trim())),
                    )
                    .await;
                let emoji = crate::emojis::app_emoji_markup(&ctx.http, "VC_Name")
                    .await
                    .unwrap_or_default();
                let embed = receipt_embed(
                    &lang_code,
                    pool,
                    &gid,
                    "temporary_voice_new_name",
                    format!("{emoji} **{}**", raw.trim()),
                )
                .await;
                let _ = submit.create_response(ctx, reply(embed)).await;
            } else if let Some(limit) = parse_limit(&value) {
                let _ = target
                    .edit(&ctx.http, serenity::EditChannel::new().user_limit(limit))
                    .await;
                let emoji = crate::emojis::app_emoji_markup(&ctx.http, "VC_Limit")
                    .await
                    .unwrap_or_default();
                let embed = receipt_embed(
                    &lang_code,
                    pool,
                    &gid,
                    "temporary_voice_new_userlimit",
                    format!("{emoji} **{}**", value.trim()),
                )
                .await;
                let _ = submit.create_response(ctx, reply(embed)).await;
            } else {
                // `if (!userLimit)` reject (0 / not a number), like TS.
                let tpl = crate::lang::get(&lang_code, "temporary_voice_limit_button_not_integer")
                    .unwrap_or_default();
                let no = crate::emojis::app_emoji_markup(&ctx.http, "No")
                    .await
                    .unwrap_or_default();
                let content = tpl.replace("${interaction.client.iHorizon_Emojis.No}", &no);
                let _ = submit
                    .create_response(
                        ctx,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(content)
                                .ephemeral(true),
                        ),
                    )
                    .await;
            }
        }
        _ => {}
    }
    Ok(())
}

/// Follow-up select menus posted by the block/trust/untrust/privacy
/// buttons. Mirrors the TS message collectors in
/// temporary_voice_{block,trust,privacy}_button.ts (owner gate +
/// overwrite sync + summary embed).
pub async fn handle_tempvoice_select(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let self_id = comp.user.id.get().to_string();
    // Select target: the presser's live voice channel (mirrors
    // `member.voice.channel`), never the interaction text channel.
    // Ownership is the presser's own row matching that channel.
    let Some(voice_id) = presser_voice(ctx, guild_id, comp.user.id) else {
        ack_press(ctx, comp).await;
        return Ok(());
    };
    let temps = load_temps(pool, &gid).await;
    if owned_channel_id(&temps, &self_id).as_deref() != Some(voice_id.get().to_string().as_str()) {
        ack_press(ctx, comp).await;
        return Ok(());
    }
    let target_s = voice_id.get().to_string();
    let current: Vec<String> = match voice_id.to_channel(&ctx.http).await {
        Ok(serenity::Channel::Guild(gc)) => gc
            .permission_overwrites
            .iter()
            .filter_map(|o| match o.kind {
                serenity::PermissionOverwriteType::Member(uid) => Some(uid.get().to_string()),
                _ => None,
            })
            .collect(),
        _ => vec![],
    };
    let no_one = crate::lang::get(&lang_code, "temporary_voice_no_one").unwrap_or_default();
    let list = |ids: &[String]| {
        if ids.is_empty() {
            no_one.clone()
        } else {
            ids.iter()
                .map(|id| format!("<@{id}>"))
                .collect::<Vec<_>>()
                .join(" ")
        }
    };
    match comp.data.custom_id.as_str() {
        TEMPVOICE_TRUST_SELECT
        | TEMPVOICE_UNTRUST_SELECT
        | TEMPVOICE_BLOCK_SELECT
        | TEMPVOICE_UNBLOCK_SELECT => {
            let selected: Vec<String> = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::UserSelect { values } => {
                    values.iter().map(|u| u.get().to_string()).collect()
                }
                _ => vec![],
            };
            let (added, removed) = sync_members(&selected, &current, &self_id);
            for id in &removed {
                if let Ok(uid) = id.parse::<u64>() {
                    let _ = voice_id
                        .delete_permission(
                            &ctx.http,
                            serenity::PermissionOverwriteType::Member(serenity::UserId::new(uid)),
                        )
                        .await;
                }
            }
            let is_block = matches!(
                comp.data.custom_id.as_str(),
                TEMPVOICE_BLOCK_SELECT | TEMPVOICE_UNBLOCK_SELECT
            );
            for id in &added {
                if let Ok(uid) = id.parse::<u64>() {
                    let (allow, deny) = if is_block {
                        (
                            serenity::Permissions::VIEW_CHANNEL,
                            serenity::Permissions::SEND_MESSAGES
                                | serenity::Permissions::ADD_REACTIONS
                                | serenity::Permissions::CONNECT
                                | serenity::Permissions::SPEAK,
                        )
                    } else {
                        (
                            serenity::Permissions::VIEW_CHANNEL
                                | serenity::Permissions::CONNECT
                                | serenity::Permissions::SPEAK
                                | serenity::Permissions::STREAM
                                | serenity::Permissions::SEND_MESSAGES
                                | serenity::Permissions::READ_MESSAGE_HISTORY
                                | serenity::Permissions::ATTACH_FILES
                                | serenity::Permissions::USE_APPLICATION_COMMANDS,
                            serenity::Permissions::empty(),
                        )
                    };
                    let _ = voice_id
                        .create_permission(
                            &ctx.http,
                            serenity::PermissionOverwrite {
                                allow,
                                deny,
                                kind: serenity::PermissionOverwriteType::Member(
                                    serenity::UserId::new(uid),
                                ),
                            },
                        )
                        .await;
                }
            }
            // Field mapping mirrors the TS summary embeds verbatim
            // (block: added -> unblocked field, removed -> blocked field).
            let title =
                crate::lang::get(&lang_code, "temporary_voice_title_embec").unwrap_or_default();
            let (first_key, second_key) = if is_block {
                (
                    "temporary_voice_unblocked_member",
                    "temporary_voice_blocked_mmeber",
                )
            } else {
                (
                    "temporary_voice_untrusted_member",
                    "temporary_voice_trusted_member",
                )
            };
            let (first_val, second_val) = if is_block {
                (list(&added), list(&removed))
            } else {
                (list(&removed), list(&added))
            };
            let embed = serenity::CreateEmbed::default()
                .description(title)
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await)
                .field(
                    crate::lang::get(&lang_code, first_key).unwrap_or_default(),
                    first_val,
                    false,
                )
                .field(
                    crate::lang::get(&lang_code, second_key).unwrap_or_default(),
                    second_val,
                    false,
                );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        TEMPVOICE_PRIVACY_SELECT => {
            let value = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned().unwrap_or_default()
                }
                _ => String::new(),
            };
            let Some((allow_bits, deny_bits)) = privacy_rule(&value) else {
                return Ok(());
            };
            let allow = serenity::Permissions::from_bits_truncate(allow_bits);
            let deny = serenity::Permissions::from_bits_truncate(deny_bits);
            let _ = voice_id
                .create_permission(
                    &ctx.http,
                    serenity::PermissionOverwrite {
                        allow,
                        deny,
                        kind: serenity::PermissionOverwriteType::Role(serenity::RoleId::new(
                            guild_id.get(),
                        )),
                    },
                )
                .await;
            let label_key = match value.as_str() {
                PRIVACY_LOCK => "temporary_voice_privacy_menu_lock_label",
                PRIVACY_UNLOCK => "temporary_voice_privacy_menu_unlock_label",
                PRIVACY_INVISIBLE => "temporary_voice_privacy_menu_invisible_label",
                PRIVACY_VISIBLE => "temporary_voice_privacy_menu_visible_label",
                PRIVACY_CLOSECHAT => "temporary_voice_privacy_menu_closechat_label",
                _ => "temporary_voice_privacy_menu_openchat_label",
            };
            let embed = serenity::CreateEmbed::default()
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await)
                .field(
                    crate::lang::get(&lang_code, label_key).unwrap_or_default(),
                    "Yes",
                    true,
                );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        TEMPVOICE_REGION_SELECT => {
            // Apply the picked RTC region to the owner's temp channel.
            // Mirrors the starter-menu collector (setRTCRegion + summary).
            let value = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned().unwrap_or_default()
                }
                _ => String::new(),
            };
            if !VOICE_REGIONS.iter().any(|(_, v)| *v == value) {
                return Ok(());
            }
            let target = voice_id;
            let _ = target
                .edit(
                    &ctx.http,
                    serenity::EditChannel::new().voice_region(Some(value.clone())),
                )
                .await;
            let region_emoji = crate::emojis::app_emoji_markup(&ctx.http, "VC_Region")
                .await
                .unwrap_or_default();
            let embed = serenity::CreateEmbed::default()
                .description(
                    crate::lang::get(&lang_code, "temporary_voice_title_embec").unwrap_or_default(),
                )
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await)
                .field(
                    crate::lang::get(&lang_code, "temporary_voice_new_region").unwrap_or_default(),
                    format!("{region_emoji} **{value}**"),
                    true,
                );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        TEMPVOICE_TRANSFER_SELECT => {
            // New-owner picker follow-up (mirrors the
            // `temporary_voice_transfer_selectmenue` collector): the
            // picked member must sit in the owner's channel; their own
            // prior channel is refused while occupied, else deleted;
            // then the DB key moves, the channel is renamed and the
            // overwrites swap from the old owner to the new one.
            let new_owner: Option<u64> = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::UserSelect { values } => {
                    values.first().map(|u| u.get())
                }
                _ => None,
            };
            let Some(new_owner) = new_owner else {
                ack_press(ctx, comp).await;
                return Ok(());
            };
            if presser_voice(ctx, guild_id, serenity::UserId::new(new_owner)) != Some(voice_id) {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let new_owner_s = new_owner.to_string();
            if let Some(prior) = owned_channel_id(&temps, &new_owner_s) {
                if prior != target_s {
                    if let Ok(prior_num) = prior.parse::<u64>() {
                        let prior_ch = serenity::ChannelId::new(prior_num);
                        if fetch_voice_channel(&ctx.http, prior_ch).await.is_some()
                            && voice_occupants(ctx, guild_id, prior_ch) > 0
                        {
                            ack_press(ctx, comp).await;
                            return Ok(());
                        }
                        let _ = prior_ch.delete(&ctx.http).await;
                    }
                    let _ = crate::commands::owner::main::routed_del(
                        pool,
                        &gid,
                        &gid,
                        &format!("CUSTOM_VOICE.{gid}.{new_owner_s}"),
                    )
                    .await;
                }
            }
            // Move the DB key from the old owner to the new one.
            let _ = crate::commands::owner::main::routed_del(
                pool,
                &gid,
                &gid,
                &format!("CUSTOM_VOICE.{gid}.{self_id}"),
            )
            .await;
            let _ = crate::commands::owner::main::routed_set(
                pool,
                &gid,
                &gid,
                &crate::events::temp_voice_key(guild_id.get(), new_owner),
                &target_s,
            )
            .await;
            // Rename for the new owner (`displayName || username`).
            if let Ok(user) = serenity::UserId::new(new_owner).to_user(&ctx.http).await {
                rename_for(
                    pool,
                    &gid,
                    &lang_code,
                    &ctx.http,
                    voice_id,
                    user.display_name(),
                )
                .await;
            }
            // Swap overwrites: the old owner loses theirs, the new
            // owner gets the full owner set.
            let _ = voice_id
                .delete_permission(
                    &ctx.http,
                    serenity::PermissionOverwriteType::Member(comp.user.id),
                )
                .await;
            let _ = voice_id
                .create_permission(
                    &ctx.http,
                    serenity::PermissionOverwrite {
                        allow: owner_voice_allow(),
                        deny: serenity::Permissions::empty(),
                        kind: serenity::PermissionOverwriteType::Member(serenity::UserId::new(
                            new_owner,
                        )),
                    },
                )
                .await;
            let embed = claim_transfer_embed(
                &lang_code,
                pool,
                &gid,
                &format!("<@{new_owner}>"),
                &format!("<@{}>", comp.user.id.get()),
            )
            .await;
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        _ => {}
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn temp_owner_and_limit() {
        let entries = vec![("1".to_string(), "9".to_string())];
        assert!(is_temp_owner(&entries, "9", "1"));
        assert!(!is_temp_owner(&entries, "9", "2"));
        assert_eq!(owned_channel_id(&entries, "1").as_deref(), Some("9"));
        assert_eq!(owned_channel_id(&entries, "2"), None);
        assert_eq!(parse_limit("5"), Some(5));
        // No upper clamp (TS parseInt); 0 and non-numbers reject.
        assert_eq!(parse_limit("500"), Some(500));
        assert_eq!(parse_limit("0"), None);
        assert_eq!(parse_limit("x"), None);
    }

    #[test]
    fn temp_name_renders_username_slot_or_appends() {
        assert_eq!(render_temp_name("{Username}'s room", "Ada"), "Ada's room");
        assert_eq!(render_temp_name("Lounge", "Ada"), "Lounge Ada");
        assert_eq!(render_temp_name("{user}", "Ada"), "{user} Ada");
    }

    #[test]
    fn interface_channel_parses_object_and_legacy_string() {
        assert_eq!(
            parse_interface_channel(r#"{"channelId":"12","messageId":"34"}"#).as_deref(),
            Some("12")
        );
        assert_eq!(parse_interface_channel("  12  ").as_deref(), Some("12"));
        assert_eq!(parse_interface_channel(r#""12""#).as_deref(), Some("12"));
        assert_eq!(parse_interface_channel(""), None);
        assert_eq!(parse_interface_channel("{}"), None);
        assert_eq!(parse_interface_channel(r#"{"channelId":""}"#), None);
    }

    #[test]
    fn owner_allow_covers_ts_owner_set() {
        type P = super::serenity::Permissions;
        let allow = owner_voice_allow();
        for flag in [
            P::VIEW_CHANNEL,
            P::CONNECT,
            P::STREAM,
            P::SPEAK,
            P::SEND_MESSAGES,
            P::USE_APPLICATION_COMMANDS,
            P::ATTACH_FILES,
            P::ADD_REACTIONS,
        ] {
            assert!(allow.contains(flag));
        }
        // No moderation rights (unlike the staff set).
        assert!(!allow.contains(P::MUTE_MEMBERS));
        assert!(!allow.contains(P::KICK_MEMBERS));
    }

    #[test]
    fn key_shapes() {
        assert_eq!(vd_key("voice_channel"), "VOICE_INTERFACE.voice_channel");
        assert_eq!(vd_key("interface"), "VOICE_INTERFACE.interface");
        assert_eq!(
            vd_key("voice_channel_category"),
            "VOICE_INTERFACE.voice_channel_category"
        );
        assert_eq!(
            vd_key("voice_channel_name"),
            "VOICE_INTERFACE.voice_channel_name"
        );
        assert_eq!(
            vd_key("voice_channel_position"),
            "VOICE_INTERFACE.voice_channel_position"
        );
        assert_eq!(vd_key("staff_role"), "VOICE_INTERFACE.staff_role");
    }

    #[test]
    fn position_choice_covers_ts_choices_only() {
        use poise::ChoiceParameter as _;
        assert_eq!(PositionChoice::from_name("top"), Some(PositionChoice::Top));
        assert_eq!(
            PositionChoice::from_name("BOTTOM"),
            Some(PositionChoice::Bottom)
        );
        assert_eq!(PositionChoice::from_name("up"), None);
        assert_eq!(PositionChoice::from_name(""), None);
        assert_eq!(PositionChoice::Top.as_str(), "top");
        assert_eq!(PositionChoice::Bottom.as_str(), "bottom");
        let names: Vec<_> = PositionChoice::list().into_iter().map(|c| c.name).collect();
        assert_eq!(
            names,
            vec!["Up (TOP)".to_string(), "Down (Bottom)".to_string()]
        );
    }

    #[test]
    fn sync_members_diffs_and_keeps_self() {
        let sel = vec!["1".to_string(), "2".to_string()];
        let cur = vec!["2".to_string(), "3".to_string(), "9".to_string()];
        let (added, removed) = sync_members(&sel, &cur, "9");
        assert_eq!(added, vec!["1".to_string()]);
        assert_eq!(removed, vec!["3".to_string()]);
    }

    #[test]
    fn privacy_rules_cover_all_six_options() {
        type P = super::serenity::Permissions;
        let voice = (P::CONNECT | P::STREAM | P::SPEAK).bits();
        let chat = (P::SEND_MESSAGES | P::ADD_REACTIONS | P::USE_APPLICATION_COMMANDS).bits();
        assert_eq!(privacy_rule(PRIVACY_LOCK), Some((0, voice)));
        assert_eq!(privacy_rule(PRIVACY_UNLOCK), Some((voice, 0)));
        assert_eq!(
            privacy_rule(PRIVACY_INVISIBLE),
            Some((0, P::VIEW_CHANNEL.bits()))
        );
        assert_eq!(
            privacy_rule(PRIVACY_VISIBLE),
            Some((P::VIEW_CHANNEL.bits(), 0))
        );
        assert_eq!(privacy_rule(PRIVACY_CLOSECHAT), Some((0, chat)));
        assert_eq!(privacy_rule(PRIVACY_OPENCHAT), Some((chat, 0)));
        assert_eq!(privacy_rule("bogus"), None);
    }

    #[test]
    fn region_options_match_ts_starter_menu() {
        assert_eq!(VOICE_REGIONS.len(), 14);
        let mut values: Vec<&str> = VOICE_REGIONS.iter().map(|(_, v)| *v).collect();
        values.sort_unstable();
        values.dedup();
        assert_eq!(values.len(), 14);
        assert!(VOICE_REGIONS.contains(&("Japan/Tokyo", "japan")));
        assert!(VOICE_REGIONS.contains(&("Brazil", "brazil")));
    }

    #[test]
    fn staff_roles_parse_json_array_and_legacy_string() {
        assert!(parse_staff_roles(None).is_empty());
        assert!(parse_staff_roles(Some("")).is_empty());
        assert!(parse_staff_roles(Some("   ")).is_empty());
        assert_eq!(parse_staff_roles(Some("[]")), Vec::<String>::new());
        assert_eq!(
            parse_staff_roles(Some("[\"1\",\"2\"]")),
            vec!["1".to_string(), "2".to_string()]
        );
        // Legacy TS shape: bare role-id string wraps to one element.
        assert_eq!(parse_staff_roles(Some("123")), vec!["123".to_string()]);
        assert_eq!(parse_staff_roles(Some("  123  ")), vec!["123".to_string()]);
        // Round-trip of what the save button persists.
        let saved = serde_json::to_string(&vec!["7".to_string()]).unwrap();
        assert_eq!(parse_staff_roles(Some(&saved)), vec!["7".to_string()]);
    }

    #[test]
    fn staff_roles_value_mentions_like_ts() {
        assert_eq!(staff_roles_value(&[]), "");
        assert_eq!(
            staff_roles_value(&["1".to_string(), "2".to_string()]),
            "<@&1>, <@&2>"
        );
    }

    #[test]
    fn panel_fields_match_ts_embed() {
        // 15 fields: 11 emoji values + 4 spacers, TS addFields order.
        assert_eq!(PANEL_FIELDS.len(), 15);
        let spacers: Vec<usize> = PANEL_FIELDS
            .iter()
            .enumerate()
            .filter_map(|(i, f)| f.is_none().then_some(i))
            .collect();
        assert_eq!(spacers, vec![4, 7, 12, 14]);
        let keys: Vec<&str> = PANEL_FIELDS
            .iter()
            .filter_map(|f| f.as_ref().map(|slot| slot.0))
            .collect();
        assert_eq!(
            keys,
            vec![
                "tempvoice_if_text_fields_value_limit",
                "tempvoice_if_text_fields_value_name",
                "tempvoice_if_text_fields_value_region",
                "tempvoice_if_text_fields_value_trust",
                "tempvoice_if_text_fields_value_untrust",
                "tempvoice_if_text_fields_value_block",
                "tempvoice_if_text_fields_value_unblock",
                "tempvoice_if_text_fields_value_claim",
                "tempvoice_if_text_fields_value_privacy",
                "tempvoice_if_text_fields_value_transfer",
                "tempvoice_if_text_fields_value_delete",
            ]
        );
    }

    #[test]
    fn panel_field_renders_emoji_slot_like_ts() {
        let out = render_panel_field(
            "${client.iHorizon_Emojis.VC_Limit} **Change limit**",
            "VC_Limit",
            "<:VC_Limit:9>",
        );
        assert_eq!(out, "<:VC_Limit:9> **Change limit**");
        // Cold emoji cache leaves the template text (region handler
        // already tolerates empty markup the same way).
        let out = render_panel_field(
            "${client.iHorizon_Emojis.VC_Limit} **Change limit**",
            "VC_Limit",
            "",
        );
        assert_eq!(out, " **Change limit**");
    }

    #[test]
    fn panel_buttons_cover_all_ts_actions() {
        // 11 actions incl. unblock, unique, chunked 5/5/1 like TS rows.
        assert_eq!(PANEL_BUTTONS.len(), 11);
        // Declaration order mirrors the TS buttonRows (row1 limit →
        // region, row2 trust → untrust, row3 delete).
        let order: Vec<&str> = PANEL_BUTTONS.iter().map(|(a, _, _)| *a).collect();
        assert_eq!(
            order,
            vec![
                "limit", "name", "claim", "privacy", "region", "trust", "block", "transfer",
                "unblock", "untrust", "delete"
            ]
        );
        let mut actions: Vec<&str> = PANEL_BUTTONS.iter().map(|(a, _, _)| *a).collect();
        actions.sort_unstable();
        let mut deduped = actions.clone();
        deduped.dedup();
        assert_eq!(actions, deduped);
        assert!(PANEL_BUTTONS.contains(&("unblock", "Unblock", "VC_Unblock")));
        assert_eq!(PANEL_BUTTONS.chunks(5).count(), 3);
        // Sync builder (in-channel controls) exposes the same 11.
        let rows = tempvoice_buttons();
        assert_eq!(rows.len(), 3);
        assert_eq!(panel_button_style("block"), serenity::ButtonStyle::Danger);
        assert_eq!(panel_button_style("claim"), serenity::ButtonStyle::Success);
        assert_eq!(panel_button_style("trust"), serenity::ButtonStyle::Primary);
        assert_eq!(
            panel_button_style("unblock"),
            serenity::ButtonStyle::Secondary
        );
    }
    #[test]
    fn temp_sweep_parses_and_decides_like_ts() {
        // Malformed rows (TS `typeof !== "string"` guard) -> drop key.
        assert_eq!(parse_temp_channel_id("123"), Some(123));
        assert_eq!(parse_temp_channel_id("  123 "), Some(123));
        assert_eq!(parse_temp_channel_id(""), None);
        assert_eq!(parse_temp_channel_id("abc"), None);
        assert_eq!(parse_temp_channel_id("0"), None);
        // Gone channel -> drop key without delete call.
        assert_eq!(temp_sweep_action(false, false), TempSweep::CleanupKey);
        assert_eq!(temp_sweep_action(false, true), TempSweep::CleanupKey);
        // Existing but memberless -> delete + drop.
        assert_eq!(temp_sweep_action(true, false), TempSweep::DeleteChannel);
        // Occupied -> keep.
        assert_eq!(temp_sweep_action(true, true), TempSweep::Keep);
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn temps_table_routing_with_legacy_fallback() {
        use crate::commands::owner::main as routed;
        let pool = memory_pool().await;
        // Routed write dual-writes; the union scan sees it.
        routed::routed_set(&pool, "g", "g", "CUSTOM_VOICE.g.5", "111")
            .await
            .unwrap();
        assert_eq!(
            load_temps(&pool, "g").await,
            vec![("5".to_string(), "111".to_string())]
        );
        // Legacy-only row merges in.
        crate::db::kv_set(&pool, "g", "CUSTOM_VOICE.g.7", "222")
            .await
            .unwrap();
        assert_eq!(load_temps(&pool, "g").await.len(), 2);
        // Table wins over a stale legacy row for the same user.
        crate::db::kv_set(&pool, "g", "CUSTOM_VOICE.g.5", "999")
            .await
            .unwrap();
        assert_eq!(
            load_temps(&pool, "g").await,
            vec![
                ("5".to_string(), "111".to_string()),
                ("7".to_string(), "222".to_string()),
            ]
        );
        // Delete clears both stores.
        assert!(routed::routed_del(&pool, "g", "g", "CUSTOM_VOICE.g.5")
            .await
            .unwrap());
        assert_eq!(
            load_temps(&pool, "g").await,
            vec![("7".to_string(), "222".to_string())]
        );
    }
}

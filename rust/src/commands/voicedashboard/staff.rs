use super::*;
use crate::commands::moderation::banlist::deny_foreign_press;

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

/// Set an role for bypassing TempChannel's permission
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-staff-role",
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définir un rôle pour contourner l'autorisation des canaux temporaires"
    ),
    description_localized("ja", "TempChannelの権限をバイパスするロールを設定"),
    description_localized("ru", "Установить роль для обхода прав TempChannel"),
    description_localized("es-ES", "Establecer un rol para omitir los permisos de TempChannel")
)]
pub async fn vd_staff(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
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
    let field_name = t(
        "setjoinroles_help_embed_fields_1_name",
        "All registered roles",
    );
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
            // DB write + log-channel fetch/send + emoji lookup before
            // the first response: ack first (TS deferUpdate) so the
            // save never blows the 3s window, then edit afterwards.
            let _ = press
                .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let raw = serde_json::to_string(&final_ids).unwrap_or_else(|_| "[]".to_string());
            crate::commands::owner::main::routed_set(pool, &gid, &gid, &vd_key("staff_role"), &raw)
                .await?;
            // Config log, like `client.func.ihorizon_logs` in
            // !set-staff-role.ts (best-effort).
            let log_title = t(
                "setjoinroles_logs_embed_title_on_enable",
                "SetJoinRoles Logs",
            );
            let log_desc = t(
                "setjoinroles_logs_embed_description_on_enable",
                "<@${interaction.user.id}> set the join roles!",
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
                .edit_response(
                    ctx.http(),
                    serenity::EditInteractionResponse::new()
                        .embed(mk_embed(&final_ids))
                        .components(vec![save_row(done)]),
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

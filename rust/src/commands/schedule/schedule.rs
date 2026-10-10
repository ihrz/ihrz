use super::panel::schedule_panel;
use super::*;

/// Guided panel (TS `schedule.ts` parity, layered over the subcommands).
/// Menu collector `time: 420_000`, delete / delete-all / when prompts
/// `time: 120_000`; the menu is disabled when the collector ends.
/// Guided panel menu id for new menus. TS `schedule.ts:77` uses the bare
/// `"starter"`; the port namespaces its own menus so concurrent categories
/// never collide on one custom id.
pub const GUIDED_MENU_ID: &str = "schedule_starter";
/// Legacy TS menu id (`schedule.ts:77` `.setCustomId("starter")`).
/// Accepted alongside `GUIDED_MENU_ID` so select menus sent by the TS
/// bot still route while both bots run (S2 compat).
pub const GUIDED_MENU_ID_LEGACY: &str = "starter";

/// True for either menu id we route (namespaced or legacy TS).
pub fn is_guided_menu_id(id: &str) -> bool {
    id == GUIDED_MENU_ID || id == GUIDED_MENU_ID_LEGACY
}
pub const GUIDED_MENU_TIMEOUT_SECS: u64 = 420;
pub const GUIDED_PROMPT_TIMEOUT_SECS: u64 = 120;
pub const GUIDED_CREATE_MODAL_ID: &str = "schedule_create_modal";
pub const GUIDED_DELETE_MODAL_ID: &str = "schedule_delete_modal";
pub const GUIDED_DELETE_ALL_YES_ID: &str = "schedule_delete_all_yes";
pub const GUIDED_DELETE_ALL_NO_ID: &str = "schedule_delete_all_no";
pub const GUIDED_FIELD_NAME: &str = "name";
pub const GUIDED_FIELD_DESC: &str = "desc";
pub const GUIDED_FIELD_WHEN: &str = "when";
pub const GUIDED_FIELD_CODE: &str = "code";

/// Discord caps modal input labels at 45 chars; longer lang strings
/// (e.g. `schedule_delete_question`) are truncated, never dropped.
pub const MODAL_LABEL_CHARS: usize = 45;

pub fn modal_label(s: &str) -> String {
    s.chars().take(MODAL_LABEL_CHARS).collect()
}

/// Menu choices in TS declaration order (values "0".."3").
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GuidedChoice {
    Create,
    Delete,
    DeleteAll,
    List,
}

pub fn guided_choice_of(value: &str) -> Option<GuidedChoice> {
    match value {
        "0" => Some(GuidedChoice::Create),
        "1" => Some(GuidedChoice::Delete),
        "2" => Some(GuidedChoice::DeleteAll),
        "3" => Some(GuidedChoice::List),
        _ => None,
    }
}

/// (value, emoji) pairs mirroring the TS select options
/// (create, delete, delete-all, list).
pub fn guided_menu_values() -> [(&'static str, &'static str); 4] {
    [("0", "📝"), ("1", "🗑️"), ("2", "⚠️"), ("3", "📜")]
}

pub fn guided_menu(
    placeholder: &str,
    labels: [&str; 4],
) -> poise::serenity_prelude::CreateSelectMenu {
    use poise::serenity_prelude as serenity;
    let options = guided_menu_values()
        .iter()
        .zip(labels)
        .map(|((value, emoji), label)| {
            serenity::CreateSelectMenuOption::new(label.to_string(), value.to_string())
                .emoji(serenity::ReactionType::Unicode(emoji.to_string()))
        })
        .collect();
    serenity::CreateSelectMenu::new(
        GUIDED_MENU_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(placeholder.to_string())
}

/// Create modal options. Bounds mirror the TS modal (name 5..30,
/// desc 10..400); `when` folds the duration question TS asks through
/// a follow-up message collector into the modal so the whole flow
/// stays inside component interactions.
pub fn create_modal_opts(
    title: &str,
    name_label: &str,
    desc_label: &str,
    when_label: &str,
) -> crate::modal_helper::ModalOptions {
    use crate::modal_helper::{ModalField, ModalOptions, TextField, TextStyle};
    let mut opts = ModalOptions::new(title, GUIDED_CREATE_MODAL_ID);
    opts.defer_update = false;
    opts.fields.push(ModalField::Text(TextField {
        custom_id: GUIDED_FIELD_NAME.to_string(),
        label: modal_label(name_label),
        placeholder: None,
        style: TextStyle::Short,
        required: true,
        max_length: Some(30),
        min_length: Some(5),
        value: None,
    }));
    opts.fields.push(ModalField::Text(TextField {
        custom_id: GUIDED_FIELD_DESC.to_string(),
        label: modal_label(desc_label),
        placeholder: None,
        style: TextStyle::Paragraph,
        required: true,
        max_length: Some(400),
        min_length: Some(10),
        value: None,
    }));
    opts.fields.push(ModalField::Text(TextField {
        custom_id: GUIDED_FIELD_WHEN.to_string(),
        label: modal_label(when_label),
        placeholder: Some("10s, 5m, 2h, 7d".to_string()),
        style: TextStyle::Short,
        required: true,
        max_length: Some(32),
        min_length: Some(1),
        value: None,
    }));
    opts
}

/// Delete modal options: single schedule-code input, mirroring the TS
/// `schedule_delete_question` message-collector prompt.
pub fn delete_modal_opts(title: &str, code_label: &str) -> crate::modal_helper::ModalOptions {
    use crate::modal_helper::{ModalField, ModalOptions, TextField, TextStyle};
    let mut opts = ModalOptions::new(title, GUIDED_DELETE_MODAL_ID);
    opts.defer_update = false;
    opts.fields.push(ModalField::Text(TextField {
        custom_id: GUIDED_FIELD_CODE.to_string(),
        label: modal_label(code_label),
        placeholder: None,
        style: TextStyle::Short,
        required: true,
        max_length: Some(32),
        min_length: Some(1),
        value: None,
    }));
    opts
}

/// Delete-all confirm buttons. Mirrors the TS `(Y/n)` message
/// collector (`y`/`yes` deletes, anything else cancels).
pub fn delete_all_confirm_row(
    yes_label: &str,
    no_label: &str,
) -> poise::serenity_prelude::CreateActionRow {
    use poise::serenity_prelude as serenity;
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(GUIDED_DELETE_ALL_YES_ID)
            .style(serenity::ButtonStyle::Danger)
            .label(yes_label.to_string()),
        serenity::CreateButton::new(GUIDED_DELETE_ALL_NO_ID)
            .style(serenity::ButtonStyle::Success)
            .label(no_label.to_string()),
    ])
}

/// Author display name (`globalName || username`, schedule.ts:255).
pub fn guided_author_name(user: &poise::serenity_prelude::User) -> String {
    user.global_name
        .clone()
        .unwrap_or_else(|| user.name.clone())
}

/// Author icon + guild thumbnail snapshots for the guided embeds.
/// Mirrors schedule.ts `displayAvatarURL({extension:"png",size:512})`
/// author icons (__1/__2/__3/preview) and `guild.iconURL()`
/// thumbnails (__1/preview): both go out as attachment files
/// (`user_icon.png`, `guild_icon.png`), never raw CDN URLs (which rot
/// to "media lost"). A failed download drops the reference instead of
/// rendering a dangling attachment.
pub(crate) async fn guided_identity_parts(
    ctx: &Ctx<'_>,
    user: &poise::serenity_prelude::User,
) -> (String, Option<Vec<u8>>, Option<Vec<u8>>) {
    let name = guided_author_name(user);
    let icon = crate::commands::shared::download_bytes(&user.face()).await;
    let thumb = match ctx.guild().and_then(|g| g.icon_url()) {
        Some(url) => crate::commands::shared::download_bytes(&url).await,
        None => None,
    };
    (name, icon, thumb)
}

/// Apply the guided author block (+ optional guild thumbnail) to an
/// embed. Icon/thumbnail point at the `user_icon.png` /
/// `guild_icon.png` snapshot files; callers attach the bytes they
/// have and pass `false` for the ones they don't.
pub(crate) fn guided_embed_identity(
    embed: poise::serenity_prelude::CreateEmbed,
    author_name: &str,
    with_user_icon: bool,
    with_guild_thumb: bool,
) -> poise::serenity_prelude::CreateEmbed {
    use poise::serenity_prelude as serenity;
    let author = serenity::CreateEmbedAuthor::new(author_name.to_string());
    let embed = embed.author(if with_user_icon {
        author.icon_url("attachment://user_icon.png")
    } else {
        author
    });
    if with_guild_thumb {
        embed.thumbnail("attachment://guild_icon.png")
    } else {
        embed
    }
}

/// Group root for the schedule category (TS `schedule.ts`).
// TS defines a single option-less command that always renders the
// select-menu panel (`schedule.ts:48-66`), so a bare invocation runs
// the panel here too: without `subcommand_required` poise falls
// through to this body when no leaf is given, on both the slash and
// prefix paths. The leaves stay for direct access
// (`/schedule list`, `!schedule delete …`).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "schedule",
    category = "schedule",
    subcommands(
        "schedule_create",
        "schedule_delete",
        "schedule_delete_all",
        "schedule_list",
        "schedule_panel"
    )
)]
pub async fn schedule(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    super::panel::run_schedule_panel(ctx).await
}

/// Guided create: modal (name/desc/when) then the same validation +
/// confirm rendering as `schedule_create`. The result goes to an
/// ephemeral follow-up so the panel stays usable until it times out.
pub(crate) async fn guided_create(
    ctx: &Ctx<'_>,
    press: &poise::serenity_prelude::ComponentInteraction,
    lang_code: &str,
    author_mention: &str,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let t = |k: &str, fb: &str| crate::lang::get(lang_code, k).unwrap_or_else(|| fb.to_string());
    let opts = create_modal_opts(
        &t("schedule_modal_title", "Schedule Manager"),
        &t("schedule_modal_fields_1_label", "The Schedule name?"),
        &t("schedule_modal_fields_2_label", "The Schedule description?"),
        "When? (e.g. 10s, 5m, 2h, 7d)",
    );
    let modal = crate::modal_helper::build_modal(&opts)
        .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
    press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::Modal(modal),
        )
        .await?;
    let Some(submit) =
        crate::commands::await_modal_submit(ctx.serenity_context(), press, GUIDED_CREATE_MODAL_ID)
            .await
    else {
        return Ok(());
    };
    let name = crate::modal_helper::text_value(&submit, GUIDED_FIELD_NAME);
    let desc = crate::modal_helper::text_value(&submit, GUIDED_FIELD_DESC);
    let when = crate::modal_helper::text_value(&submit, GUIDED_FIELD_WHEN);
    let _ = submit
        .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let mut followup = serenity::CreateInteractionResponseFollowup::new().ephemeral(true);
    // Validation mirrors `schedule_create` (Discord already enforces
    // the modal min/max lengths; these cover prefix-style bypasses).
    if !validate_title(&name) {
        followup = followup.content(t(
            "msg_title_must_be_5_30_characters",
            "Title must be 5-30 characters.",
        ));
        let _ = submit.create_followup(ctx.http(), followup).await;
        return Ok(());
    }
    if !validate_description(&desc) {
        followup = followup.content(t(
            "msg_description_must_be_10_400_characters",
            "Description must be 10-400 characters.",
        ));
        let _ = submit.create_followup(ctx.http(), followup).await;
        return Ok(());
    }
    // Verdict on `"0s"`: `parse_duration_ms` (shared.rs, out of scope
    // here) returns None for zero/negative spans, so this answers
    // `schedule_create_not_number_time`. TS `to_ms("0s")` yields 0,
    // which passes the NaN-only guard (schedule.ts:451) and would
    // create an immediately-expiring schedule — kept as a deliberate
    // divergence (a zero-delay schedule is nonsense), documented here.
    let Some(delta_ms) = parse_duration_ms(&when) else {
        followup = followup.content(
            t(
                "schedule_create_not_number_time",
                "${interaction.user}, your response (the time you want to be notified about this schedule) is not a number!",
            )
            .replace("${interaction.user}", author_mention),
        );
        let _ = submit.create_followup(ctx.http(), followup).await;
        return Ok(());
    };
    let code = gen_code();
    let entry = ScheduleEntry {
        code: code.clone(),
        title: name,
        description: desc,
        expires_at_ms: expiry_at_ms(now_ms(), delta_ms),
    };
    let gid = scope_guild(ctx);
    let user_id = ctx.author().id.get();
    save_entry_routed(&ctx.data().pool, &gid, &entry, user_id).await?;
    let preview = render_create_preview_description(&entry.title, &entry.description);
    let confirm_title = render_create_confirm_title(
        &t(
            "schedule_create_embed_title_confirm",
            "#${scheduleCode} Schedule Created!",
        ),
        &code,
    );
    let field_name = t("schedule_create_embed_fields_name_confirm", "Notified Date");
    let content = render_create_confirm_msg(
        &t(
            "schedule_create_confirm_msg",
            "${interaction.user}, your schedule has been created!\nCode: `${scheduleCode}`",
        ),
        author_mention,
        &code,
    );
    // Preview embed mirrors `executeAfterModal` (schedule.ts:399-418):
    // author block (name + png-512 avatar snapshot) + guild-icon
    // thumbnail, title, ```name``` ```desc``` preview, confirm field on
    // `__0`, color #00549F + timestamp + footer.
    let (author_name, user_icon, guild_thumb) = guided_identity_parts(ctx, ctx.author()).await;
    let embed = serenity::CreateEmbed::default()
        .title(confirm_title)
        .description(preview)
        .field(field_name, format_expiry_local(entry.expires_at_ms), true)
        .color(0x00549F)
        .timestamp(serenity::Timestamp::now());
    let embed = guided_embed_identity(
        embed,
        &author_name,
        user_icon.is_some(),
        guild_thumb.is_some(),
    );
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(ctx, &gid).await;
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    followup = followup.content(content).embed(embed);
    if let Some(bytes) = user_icon {
        followup = followup.add_file(serenity::CreateAttachment::bytes(bytes, "user_icon.png"));
    }
    if let Some(bytes) = guild_thumb {
        followup = followup.add_file(serenity::CreateAttachment::bytes(bytes, "guild_icon.png"));
    }
    if let Some(bytes) = footer_bytes {
        followup = followup.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let _ = submit.create_followup(ctx.http(), followup).await;
    Ok(())
}

/// Guided delete: code modal mirroring the TS
/// `schedule_delete_question` prompt, then the same delete/
/// not-found replies as `schedule_delete`.
pub(crate) async fn guided_delete(
    ctx: &Ctx<'_>,
    press: &poise::serenity_prelude::ComponentInteraction,
    lang_code: &str,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let t = |k: &str, fb: &str| crate::lang::get(lang_code, k).unwrap_or_else(|| fb.to_string());
    let opts = delete_modal_opts(
        &t("schedule_modal_title", "Schedule Manager"),
        &t(
            "schedule_delete_question",
            "What is the ID of the Schedule you want to delete?",
        ),
    );
    let modal = crate::modal_helper::build_modal(&opts)
        .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
    press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::Modal(modal),
        )
        .await?;
    let Some(submit) =
        crate::commands::await_modal_submit(ctx.serenity_context(), press, GUIDED_DELETE_MODAL_ID)
            .await
    else {
        return Ok(());
    };
    let code = crate::modal_helper::text_value(&submit, GUIDED_FIELD_CODE);
    let _ = submit
        .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let gid = scope_guild(ctx);
    let user_id = ctx.author().id.get();
    let followup = serenity::CreateInteractionResponseFollowup::new().ephemeral(true);
    if delete_entry_routed(&ctx.data().pool, &gid, user_id, code.trim()).await? {
        let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(ctx, &gid).await;
        // Delete confirm mirrors `__1` (schedule.ts:253-273): author
        // block (name + png-512 avatar snapshot) + guild-icon
        // thumbnail, title, color #ff0a0a + timestamp + footer.
        let (author_name, user_icon, guild_thumb) = guided_identity_parts(ctx, &press.user).await;
        let title = t(
            "schedule_delete_title_embed",
            "Deleting a Schedule (${arg0})",
        )
        .replace("${arg0}", code.trim());
        let embed = serenity::CreateEmbed::default()
            .title(title)
            .color(0xFF0A0A)
            .timestamp(serenity::Timestamp::now());
        let embed = guided_embed_identity(
            embed,
            &author_name,
            user_icon.is_some(),
            guild_thumb.is_some(),
        );
        let embed =
            crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
        let mut followup = followup
            .content(t("schedule_delete_confirm", "Schedule deleted!"))
            .embed(embed);
        if let Some(bytes) = user_icon {
            followup = followup.add_file(serenity::CreateAttachment::bytes(bytes, "user_icon.png"));
        }
        if let Some(bytes) = guild_thumb {
            followup =
                followup.add_file(serenity::CreateAttachment::bytes(bytes, "guild_icon.png"));
        }
        if let Some(bytes) = footer_bytes {
            followup =
                followup.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
        }
        let _ = submit.create_followup(ctx.http(), followup).await;
    } else {
        let followup = followup.content(
            t(
                "schedule_delete_not_found",
                "There are no SCHEDULES (${arg0}) for this member!",
            )
            .replace("${arg0}", code.trim()),
        );
        let _ = submit.create_followup(ctx.http(), followup).await;
    }
    Ok(())
}

/// Guided delete-all: Yes/No buttons mirroring the TS `(Y/n)`
/// collector (`time: 120_000`), then the confirm/cancel replies.
/// The panel menu is restored afterwards so the collector stays alive.
#[allow(clippy::too_many_arguments)]
pub(crate) async fn guided_delete_all(
    ctx: &Ctx<'_>,
    press: &poise::serenity_prelude::ComponentInteraction,
    menu_msg: &mut poise::serenity_prelude::Message,
    lang_code: &str,
    menu: &poise::serenity_prelude::CreateSelectMenu,
    menu_row: &poise::serenity_prelude::CreateActionRow,
    author_mention: &str,
    not_for_you: &str,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let t = |k: &str, fb: &str| crate::lang::get(lang_code, k).unwrap_or_else(|| fb.to_string());
    let author = ctx.author().id;
    let _ = menu;
    press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .content(t(
                        "schedule_deleteall_question",
                        "Are you sure to delete all of your schedules? (Y/n)",
                    ))
                    .embeds(vec![])
                    .components(vec![delete_all_confirm_row("Yes", "No")]),
            ),
        )
        .await?;
    // Confirm-button wait, author-gated like the TS message filter
    // (`time: 120_000`).
    let deadline =
        std::time::Instant::now() + std::time::Duration::from_secs(GUIDED_PROMPT_TIMEOUT_SECS);
    let mut confirmed: Option<bool> = None;
    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(pick) = menu_msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if pick.data.custom_id != GUIDED_DELETE_ALL_YES_ID
            && pick.data.custom_id != GUIDED_DELETE_ALL_NO_ID
        {
            continue;
        }
        if pick.user.id != author {
            let _ = pick
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.to_string())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        confirmed = Some(pick.data.custom_id == GUIDED_DELETE_ALL_YES_ID);
        let _ = pick
            .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
            .await;
        break;
    }
    let gid = scope_guild(ctx);
    let user_id = ctx.author().id.get();
    match confirmed {
        Some(true) => {
            let _ = delete_all_entries_routed(&ctx.data().pool, &gid, user_id).await?;
            let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(ctx, &gid).await;
            // Delete-all confirm mirrors `__2` (schedule.ts:297-312):
            // author block (name + png-512 avatar snapshot), title +
            // description, color #ff0a0a + footer. No thumbnail: TS sets
            // none on this leg.
            let (author_name, user_icon, _) = guided_identity_parts(ctx, ctx.author()).await;
            let embed = serenity::CreateEmbed::default()
                .title(t(
                    "schedule_deleteall_title_embed",
                    "Deleting all Schedules",
                ))
                .description(t(
                    "schedule_deleteall_desc_embed",
                    "All of your schedules have been deleted!",
                ))
                .color(0xFF0A0A);
            let embed = guided_embed_identity(embed, &author_name, user_icon.is_some(), false);
            let embed = crate::commands::utils::embed_with_footer(
                embed,
                &footer_name,
                footer_bytes.is_some(),
            );
            let mut edit = serenity::EditMessage::new()
                .content(t(
                    "schedule_deleteall_confirm",
                    "All of your schedules have been deleted!",
                ))
                .embeds(vec![embed])
                .components(vec![menu_row.clone()]);
            let mut attachments = serenity::EditAttachments::new();
            let mut has_files = false;
            if let Some(bytes) = user_icon {
                attachments =
                    attachments.add(serenity::CreateAttachment::bytes(bytes, "user_icon.png"));
                has_files = true;
            }
            if let Some(bytes) = footer_bytes {
                attachments =
                    attachments.add(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
                has_files = true;
            }
            if has_files {
                edit = edit.attachments(attachments);
            }
            let _ = menu_msg.edit(ctx.http(), edit).await;
        }
        Some(false) => {
            let _ = menu_msg
                .edit(
                    ctx.http(),
                    serenity::EditMessage::new()
                        .content(t(
                            "schedule_deleteall_cancel",
                            "The `DELETE_ALL` action has been cancelled!",
                        ))
                        .embeds(vec![])
                        .components(vec![menu_row.clone()]),
                )
                .await;
        }
        // Timeout: quietly restore the panel like the TS collector end.
        None => {
            let _ = menu_msg
                .edit(
                    ctx.http(),
                    serenity::EditMessage::new()
                        .content(author_mention.to_string())
                        .embeds(vec![])
                        .components(vec![menu_row.clone()]),
                )
                .await;
        }
    }
    Ok(())
}

/// Guided list: renders the same embed as `schedule_list` into the
/// panel (TS `__3` edits the original interaction), keeping the menu
/// attached so the collector stays alive.
pub(crate) async fn guided_list(
    ctx: &Ctx<'_>,
    press: &poise::serenity_prelude::ComponentInteraction,
    lang_code: &str,
    menu: &poise::serenity_prelude::CreateSelectMenu,
    menu_row: &poise::serenity_prelude::CreateActionRow,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let t = |k: &str, fb: &str| crate::lang::get(lang_code, k).unwrap_or_else(|| fb.to_string());
    let _ = menu;
    let gid = scope_guild(ctx);
    let user_id = ctx.author().id.get();
    let entries = list_entries_routed(&ctx.data().pool, &gid, user_id).await;
    let mut update =
        serenity::CreateInteractionResponseMessage::new().components(vec![menu_row.clone()]);
    if entries.is_empty() {
        update = update.content(t(
            "schedule_list_not_schedule",
            "There are no SCHEDULES for this member!",
        ));
    } else {
        let list_title = t("schedule_list_title_embed", "Listing all Schedules");
        let field_template = t(
            "schedule_list_fields_embed",
            "**Ends at**: ${date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')}```${fetched[i]?.title}``````${fetched[i]?.description}```\n",
        );
        // Uncapped like TS `__3`: one embed per 25-row chunk, up to 10
        // per message (Discord limits); overflow pages follow up so no
        // row is dropped.
        // List embeds mirror `__3` (schedule.ts:347-361): author block
        // (name + png-512 avatar snapshot), title, one field per row,
        // color #60BEE0 + footer. No thumbnail: TS sets none here.
        let embeds = build_list_embeds(&entries, &list_title, &field_template);
        let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(ctx, &gid).await;
        let (author_name, user_icon, _) = guided_identity_parts(ctx, ctx.author()).await;
        let with_icon = footer_bytes.is_some();
        let with_user_icon = user_icon.is_some();
        let author_name = &author_name;
        update = update.content(t(
            "schedule_list_content_message",
            "Here's your schedule list!",
        ));
        for e in embeds.iter().take(SCHEDULE_LIST_EMBEDS_PER_MSG).map(|e| {
            guided_embed_identity(
                crate::commands::utils::embed_with_footer(e.clone(), &footer_name, with_icon),
                author_name,
                with_user_icon,
                false,
            )
        }) {
            update = update.add_embed(e);
        }
        if let Some(bytes) = user_icon.clone() {
            update = update.add_file(serenity::CreateAttachment::bytes(bytes, "user_icon.png"));
        }
        if let Some(bytes) = footer_bytes.clone() {
            update = update.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
        }
        let overflow: Vec<serenity::CreateEmbed> = embeds
            .into_iter()
            .skip(SCHEDULE_LIST_EMBEDS_PER_MSG)
            .map(|e| {
                guided_embed_identity(
                    crate::commands::utils::embed_with_footer(e, &footer_name, with_icon),
                    author_name,
                    with_user_icon,
                    false,
                )
            })
            .collect();
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(update),
            )
            .await;
        for chunk in overflow.chunks(SCHEDULE_LIST_EMBEDS_PER_MSG) {
            let mut followup =
                serenity::CreateInteractionResponseFollowup::new().embeds(chunk.to_vec());
            if let Some(bytes) = user_icon.clone() {
                followup =
                    followup.add_file(serenity::CreateAttachment::bytes(bytes, "user_icon.png"));
            }
            if let Some(bytes) = footer_bytes.clone() {
                followup =
                    followup.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
            }
            let _ = press.create_followup(ctx.http(), followup).await;
        }
        return Ok(());
    }
    let _ = press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::UpdateMessage(update),
        )
        .await;
    Ok(())
}

/// Webhook URL or webhook code
#[poise::command(slash_command, prefix_command, rename = "create")]
pub async fn schedule_create(
    ctx: Ctx<'_>,
    #[description = "Title (5-30 chars)"] title: String,
    #[description = "Description (10-400 chars)"] description: String,
    #[description = "When (e.g. 10s, 5m, 2h, 7d)"] when: String,
) -> Result<(), anyhow::Error> {
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !validate_title(&title) {
        ctx.say(
            crate::lang::get(&lang_code, "msg_title_must_be_5_30_characters")
                .unwrap_or_else(|| "Title must be 5-30 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if !validate_description(&description) {
        ctx.say(
            crate::lang::get(&lang_code, "msg_description_must_be_10_400_characters")
                .unwrap_or_else(|| "Description must be 10-400 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Verdict on `"0s"`: see the guided-create call site above — zero /
    // negative spans answer `schedule_create_not_number_time` instead of
    // creating an immediately-expiring schedule (deliberate divergence
    // from the TS NaN-only guard, schedule.ts:451).
    let Some(delta_ms) = parse_duration_ms(&when) else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_create_not_number_time")
                .map(|s| s.replace("${interaction.user}", &ctx.author().to_string()))
                .unwrap_or_else(|| "${interaction.user}, your response (the time you want to be notified about this schedule) is not a number!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let code = gen_code();
    let entry = ScheduleEntry {
        code: code.clone(),
        title: title.clone(),
        description: description.clone(),
        expires_at_ms: expiry_at_ms(now_ms(), delta_ms),
    };
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    save_entry_routed(&ctx.data().pool, &gid, &entry, user_id).await?;
    // TS parity (`executeAfterModal` / `__0`): preview description
    // (```name``` ```desc```), confirm title
    // (`schedule_create_embed_title_confirm`), one inline field named
    // `schedule_create_embed_fields_name_confirm` with the formatted
    // expiry, content from `schedule_create_confirm_msg`,
    // color #00549F + timestamp + footer.
    let preview = render_create_preview_description(&entry.title, &entry.description);
    let confirm_title = render_create_confirm_title(
        &crate::lang::get(&lang_code, "schedule_create_embed_title_confirm")
            .unwrap_or_else(|| "#${scheduleCode} Schedule Created!".to_string()),
        &code,
    );
    let field_name = crate::lang::get(&lang_code, "schedule_create_embed_fields_name_confirm")
        .unwrap_or_else(|| "Notified Date".to_string());
    let content = render_create_confirm_msg(
        &crate::lang::get(&lang_code, "schedule_create_confirm_msg").unwrap_or_else(|| {
            "${interaction.user}, your schedule has been created!\nCode: `${scheduleCode}`"
                .to_string()
        }),
        &ctx.author().to_string(),
        &code,
    );
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(confirm_title)
        .description(preview)
        .field(field_name, format_expiry_local(entry.expires_at_ms), true)
        .color(0x00549F)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().content(content).embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Delete a role for a certain amount of money!
#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn schedule_delete(
    ctx: Ctx<'_>,
    #[description = "Schedule code"] code: String,
) -> Result<(), anyhow::Error> {
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if delete_entry_routed(&ctx.data().pool, &gid, user_id, code.trim()).await? {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_delete_confirm")
                .unwrap_or_else(|| "Schedule deleted!".to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_delete_not_found")
                .map(|s| s.replace("${arg0}", code.trim()))
                .unwrap_or_else(|| "There are no SCHEDULES (${arg0}) for this member!".to_string()),
        )
        .await?;
    }
    Ok(())
}

/// Delete all command.
#[poise::command(slash_command, prefix_command, rename = "delete-all")]
pub async fn schedule_delete_all(
    ctx: Ctx<'_>,
    #[description = "Type y/yes to confirm"] confirm: Option<String>,
) -> Result<(), anyhow::Error> {
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS parity: delete-all asks `schedule_deleteall_question` (Y/n) and
    // only deletes on `y`/`yes` (case-insensitive); anything else sends
    // `schedule_deleteall_cancel` instead of deleting.
    let Some(given) = confirm.as_deref() else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_deleteall_question").unwrap_or_else(|| {
                "Are you sure to delete all of your schedules? (Y/n)".to_string()
            }),
        )
        .await?;
        return Ok(());
    };
    if !is_delete_all_confirmed(given) {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_deleteall_cancel")
                .unwrap_or_else(|| "The `DELETE_ALL` action has been cancelled!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let n = delete_all_entries_routed(&ctx.data().pool, &gid, user_id).await?;
    ctx.say(
        crate::lang::get(&lang_code, "schedule_deleteall_confirm")
            .unwrap_or_else(|| format!("Deleted {n} schedule(s).")),
    )
    .await?;
    Ok(())
}

/// List all sticky channels
#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn schedule_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let entries = list_entries_routed(&ctx.data().pool, &gid, user_id).await;
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if entries.is_empty() {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_list_not_schedule")
                .unwrap_or_else(|| "There are no SCHEDULES for this member!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let list_title = crate::lang::get(&lang_code, "schedule_list_title_embed")
        .unwrap_or_else(|| "Listing all Schedules".to_string());
    // TS parity: field bodies render through `schedule_list_fields_embed`
    // (`${date...}` / `${fetched[i]?.title}` / `${fetched[i]?.description}`).
    let field_template = crate::lang::get(&lang_code, "schedule_list_fields_embed")
        .unwrap_or_else(|| "**Ends at**: ${date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')}```${fetched[i]?.title}``````${fetched[i]?.description}```\n".to_string());
    // SCOPE DECISION (recorded): TS reads the global `schedule`
    // table keyed `${userId}.${code}` (see ready.ts `scheduleTable`), so a
    // schedule created in one guild is visible/deletable from any other.
    // The Rust port deliberately scopes rows per guild table
    // (`scope_guild`, DMs fall back to "global") so guild data stays
    // isolated like every other routed category. Sort-by-expiry is also
    // deliberate (TS iterates insertion order). The list itself is
    // uncapped like TS `__3` (S3): entries chunk into 25-field embeds
    // (Discord field limit), up to 10 embeds per message (Discord
    // message limit); overflow pages go out as channel follow-ups.
    let embeds = build_list_embeds(&entries, &list_title, &field_template);
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let with_icon = footer_bytes.is_some();
    let content = crate::lang::get(&lang_code, "schedule_list_content_message")
        .unwrap_or_else(|| "Here's your schedule list!".to_string());
    for (i, chunk) in embeds.chunks(SCHEDULE_LIST_EMBEDS_PER_MSG).enumerate() {
        let chunk: Vec<poise::serenity_prelude::CreateEmbed> = chunk
            .iter()
            .map(|e| crate::commands::utils::embed_with_footer(e.clone(), &footer_name, with_icon))
            .collect();
        let file = footer_bytes.clone().map(|bytes| {
            poise::serenity_prelude::CreateAttachment::bytes(bytes, "footer_icon.png")
        });
        if i == 0 {
            let mut reply = poise::CreateReply::default().content(content.clone());
            for e in chunk {
                reply = reply.embed(e);
            }
            if let Some(file) = file {
                reply = reply.attachment(file);
            }
            ctx.send(reply).await?;
        } else {
            let mut msg = poise::serenity_prelude::CreateMessage::new().embeds(chunk);
            if let Some(file) = file {
                msg = msg.add_file(file);
            }
            let _ = ctx.channel_id().send_message(ctx.http(), msg).await;
        }
    }
    Ok(())
}

/// Delete-all confirmation gate. Mirrors the TS `(Y/n)` collector which
/// deletes only when the reply lowercases to `y` or `yes`.
pub fn is_delete_all_confirmed(s: &str) -> bool {
    matches!(s.trim().to_lowercase().as_str(), "y" | "yes")
}

/// Discord embeds hold at most 25 fields, and a message at most 10
/// embeds. TS lists every schedule uncapped (`schedule.ts` `__3`, one
/// field per row), so the port chunks into 25-field embeds instead of
/// dropping rows past 25.
pub const SCHEDULE_LIST_FIELDS: usize = 25;
pub const SCHEDULE_LIST_EMBEDS_PER_MSG: usize = 10;

/// One embed per 25-row chunk, in the caller's order. Pure (no footer):
/// callers apply `embed_with_footer` and split across messages at
/// `SCHEDULE_LIST_EMBEDS_PER_MSG`.
pub fn build_list_embeds(
    entries: &[ScheduleEntry],
    title: &str,
    field_template: &str,
) -> Vec<poise::serenity_prelude::CreateEmbed> {
    entries
        .chunks(SCHEDULE_LIST_FIELDS)
        .map(|chunk| {
            let mut embed = poise::serenity_prelude::CreateEmbed::default()
                .title(title.to_string())
                .color(0x60BEE0);
            for e in chunk {
                embed = embed.field(
                    format!("#{}", e.code),
                    render_schedule_field(
                        field_template,
                        &e.title,
                        &e.description,
                        &format_expiry_local(e.expires_at_ms),
                    ),
                    false,
                );
            }
            embed
        })
        .collect()
}

/// Format an expiry timestamp like TS `format(date, "YYYY/MM/DD HH:mm:ss")`
/// (server-local time). Out-of-range values degrade to the raw millis.
pub fn format_expiry_local(expires_at_ms: i64) -> String {
    let secs = expires_at_ms.div_euclid(1000);
    let nanos = (expires_at_ms.rem_euclid(1000) as u32) * 1_000_000;
    chrono::DateTime::from_timestamp(secs, nanos)
        .map(|dt| {
            let local: chrono::DateTime<chrono::Local> = chrono::DateTime::from(dt);
            local.format("%Y/%m/%d %H:%M:%S").to_string()
        })
        .unwrap_or_else(|| expires_at_ms.to_string())
}

/// Render one list field through the `schedule_list_fields_embed`
/// template. The canonical en-US template interpolates a pre-formatted
/// date (`${date.format(new Date(fetched[i]?.expired), ...)}`), so the
/// caller passes the already formatted expiry; the raw-placeholder shape
/// is accepted too for forward compatibility.
pub fn render_schedule_field(
    template: &str,
    title: &str,
    description: &str,
    expires_display: &str,
) -> String {
    const DATE_PH: &str = "${date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')}";
    let out = template.replace(DATE_PH, expires_display);
    // Accept a hypothetical `${date}`-style template as well.
    let out = out.replace("${date}", expires_display);
    let out = out.replace("${fetched[i]?.title}", title);
    out.replace("${fetched[i]?.description}", description)
}

/// Create-flow confirm helpers (TS `executeAfterModal` / `__0`).
/// Preview embed description: ` ```name``` ```desc``` `.
pub fn render_create_preview_description(name: &str, desc: &str) -> String {
    format!("```{name}``````{desc}```")
}

/// Confirm title from `schedule_create_embed_title_confirm`
/// (`#${scheduleCode} Schedule Created!` in en-US).
pub fn render_create_confirm_title(template: &str, code: &str) -> String {
    template.replace("${scheduleCode}", code)
}

/// Confirm message from `schedule_create_confirm_msg`
/// (`${interaction.user}` + `${scheduleCode}` in en-US).
pub fn render_create_confirm_msg(template: &str, user_mention: &str, code: &str) -> String {
    template
        .replace("${interaction.user}", user_mention)
        .replace("${scheduleCode}", code)
}

/// Expiry instant like TS `Date.now() + date0` (saturating).
pub fn expiry_at_ms(now_ms: i64, delta_ms: i64) -> i64 {
    now_ms.saturating_add(delta_ms)
}

// ---- U-D3-NAMEDTABLES: schedule table handle ----
// Guild-scoped table (sibling convention: `table(gid)`), keys
// `SCHEDULE.<uid>.<code>` unchanged. Dotted keys nest under the
// `SCHEDULE` root (`{uid: {code: json}}`), so per-user loops walk the
// root and merge legacy kv rows. The expiry sweeper in scheduler.rs
// union-scans kv rows, per-guild table roots, and the TS `schedule`
// table: dual-write keeps them fresh.
use crate::commands::owner::main::{
    legacy_del_prefix, legacy_scan, routed_del, routed_get, routed_set, table_backend,
    tbl_get_value, walk_path,
};
use std::collections::HashSet;

/// Nested root holding every schedule of one guild table.
pub const SCHEDULE_ROOT: &str = "SCHEDULE";

pub async fn load_entry_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    code: &str,
) -> Option<ScheduleEntry> {
    let raw = routed_get(pool, guild_id, guild_id, &schedule_key(user_id, code)).await?;
    let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
    // Legacy `{title, description, expired}` rows carry no `code`;
    // the key suffix fills it so TS-era rows still load.
    super::entry_from_value(&v, code)
}

pub async fn save_entry_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    entry: &ScheduleEntry,
    user_id: u64,
) -> anyhow::Result<()> {
    let s = serde_json::to_string(entry)?;
    routed_set(
        pool,
        guild_id,
        guild_id,
        &schedule_key(user_id, &entry.code),
        &s,
    )
    .await
}

pub async fn delete_entry_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    code: &str,
) -> anyhow::Result<bool> {
    routed_del(pool, guild_id, guild_id, &schedule_key(user_id, code)).await
}

/// Merged entry (code, raw text) pairs for one user: table root
/// walked first, then legacy-only rows. Table values win on code
/// conflicts. Codes come from the keys so legacy `{expired}` rows
/// (no inner `code`) still parse via `entry_from_value`.
async fn user_entry_texts(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> Vec<(String, String)> {
    let uid = user_id.to_string();
    let mut out: Vec<(String, String)> = vec![];
    let mut seen: HashSet<String> = HashSet::new();
    if let Some(root) = tbl_get_value(pool, guild_id, SCHEDULE_ROOT).await {
        if let Some(user) = walk_path(&root, &[uid.as_str()]) {
            if let Some(obj) = user.as_object() {
                for (code, v) in obj {
                    if let Some(s) = v.as_str() {
                        seen.insert(code.clone());
                        out.push((code.clone(), s.to_string()));
                    }
                }
            }
        }
    }
    for (k, v) in legacy_scan(pool, guild_id, &schedule_prefix(user_id)).await {
        let code = k.strip_prefix(&schedule_prefix(user_id)).unwrap_or(&k);
        if seen.insert(code.to_string()) {
            out.push((code.to_string(), v));
        }
    }
    out
}

pub async fn list_entries_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> Vec<ScheduleEntry> {
    let mut out: Vec<ScheduleEntry> = vec![];
    for (code, raw) in user_entry_texts(pool, guild_id, user_id).await {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(e) = super::entry_from_value(&v, &code) {
                out.push(e);
            }
        }
    }
    out.sort_by_key(|e| e.expires_at_ms);
    out
}

pub async fn delete_all_entries_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> anyhow::Result<u64> {
    // Count logical rows first: dual-written rows exist twice.
    let mut codes: HashSet<String> = HashSet::new();
    let uid = user_id.to_string();
    let root = tbl_get_value(pool, guild_id, SCHEDULE_ROOT).await;
    let has_user = walk_path(
        root.as_ref().unwrap_or(&serde_json::Value::Null),
        &[uid.as_str()],
    )
    .and_then(|u| u.as_object())
    .map(|obj| {
        codes.extend(obj.keys().cloned());
        true
    })
    .unwrap_or(false);
    for (k, _) in legacy_scan(pool, guild_id, &schedule_prefix(user_id)).await {
        codes.insert(
            k.strip_prefix(&schedule_prefix(user_id))
                .unwrap_or(&k)
                .to_string(),
        );
    }
    let n = codes.len() as u64;
    if has_user {
        let backend = table_backend(pool);
        let _ = backend
            .table(guild_id.to_string())
            .delete(&format!("{SCHEDULE_ROOT}.{user_id}"))
            .await;
    }
    legacy_del_prefix(pool, guild_id, &schedule_prefix(user_id)).await?;
    Ok(n)
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    fn sample(code: &str, expires: i64) -> ScheduleEntry {
        ScheduleEntry {
            code: code.to_string(),
            title: "title".to_string(),
            description: "a description here".to_string(),
            expires_at_ms: expires,
        }
    }

    #[tokio::test]
    async fn routed_crud_dual_writes() {
        let pool = mem_pool().await;
        assert_eq!(load_entry_routed(&pool, "g", 1, "A").await, None);
        save_entry_routed(&pool, "g", &sample("A", 200), 1)
            .await
            .unwrap();
        save_entry_routed(&pool, "g", &sample("B", 100), 1)
            .await
            .unwrap();
        assert_eq!(
            load_entry_routed(&pool, "g", 1, "A")
                .await
                .unwrap()
                .expires_at_ms,
            200
        );
        // Legacy kv reader (scheduler sweep) sees the unchanged key.
        assert!(crate::db::kv_get(&pool, "g", "SCHEDULE.1.A")
            .await
            .is_some());
        // List merges + sorts like the locked helper.
        let list = list_entries_routed(&pool, "g", 1).await;
        assert_eq!(
            list.iter().map(|e| e.code.as_str()).collect::<Vec<_>>(),
            vec!["B", "A"]
        );
        assert!(delete_entry_routed(&pool, "g", 1, "A").await.unwrap());
        assert!(!delete_entry_routed(&pool, "g", 1, "A").await.unwrap());
        assert_eq!(delete_all_entries_routed(&pool, "g", 1).await.unwrap(), 1);
        assert!(list_entries_routed(&pool, "g", 1).await.is_empty());
    }

    #[tokio::test]
    async fn routed_falls_back_to_legacy_rows() {
        let pool = mem_pool().await;
        // Legacy-only row (scheduler-written shape, kv only).
        crate::db::kv_set(
            &pool,
            "g",
            "SCHEDULE.2.Z",
            &serde_json::to_string(&sample("Z", 50)).unwrap(),
        )
        .await
        .unwrap();
        assert_eq!(
            load_entry_routed(&pool, "g", 2, "Z").await.unwrap().code,
            "Z"
        );
        assert_eq!(list_entries_routed(&pool, "g", 2).await.len(), 1);
        assert_eq!(delete_all_entries_routed(&pool, "g", 2).await.unwrap(), 1);
    }

    #[tokio::test]
    async fn routed_parses_legacy_expired_shape() {
        let pool = mem_pool().await;
        // True TS-writer shape: no `code`, expiry under `expired`.
        crate::db::kv_set(
            &pool,
            "g",
            "SCHEDULE.3.LEGACY",
            r#"{"title":"t","description":"a description","expired":77}"#,
        )
        .await
        .unwrap();
        let e = load_entry_routed(&pool, "g", 3, "LEGACY").await.unwrap();
        assert_eq!(e.code, "LEGACY");
        assert_eq!(e.expires_at_ms, 77);
        let list = list_entries_routed(&pool, "g", 3).await;
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].code, "LEGACY");
        assert_eq!(delete_all_entries_routed(&pool, "g", 3).await.unwrap(), 1);
    }

    #[test]
    fn guided_timeouts_mirror_ts_collectors() {
        // TS menu collector `time: 420_000`, delete / delete-all /
        // when message collectors `time: 120_000`.
        assert_eq!(GUIDED_MENU_TIMEOUT_SECS, 420);
        assert_eq!(GUIDED_PROMPT_TIMEOUT_SECS, 120);
    }

    #[test]
    fn guided_choice_values_mirror_ts_menu() {
        assert_eq!(guided_choice_of("0"), Some(GuidedChoice::Create));
        assert_eq!(guided_choice_of("1"), Some(GuidedChoice::Delete));
        assert_eq!(guided_choice_of("2"), Some(GuidedChoice::DeleteAll));
        assert_eq!(guided_choice_of("3"), Some(GuidedChoice::List));
        assert_eq!(guided_choice_of("4"), None);
        assert_eq!(guided_choice_of(""), None);
        assert_eq!(guided_choice_of("starter"), None);
    }

    #[test]
    fn guided_menu_values_carry_ts_emoji() {
        let vals = guided_menu_values();
        assert_eq!(
            [vals[0].0, vals[1].0, vals[2].0, vals[3].0],
            ["0", "1", "2", "3"]
        );
        assert_eq!(
            [vals[0].1, vals[1].1, vals[2].1, vals[3].1],
            ["📝", "🗑️", "⚠️", "📜"]
        );
    }

    #[test]
    fn modal_label_truncates_to_discord_limit() {
        assert_eq!(modal_label("Short"), "Short");
        // `schedule_delete_question` (51 chars) must fit the 45-char
        // input-label cap without being dropped.
        let long = "What is the ID of the Schedule you want to delete?";
        assert_eq!(modal_label(long).chars().count(), MODAL_LABEL_CHARS);
    }

    #[test]
    fn guided_create_modal_mirrors_ts_constraints() {
        use crate::modal_helper::{ModalField, TextStyle};
        let opts = create_modal_opts("T", "Name?", "Desc?", "When?");
        assert_eq!(opts.custom_id, GUIDED_CREATE_MODAL_ID);
        assert!(!opts.defer_update);
        assert_eq!(opts.fields.len(), 3);
        let bounds: Vec<(&str, u16, u16, TextStyle)> = opts
            .fields
            .iter()
            .map(|f| match f {
                ModalField::Text(t) => (
                    t.custom_id.as_str(),
                    t.min_length.unwrap_or(0),
                    t.max_length.unwrap_or(0),
                    t.style,
                ),
                _ => panic!("guided modals are text-only"),
            })
            .collect();
        // TS modal: name 5..30 (short), desc 10..400 (paragraph).
        assert!(bounds.contains(&("name", 5, 30, TextStyle::Short)));
        assert!(bounds.contains(&("desc", 10, 400, TextStyle::Paragraph)));
        assert!(bounds.contains(&("when", 1, 32, TextStyle::Short)));
        // Serenity-expressible (no Components-V2 field kinds).
        assert!(crate::modal_helper::build_modal(&opts).is_ok());
    }

    #[test]
    fn guided_delete_modal_is_single_code_field() {
        use crate::modal_helper::ModalField;
        let opts = delete_modal_opts("T", "What is the ID?");
        assert_eq!(opts.custom_id, GUIDED_DELETE_MODAL_ID);
        assert_eq!(opts.fields.len(), 1);
        match &opts.fields[0] {
            ModalField::Text(t) => {
                assert_eq!(t.custom_id, "code");
                assert!(t.required);
            }
            _ => panic!("guided modals are text-only"),
        }
        assert!(crate::modal_helper::build_modal(&opts).is_ok());
    }

    #[test]
    fn guided_ids_are_namespaced_and_distinct() {
        assert_ne!(GUIDED_MENU_ID, GUIDED_CREATE_MODAL_ID);
        assert_ne!(GUIDED_MENU_ID, GUIDED_DELETE_MODAL_ID);
        assert_ne!(GUIDED_CREATE_MODAL_ID, GUIDED_DELETE_MODAL_ID);
        assert_ne!(GUIDED_DELETE_ALL_YES_ID, GUIDED_DELETE_ALL_NO_ID);
    }

    #[test]
    fn guided_author_prefers_global_name_like_ts() {
        // `user.globalName || user.username` (schedule.ts:255).
        use poise::serenity_prelude as serenity;
        let mut user = serenity::User::default();
        user.name = "user".to_string();
        user.global_name = Some("Global".to_string());
        assert_eq!(guided_author_name(&user), "Global");
        user.global_name = None;
        assert_eq!(guided_author_name(&user), "user");
    }

    #[test]
    fn guided_identity_points_at_snapshot_files() {
        // Author icon / thumbnail must reference the attachment
        // snapshots, never raw CDN URLs (which rot to "media lost").
        let with_both = guided_embed_identity(serenity_embed(), "Name", true, true);
        let debug = format!("{with_both:?}");
        assert!(debug.contains("attachment://user_icon.png"));
        assert!(debug.contains("attachment://guild_icon.png"));
        let bare = guided_embed_identity(serenity_embed(), "Name", false, false);
        let debug = format!("{bare:?}");
        assert!(!debug.contains("attachment://user_icon.png"));
        assert!(!debug.contains("attachment://guild_icon.png"));

        fn serenity_embed() -> poise::serenity_prelude::CreateEmbed {
            poise::serenity_prelude::CreateEmbed::default()
        }
    }

    #[test]
    fn guided_builders_smoke() {
        // Builders must construct without panicking (Discord-shape
        // assertions live server-side; ids/values are covered above).
        let _ = guided_menu("Pick?", ["a", "b", "c", "d"]);
        let _ = delete_all_confirm_row("Yes", "No");
    }

    #[test]
    fn delete_all_gate_matches_ts_collector() {
        assert!(is_delete_all_confirmed("y"));
        assert!(is_delete_all_confirmed("Y"));
        assert!(is_delete_all_confirmed("yes"));
        assert!(is_delete_all_confirmed("YES"));
        assert!(is_delete_all_confirmed("  Yes  "));
        assert!(!is_delete_all_confirmed("n"));
        assert!(!is_delete_all_confirmed("no"));
        assert!(!is_delete_all_confirmed(""));
        assert!(!is_delete_all_confirmed("yep"));
        assert!(!is_delete_all_confirmed("cancel"));
    }

    #[test]
    fn list_field_renders_through_template() {
        let template = "**Ends at**: ${date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')}```${fetched[i]?.title}``````${fetched[i]?.description}```\n";
        assert_eq!(
            render_schedule_field(template, "Party", "at home", "2026/01/02 03:04:05"),
            "**Ends at**: 2026/01/02 03:04:05```Party``````at home```\n"
        );
    }

    #[test]
    fn expiry_format_shape_matches_ts_pattern() {
        // Server-local time, so only the shape is asserted (TZ-dependent).
        let s = format_expiry_local(1_700_000_000_000);
        assert_eq!(s.len(), 19);
        let b = s.as_bytes();
        assert_eq!(
            (b[4], b[7], b[10], b[13], b[16]),
            (b'/', b'/', b' ', b':', b':')
        );
        assert!(s
            .chars()
            .all(|c| c.is_ascii_digit() || matches!(c, '/' | ' ' | ':')));
    }

    #[test]
    fn guided_menu_id_routes_legacy_ts_starter() {
        // New menus carry the namespaced id; in-flight TS menus
        // (`customId: "starter"`, schedule.ts:77) still route.
        assert!(is_guided_menu_id(GUIDED_MENU_ID));
        assert!(is_guided_menu_id(GUIDED_MENU_ID_LEGACY));
        assert_eq!(GUIDED_MENU_ID_LEGACY, "starter");
        assert_ne!(GUIDED_MENU_ID, GUIDED_MENU_ID_LEGACY);
        assert!(!is_guided_menu_id(""));
        assert!(!is_guided_menu_id("other"));
    }

    #[test]
    fn list_embeds_chunk_at_discord_field_limit() {
        // 25 fields per embed, 10 embeds per message (Discord limits).
        assert_eq!(SCHEDULE_LIST_FIELDS, 25);
        assert_eq!(SCHEDULE_LIST_EMBEDS_PER_MSG, 10);
        // 26 rows list all (S3, TS `__3` uncapped): two embeds, the
        // 26th row lands on the second page instead of being dropped.
        let entries: Vec<ScheduleEntry> = (0..26)
            .map(|i| sample(&format!("C{i:02}"), i as i64))
            .collect();
        let embeds = build_list_embeds(&entries, "T", "tpl");
        assert_eq!(embeds.len(), 2);
        let first = format!("{:?}", embeds[0]);
        let second = format!("{:?}", embeds[1]);
        assert_eq!(first.matches("#C").count(), 25);
        assert_eq!(second.matches("#C").count(), 1);
        assert!(build_list_embeds(&[], "T", "tpl").is_empty());
    }

    #[test]
    fn create_preview_matches_ts_modal_embed() {
        // TS: .setDescription(` ```${name}``` ```${desc}``` `)
        assert_eq!(
            render_create_preview_description("Party", "at home"),
            "```Party``````at home```"
        );
    }

    #[test]
    fn create_confirm_title_interpolates_code() {
        assert_eq!(
            render_create_confirm_title("#${scheduleCode} Schedule Created!", "ABC123"),
            "#ABC123 Schedule Created!"
        );
    }

    #[test]
    fn create_confirm_msg_interpolates_user_and_code() {
        assert_eq!(
            render_create_confirm_msg(
                "${interaction.user}, your schedule has been created!\nCode: `${scheduleCode}`",
                "<@123>",
                "ABC123"
            ),
            "<@123>, your schedule has been created!\nCode: `ABC123`"
        );
    }

    #[test]
    fn create_expiry_adds_delta_like_ts() {
        // TS: expired: Date.now() + date0
        assert_eq!(expiry_at_ms(1_000, 60_000), 61_000);
        assert_eq!(expiry_at_ms(i64::MAX, 1), i64::MAX);
    }

    #[test]
    fn create_confirm_field_value_is_formatted_expiry() {
        // Field value renders through the same local-time formatter
        // as the list fields (`YYYY/MM/DD HH:mm:ss` shape).
        let s = format_expiry_local(expiry_at_ms(1_700_000_000_000, 60_000));
        assert_eq!(s.len(), 19);
    }
}

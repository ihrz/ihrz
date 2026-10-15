use super::banlist::{clamp_page_idx, dead_row, nav_buttons, wrap_page};
use super::*;
use poise::serenity_prelude as serenity;

// TS-exact button ids (!mutelist.ts:124/128/132).
const PREV_ID: &str = "previousPage";
const NEXT_ID: &str = "nextPage";
const TRASH_ID: &str = "trash-mutelist-embed";

/// Show a list with all muted member
// TS-exact: zero options (!mutelist.ts takes no slash options — the
// command always opens on the first page and pages via the
// `previousPage` / `nextPage` buttons (wrapping) plus the
// `trash-mutelist-embed` clear button on a 60-second collector).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "mutelist",
    aliases("allmute", "allmutes", "alltimeout", "alltimeouts"),
    default_member_permissions = "MODERATE_MEMBERS",
    description_localized("fr", "Affiche une liste des gens mise en sourdine"),
    description_localized("ja", "ミュートされた全メンバーのリストを表示"),
    description_localized("ru", "Показать список замученных участников"),
    description_localized("es-ES", "Mostrar una lista con todos los miembros silenciados")
)]
pub async fn mod_mutelist(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Ack first: mod.ts sets `thinking: true`, so TS defers the slash
    // reply before running; defer here for the same 3s window.
    ctx.defer().await?;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let muted: Vec<(serenity::UserId, String)> = {
        let now = crate::bot::now_ms();
        ctx.serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                g.members
                    .values()
                    // Active timeout only, like `isCommunicationDisabled()`
                    // (!mutelist.ts:55): expiry in the future, not merely set.
                    .filter(|m| timeout_active(m.communication_disabled_until, now))
                    .map(|m| (m.user.id, m.user.to_string()))
                    .collect()
            })
            .unwrap_or_default()
    };
    if muted.is_empty() {
        ctx.say(t("prevnames_undetected", "No data found!")).await?;
        return Ok(());
    }
    // TS uses a collector `filter` (author only), so foreign presses are
    // silently ignored; only banlist replies `help_not_for_you`.
    let page_word = t("var_page", "Page");
    // Localized unit names for the remaining-time display, mirroring
    // `to_beautiful_string(remaining, lang)` in !mutelist.ts.
    let units = [
        t("var_year", "year(s)"),
        t("var_mo", "month(s)"),
        t("var_w", "week(s)"),
        t("var_d", "day(s)"),
        t("var_h", "hour(s)"),
        t("var_m", "minute(s)"),
        t("var_s", "second(s)"),
    ];
    // Page descriptions are rebuilt after the trash button clears the
    // timeouts, mirroring the TS `generatePages` refresh.
    let describe = |ids: &[(serenity::UserId, String)]| -> Vec<String> {
        let now = crate::bot::now_ms();
        let guild = ctx.serenity_context().cache.guild(guild_id);
        ids.chunks(LIST_PAGE_SIZE)
            .map(|chunk| {
                chunk
                    .iter()
                    .map(|(uid, mention)| {
                        let remaining = guild
                            .as_ref()
                            .and_then(|g| g.members.get(uid))
                            .and_then(|m| m.communication_disabled_until)
                            .map(|until| (until.unix_timestamp() * 1000 - now).max(0))
                            .unwrap_or(0);
                        format!(
                            "{mention} - `{}`",
                            beautiful_ms_lang(remaining as f64, &units)
                        )
                    })
                    .collect::<Vec<_>>()
                    .join("\n")
            })
            .collect()
    };
    let mut ids = muted;
    let mut descs = describe(&ids);
    // TS always opens on the first page (no `page` option).
    let mut cur = clamp_page_idx(None, descs.len());
    let author = ctx.author().id;
    let mk_embed = |descs: &[String], cur: usize| {
        serenity::CreateEmbed::default()
            .description(descs[cur].clone())
            .footer(serenity::CreateEmbedFooter::new(format!(
                "{page_word} {}/{}",
                cur + 1,
                descs.len()
            )))
            .colour(0x010101)
            .timestamp(serenity::Timestamp::now())
    };
    let mk_row = |cur: usize, total: usize, cleared: bool| {
        let mut buttons = nav_buttons(PREV_ID, NEXT_ID, cur, total);
        buttons.push(
            serenity::CreateButton::new(TRASH_ID)
                .label("🗑️")
                .style(serenity::ButtonStyle::Danger)
                .disabled(cleared),
        );
        serenity::CreateActionRow::Buttons(buttons)
    };
    let mut cleared = false;
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_embed(&descs, cur))
                .components(vec![mk_row(cur, descs.len(), cleared)]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    // 60-second collector like the TS `time: 60_000`; prev/next wrap
    // around, and the trash button unmutes everyone then refreshes.
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(60))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author {
            continue;
        }
        match press.data.custom_id.as_str() {
            x if x == PREV_ID => cur = wrap_page(cur, descs.len(), false),
            x if x == NEXT_ID => cur = wrap_page(cur, descs.len(), true),
            x if x == TRASH_ID => {
                // One PATCH per entry, no member fetch: ack first (TS
                // deferUpdate) so mass unmutes never blow the 3s
                // interaction window, then edit afterwards. Failures are
                // absorbed like the TS `.catch(() => {})`.
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                for (uid, _) in &ids {
                    let _ = guild_id
                        .edit_member(
                            ctx.http(),
                            *uid,
                            serenity::builder::EditMember::new().enable_communication(),
                        )
                        .await;
                }
                ids.clear();
                cleared = true;
                descs = vec![t("prevnames_undetected", "No data found!")];
                cur = 0;
                let _ = press
                    .edit_response(
                        ctx.http(),
                        serenity::EditInteractionResponse::new()
                            .embed(mk_embed(&descs, cur))
                            .components(vec![mk_row(cur, descs.len(), cleared)]),
                    )
                    .await;
                continue;
            }
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(&descs, cur))
                        .components(vec![mk_row(cur, descs.len(), cleared)]),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![dead_row(PREV_ID, NEXT_ID)]),
        )
        .await;
    Ok(())
}

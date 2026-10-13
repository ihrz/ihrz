use super::*;
use poise::serenity_prelude as serenity;

// Interactive whitelist panel. Mirrors `!wlroles-use.ts`: role
// multi-select REPLACE panel (min 0 / max 25, current list as defaults),
// save button persisting the whole array (empty selection clears it),
// dual 240s collectors, rows disabled on end. Custom ids byte-exact
// with TS (including the `selecter` spelling).
// (An earlier port flattened this to a single-role toggle param; that
// had no TS basis and is removed by this rewrite.)
const SELECT_ID: &str = "utils-wlTagUse-role-selecter";
const SAVE_ID: &str = "utils-wlTagUse-save-button";
const PANEL_TIMEOUT_SECS: u64 = 240;
const SELECT_MAX: u8 = 25;

/// Roles whitelist for using tags
#[poise::command(
    slash_command,
    prefix_command,
    rename = "wlroles-use",
    aliases("tag-wluse"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Rôles whitelist pour utiliser les tags"),
    description_localized("ja", "タグ使用用のホワイトリストロール"),
    description_localized("ru", "Белый список ролей для использования тегов"),
    description_localized("es-ES", "Roles de lista blanca para usar etiquetas")
)]
pub async fn tag_wl_use(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let pool = ctx.data().pool.clone();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| {
        crate::lang::get(&code, k)
            .filter(|s| !s.is_empty())
            .unwrap_or_default()
    };
    // TS: db value or []; the select leg rewrites the whole list.
    let mut pending: Vec<String> = load_tags(&pool, &gid).await.whitelist_use.clone();
    let author = ctx.author().id;
    let not_for_you = t("help_not_for_you");
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(render_panel_embed(&t, &pending))
                .components(panel_rows(&pending, false)),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let http = ctx.http();
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(PANEL_TIMEOUT_SECS);
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if press.user.id != author {
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        let id = press.data.custom_id.clone();
        if id == SELECT_ID {
            // Mirrors the select leg: pending takes the full selection
            // (empty clears), deferUpdate, re-render the field.
            if let serenity::ComponentInteractionDataKind::RoleSelect { values } = &press.data.kind
            {
                pending = values.iter().map(|r| r.get().to_string()).collect();
            }
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new().embeds(vec![render_panel_embed(&t, &pending)]),
                )
                .await;
        } else if id == SAVE_ID {
            // Mirrors the save leg: persist the pending array (REPLACE),
            // ack, stop.
            let mut store = load_tags(&pool, &gid).await;
            store.whitelist_use = pending.clone();
            let _ = save_tags(&pool, &gid, &store).await;
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            break;
        }
    }
    // Collector `end` leg: disable the rows like TS.
    let _ = msg
        .edit(
            http,
            serenity::EditMessage::new().components(panel_rows(&pending, true)),
        )
        .await;
    Ok(())
}

fn render_panel_embed(t: &dyn Fn(&str) -> String, pending: &[String]) -> serenity::CreateEmbed {
    // Mirrors the TS field: mentions joined with ", ", or the none line.
    let value = if pending.is_empty() {
        t("setjoinroles_var_none")
    } else {
        pending
            .iter()
            .map(|r| format!("<@&{r}>"))
            .collect::<Vec<_>>()
            .join(", ")
    };
    serenity::CreateEmbed::default()
        .colour(0x475387_u32)
        .title(t("tag_wluse_embed_title"))
        .description(t("tag_wluse_embed_desc"))
        .field(t("setjoinroles_help_embed_fields_1_name"), value, false)
}

fn panel_rows(pending: &[String], disabled: bool) -> Vec<serenity::CreateActionRow> {
    let defaults: Vec<serenity::RoleId> = pending
        .iter()
        .filter_map(|r| r.parse::<u64>().ok().map(serenity::RoleId::new))
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        SELECT_ID,
        serenity::CreateSelectMenuKind::Role {
            default_roles: (!defaults.is_empty()).then_some(defaults),
        },
    )
    .min_values(0)
    .max_values(SELECT_MAX)
    .disabled(disabled);
    vec![
        serenity::CreateActionRow::SelectMenu(menu),
        serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(SAVE_ID)
            .style(serenity::ButtonStyle::Primary)
            .emoji(serenity::ReactionType::Unicode("💾".to_string()))
            .disabled(disabled)]),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn panel_ids_timeout_and_max_match_ts() {
        // Byte-exact custom ids from `!wlroles-use.ts` (including
        // the `selecter` spelling), 240s collectors, max 25.
        assert_eq!(SELECT_ID, "utils-wlTagUse-role-selecter");
        assert_eq!(SAVE_ID, "utils-wlTagUse-save-button");
        assert_eq!(PANEL_TIMEOUT_SECS, 240);
        assert_eq!(SELECT_MAX, 25);
    }

    #[test]
    fn panel_rows_carry_ts_ids_and_defaults() {
        let rows = panel_rows(&["33".to_string()], false);
        assert_eq!(rows.len(), 2);
        let dbg = format!("{rows:?}");
        assert!(dbg.contains(SELECT_ID));
        assert!(dbg.contains(SAVE_ID));
        // Current list rides as defaults; the cap renders as 25.
        assert!(dbg.contains("33"));
        assert!(dbg.contains("25"));
        // TS sets no select placeholder (`!wlroles-use.ts`
        // RoleSelectMenuBuilder has none): the rows render none.
        assert!(!dbg.contains("placeholder: Some"));
        // Collector end leg: every row disabled.
        let end = panel_rows(&[], true);
        assert!(format!("{end:?}").contains("disabled: true"));
    }
}

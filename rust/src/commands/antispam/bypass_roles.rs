use super::*;
use poise::serenity_prelude as serenity;

// Interactive bypass-roles panel. Mirrors !bypass-roles.ts exactly:
// role multi-select REPLACE panel (min 0 / max 20, save writes the
// whole array, selecting nothing clears it). The invented
// add/remove/clear/list subcommands had no TS basis and are removed
// by this rewrite.
const KEY: &str = "GUILD.ANTISPAM.BYPASS_ROLES";
const SELECT_ID: &str = "antispam-select-config";
const SAVE_ID: &str = "antispam-manage-save-button";
const PANEL_TIMEOUT_SECS: u64 = 240;

/// All of the roles wich bypass the antispam
#[poise::command(
    slash_command,
    prefix_command,
    rename = "bypass-roles",
    aliases("bproles"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn as_bypass_roles(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
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
    // TS: db value or []; a lone non-array value wraps to one element.
    // load_string_list already returns the array-or-empty shape.
    let mut pending: Vec<String> = load_string_list(&pool, &gid, KEY).await;
    let guild_icon = ctx
        .guild_id()
        .and_then(|g| ctx.cache().guild(g))
        .and_then(|g| g.icon_url());
    let (footer_name, footer_bytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let author = ctx.author().id;
    let not_for_you = t("help_not_for_you");
    let embed = render_panel_embed(
        &t,
        &pending,
        guild_icon.clone(),
        &footer_name,
        footer_bytes.is_some(),
    );
    let mut reply = poise::CreateReply::default()
        .embed(embed)
        .components(panel_rows(&t, &pending));
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
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
                    serenity::EditMessage::new().embeds(vec![render_panel_embed(
                        &t,
                        &pending,
                        guild_icon.clone(),
                        &footer_name,
                        true,
                    )]),
                )
                .await;
        } else if id == SAVE_ID {
            // Mirrors the save leg: persist the pending array, ack, stop.
            let _ = save_string_list(&pool, &gid, KEY, &pending).await;
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
    // Collector `end` leg: strip the components like TS.
    let _ = msg
        .edit(http, serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

fn render_panel_embed(
    t: &dyn Fn(&str) -> String,
    pending: &[String],
    thumbnail: Option<String>,
    footer_name: &str,
    with_icon: bool,
) -> serenity::CreateEmbed {
    let mut embed = serenity::CreateEmbed::default()
        .colour(0x6666ff_u32)
        .title(t("antispam_manage_embed_title"))
        .description(t("antispan_bypassroles_embed_desc"));
    if let Some(url) = thumbnail {
        embed = embed.thumbnail(url);
    }
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
    embed = embed.field(t("setjoinroles_help_embed_fields_1_name"), value, false);
    crate::commands::shared::embed_with_footer(embed, footer_name, with_icon)
}

fn panel_rows(t: &dyn Fn(&str) -> String, pending: &[String]) -> Vec<serenity::CreateActionRow> {
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
    .placeholder(t("help_select_menu"))
    .min_values(0)
    .max_values(20);
    vec![
        serenity::CreateActionRow::SelectMenu(menu),
        serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(SAVE_ID)
            .label(t("antispam_manage_button_label"))
            .style(serenity::ButtonStyle::Success)]),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn panel_ids_match_ts_custom_ids() {
        // Byte-exact custom ids from !bypass-roles.ts.
        assert_eq!(SELECT_ID, "antispam-select-config");
        assert_eq!(SAVE_ID, "antispam-manage-save-button");
        assert_eq!(PANEL_TIMEOUT_SECS, 240);
    }
}

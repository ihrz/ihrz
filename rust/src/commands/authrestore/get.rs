use super::*;
use poise::serenity_prelude as serenity;

// Component ids for the `get` pager. TS uses bare
// `next`/`previous`/`pnext`/`pprevious`; the Rust port prefixes them
// so two concurrent pagers never acknowledge each other's clicks.
// Verdict (kept): namespaced ids are deliberate (shared component
// router); the step mapping + category-1 gating mirrors
// `SlashCommands/authrestore/!get.ts` (15-minute collector there;
// here the four ids above are the only armed components).
const ID_PREV_PAGE: &str = "ar-get-pprevious";
const ID_NEXT_PAGE: &str = "ar-get-pnext";
const ID_PREV_CAT: &str = "ar-get-previous";
const ID_NEXT_CAT: &str = "ar-get-next";

/// Map a pager component id to the `step_get_pager` action.
/// Mirrors the `i.customId` branches in the !get.ts collector.
/// `None` for unrelated components (never armed: the collector
/// filter only passes the four ids above).
pub fn pager_action_for_id(custom_id: &str) -> Option<&'static str> {
    match custom_id {
        ID_NEXT_CAT => Some("next"),
        ID_PREV_CAT => Some("previous"),
        ID_NEXT_PAGE => Some("pnext"),
        ID_PREV_PAGE => Some("pprevious"),
        _ => None,
    }
}

fn emoji_or_unicode(entry: Option<(u64, String, bool)>, uni: &str) -> serenity::ReactionType {
    match entry {
        Some((id, name, animated)) => serenity::ReactionType::Custom {
            animated,
            id: serenity::EmojiId::new(id),
            name: Some(name),
        },
        None => serenity::ReactionType::Unicode(uni.to_string()),
    }
}

/// Both pager rows. Mirrors `updateComponents` in !get.ts: row 1
/// pages the stored-users list (labels `<<<`/`>>>`, live only in
/// the members category), row 2 switches the main / members /
/// stats categories. Disabled flags come from `pager_arrows`.
pub fn pager_rows(
    category: GetCategory,
    page: usize,
    total_members: usize,
    minus: &serenity::ReactionType,
    folder: &serenity::ReactionType,
    pages: &serenity::ReactionType,
    plus: &serenity::ReactionType,
) -> Vec<serenity::CreateActionRow> {
    let (prev_page, next_page, prev_cat, next_cat) = pager_arrows(category, page, total_members);
    vec![
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new(ID_PREV_PAGE)
                .style(serenity::ButtonStyle::Secondary)
                .label("<<<")
                .disabled(!prev_page),
            serenity::CreateButton::new("ar-get-pdeco")
                .style(serenity::ButtonStyle::Secondary)
                .emoji(pages.clone())
                .disabled(true),
            serenity::CreateButton::new(ID_NEXT_PAGE)
                .style(serenity::ButtonStyle::Secondary)
                .label(">>>")
                .disabled(!next_page),
        ]),
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new(ID_PREV_CAT)
                .style(serenity::ButtonStyle::Secondary)
                .emoji(minus.clone())
                .disabled(!prev_cat),
            serenity::CreateButton::new("ar-get-deco")
                .style(serenity::ButtonStyle::Secondary)
                .emoji(folder.clone())
                .disabled(true),
            serenity::CreateButton::new(ID_NEXT_CAT)
                .style(serenity::ButtonStyle::Secondary)
                .emoji(plus.clone())
                .disabled(!next_cat),
        ]),
    ]
}

/// Get all informations about the AuthRestore module of the guild
#[poise::command(
    slash_command,
    prefix_command,
    rename = "get",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn authrestore_get(
    ctx: Ctx<'_>,
    #[description = "Private key of the AuthRestore config"] key: String,
) -> Result<(), anyhow::Error> {
    let entries = super::authrestore::load_authrestore_entries_routed(&ctx.data().pool).await;
    let Some((config_guild_id, data)) = find_guild_by_secret(&entries, &key) else {
        reply_missing_key(&ctx, &key).await?;
        return Ok(());
    };
    let config_guild_id = config_guild_id.to_string();
    let data = data.clone();
    if let Some(url) = gateway_endpoint(crate::funcs::GatewayMethod::AddSecurityCodeAmount) {
        let token = crate::config::api_token().unwrap_or_default();
        let _ = gateway_post(&url, &key_update_payload(&config_guild_id, &token, &key)).await;
    }
    let http = ctx.serenity_context();
    let role_text = match data.config.role_id.parse::<u64>() {
        Ok(rid) => {
            let mention = format!("<@&{rid}>");
            match ctx.guild() {
                Some(g) if g.roles.contains_key(&serenity::RoleId::new(rid)) => mention,
                _ => data.config.role_id.clone(),
            }
        }
        Err(_) => data.config.role_id.clone(),
    };
    let author_id = data.config.author.id.clone();
    let author_text = match author_id.parse::<u64>() {
        Ok(uid) => match serenity::UserId::new(uid).to_user(http).await {
            Ok(u) => u.to_string(),
            Err(_) => t(
                &ctx,
                "rc_get_unkwnon_user",
                "Unknown user (${Data.data.config.author.id})",
            )
            .await
            .replace("${Data.data.config.author.id}", &author_id),
        },
        Err(_) => author_id.clone(),
    };
    let date_note = t(
        &ctx,
        "rc_get_mainEmbed_field3_value",
        "*the date is in MM/DD/YYYY HH:mm format*",
    )
    .await;
    let title = t(&ctx, "rc_get_mainEmbed_title", "AuthRestore General Infos").await;
    // Shared bot footer + icon attachment. Mirrors footerBuilder /
    // footerAttachmentBuilder in !get.ts (all three embeds carry it).
    let gid_str = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_icon) = crate::commands::shared::footer_parts(&ctx, &gid_str).await;
    let field_names = [
        t(&ctx, "rc_get_mainEmbed_field1_name", "Server ID").await,
        t(
            &ctx,
            "rc_get_mainEmbed_field2_name",
            "Given role after verify",
        )
        .await,
        t(&ctx, "rc_get_mainEmbed_field3_name", "Created at").await,
        t(&ctx, "rc_get_mainEmbed_field4_name", "Key Used Count").await,
        t(&ctx, "rc_get_mainEmbed_field5_name", "Configuration Author").await,
    ];
    let fields = main_info_fields(
        &config_guild_id,
        &role_text,
        &date_note,
        &created_at_label(data.config.create_date),
        data.config.security_code_used,
        &author_text,
    );
    let mut main = serenity::CreateEmbed::new().title(title).color(2829617);
    main = crate::commands::shared::embed_with_footer(main, &footer_name, footer_icon.is_some());
    for ((name, value, inline), label) in fields.into_iter().zip(field_names) {
        let _ = name;
        main = main.field(label, value, inline);
    }
    let all_saved = super::authrestore::load_saved_members_routed(&ctx.data().pool).await;
    let members = saved_for_guild(&all_saved, &data.members);
    let members_title = t(&ctx, "rc_get_secondEmbed_title", "Stored user(s)").await;
    let footer_tpl = t(&ctx, "rc_get_secondEmbed_footer", "Page ${from} / ${to}").await;
    let locale_label = t(&ctx, "rc_get_locale", "Locale").await;
    let username_label = t(&ctx, "rc_get_username", "Username").await;
    // Stats category: the TS dashboard renders through Chromium
    // (`client.func.html2png` on `authRestoreGetPage.html`) — no render
    // backend exists here, so the same numbers (registration
    // histogram, locale split, recent verifications) are drawn as a
    // self-contained SVG card (see `cards::authrestore_dashboard_svg`,
    // rank-card pattern) attached as `authrestore.svg`, with the text
    // summary kept as the embed description fallback.
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let (hist_labels, hist_counts) = registration_histogram(&members, now_ms);
    let histogram: Vec<(String, usize)> = hist_labels
        .into_iter()
        .zip(hist_counts.into_iter())
        .collect();
    let locales = locale_distribution(&members);
    let recent = recent_verifications(&members);
    let dashboard_svg = crate::cards::authrestore_dashboard_svg(
        members.len(),
        data.config.security_code_used,
        &histogram,
        &locales,
        &recent,
    );
    let stats = stats_summary_text(
        &members,
        now_ms,
        &t(&ctx, "rc_total_membres", "Total Members").await,
        &t(
            &ctx,
            "rc_recent_locales_distribution",
            "Member Locales Distribution",
        )
        .await,
        &t(&ctx, "rc_recent_verifications", "Recent Verifications").await,
    );
    let stats_embed = crate::commands::shared::embed_with_footer(
        serenity::CreateEmbed::new()
            .description(stats)
            .color(2829617)
            .image("attachment://authrestore.svg")
            .timestamp(serenity::Timestamp::now()),
        &footer_name,
        footer_icon.is_some(),
    );
    let members_embed_for = |page: usize| {
        crate::commands::shared::embed_with_footer(
            serenity::CreateEmbed::new()
                .title(members_title.clone())
                .description(members_page_text(
                    &members,
                    page,
                    &locale_label,
                    &username_label,
                ))
                .timestamp(serenity::Timestamp::now()),
            &page_footer(&footer_tpl, page, members.len()),
            footer_icon.is_some(),
        )
    };
    let embed_for = |category: GetCategory, page: usize| match category {
        GetCategory::Main => main.clone(),
        GetCategory::Members => members_embed_for(page),
        GetCategory::Stats => stats_embed.clone(),
    };
    let minus = emoji_or_unicode(
        crate::emojis::cached_emoji_entry(ctx.http(), "Minus").await,
        "➖",
    );
    let folder = emoji_or_unicode(
        crate::emojis::cached_emoji_entry(ctx.http(), "Folder").await,
        "📁",
    );
    let pages_emoji = emoji_or_unicode(
        crate::emojis::cached_emoji_entry(ctx.http(), "Pages").await,
        "📄",
    );
    let plus = emoji_or_unicode(
        crate::emojis::cached_emoji_entry(ctx.http(), "Plus").await,
        "➕",
    );
    let rows_for = |category: GetCategory, page: usize| {
        pager_rows(
            category,
            page,
            members.len(),
            &minus,
            &folder,
            &pages_emoji,
            &plus,
        )
    };
    // TS opens on the main embed; the collector below drives the
    // category / page buttons for 15 minutes, then clears them.
    // The stats SVG and footer icon ride along from the first reply
    // so the stats category can render its image on navigation.
    let author = ctx.author().id;
    let mut initial = poise::CreateReply::default()
        .embed(main.clone())
        .components(rows_for(GetCategory::Main, 0))
        .attachment(serenity::CreateAttachment::bytes(
            dashboard_svg.into_bytes(),
            "authrestore.svg",
        ));
    if let Some(bytes) = footer_icon.clone() {
        initial = initial.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(initial).await?;
    let mut msg = handle.into_message().await?;
    let mut category = GetCategory::Main;
    let mut page = 0usize;
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(60 * 15);
    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .filter(|i| pager_action_for_id(&i.data.custom_id).is_some())
            .await;
        let Some(press) = press else { break };
        // TS ignores clicks from anyone but the invoker.
        if press.user.id != author {
            continue;
        }
        let action = pager_action_for_id(&press.data.custom_id).unwrap_or("next");
        (category, page) = step_get_pager(category, page, action, members.len());
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed_for(category, page))
                        .components(rows_for(category, page)),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pager_ids_map_to_collector_actions() {
        assert_eq!(pager_action_for_id(ID_NEXT_CAT), Some("next"));
        assert_eq!(pager_action_for_id(ID_PREV_CAT), Some("previous"));
        assert_eq!(pager_action_for_id(ID_NEXT_PAGE), Some("pnext"));
        assert_eq!(pager_action_for_id(ID_PREV_PAGE), Some("pprevious"));
        assert_eq!(pager_action_for_id("ar-get-deco"), None);
        assert_eq!(pager_action_for_id("yes"), None);
    }

    #[test]
    fn pager_rows_mirror_update_components() {
        let uni = serenity::ReactionType::Unicode("X".to_string());
        // Main category: no page arrows, previous-category off.
        let rows = pager_rows(GetCategory::Main, 0, 12, &uni, &uni, &uni, &uni);
        assert_eq!(rows.len(), 2);
        // Members category drives the same step/getters the handler
        // loop uses, so the pager never leaves the valid range.
        let (cat, page) = step_get_pager(GetCategory::Members, 0, "pnext", 12);
        assert_eq!((cat, page), (GetCategory::Members, 1));
        let rows = pager_rows(cat, page, 12, &uni, &uni, &uni, &uni);
        assert_eq!(rows.len(), 2);
        let (cat, page) = step_get_pager(cat, page, "next", 12);
        assert_eq!((cat, page), (GetCategory::Stats, 0));
        let _ = pager_rows(cat, page, 12, &uni, &uni, &uni, &uni);
    }
}

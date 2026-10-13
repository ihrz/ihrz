use super::*;

/// Get informations about the discord invite link
// Mirrors util !inviteinfo.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "inviteinfo",
    default_member_permissions = "MANAGE_GUILD",
    description_localized("fr", "Obtenir des informations vis-à-vis de l'invitations discord"),
    description_localized("ja", "Discord招待リンクの情報を取得"),
    description_localized("ru", "Получить информацию о пригласительной ссылке Discord"),
    description_localized(
        "es-ES",
        "Obtener información sobre el enlace de invitación de Discord"
    )
)]
pub async fn inviteinfo(
    ctx: Ctx<'_>,
    #[description_localized("fr", "le lien d'invitation discord ou le code")]
    #[description_localized("ja", "Discord招待 / コード")]
    #[description_localized("ru", "приглашение / код Discord")]
    #[description_localized("es-ES", "la invitación / código de Discord")]
    #[description = "the discord invite / code"]
    #[rename = "discord_invite"]
    invite: String,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    // Defer-safe path: the parent decl sets thinking:true, so ack before
    // the invite fetch (same unconditional `ctx.defer()` pattern as the
    // other slow hybrid commands, e.g. ranks show).
    ctx.defer().await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let f = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if !is_valid_discord_invite(&invite) {
        ctx.say(
            crate::lang::get(&code, "util_inviteinfo_not_valid_invite")
                .unwrap_or_else(|| "This `discord_invite` is not valid!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let short = invite
        .trim()
        .rsplit('/')
        .next()
        .unwrap_or_default()
        .to_string();
    let inv = match ctx.http().get_invite(&short, true, true, None).await {
        Ok(inv) => inv,
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "util_inviteinfo_not_valid_invite")
                    .unwrap_or_else(|| "This `discord_invite` is not valid!".to_string()),
            )
            .await?;
            return Ok(());
        }
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let has_footer = footer_bytes.is_some();
    let unknown = f("var_unknown");
    // Animated guild assets use gif (TS forceStatic:false); static use webp.
    let asset_url = |kind: &str, id: u64, h: &poise::serenity_prelude::ImageHash| {
        format!(
            "https://cdn.discordapp.com/{kind}/{id}/{h}.{}?size=512",
            invite_asset_ext(h.is_animated())
        )
    };
    let (g_name, g_id, g_desc, g_created, g_boosts, g_features, g_icon, g_banner, g_splash) =
        match &inv.guild {
            Some(g) => (
                g.name.clone(),
                g.id.get().to_string(),
                g.description
                    .clone()
                    .unwrap_or_else(|| f("profil_not_description_set")),
                format!("<t:{}:R>", g.id.created_at().unix_timestamp()),
                g.premium_subscription_count.unwrap_or(0).to_string(),
                if g.features.is_empty() {
                    f("var_none")
                } else {
                    g.features.join(", ").chars().take(1020).collect()
                },
                g.icon.map(|h| asset_url("icons", g.id.get(), &h)),
                g.banner.map(|h| asset_url("banners", g.id.get(), &h)),
                g.splash.map(|h| asset_url("splashes", g.id.get(), &h)),
            ),
            None => (
                f("var_unknown_guild_name"),
                unknown.clone(),
                f("profil_not_description_set"),
                unknown.clone(),
                "0".to_string(),
                f("var_none"),
                None,
                None,
                None,
            ),
        };
    let mk_embed1 = || {
        let mut e = serenity::CreateEmbed::default()
            .colour(serenity::Colour::from_rgb(0, 255, 255))
            .title(g_name.clone())
            .description(g_desc.clone())
            .field(
                f("setlogschannel_var_channel"),
                format!(
                    "<#{}> (ID: `{}`)",
                    inv.channel.id.get(),
                    inv.channel.id.get()
                ),
                false,
            )
            .field(f("var_guild"), format!("{g_name} (ID: `{g_id}`)"), false)
            .field(f("userinfo_embed_fields_4_name"), g_created.clone(), false);
        e = embed_with_footer(e, &footer_name, has_footer);
        e
    };
    let mk_embed2 = || {
        let mut e = serenity::CreateEmbed::default()
            .colour(serenity::Colour::from_rgb(0, 255, 255))
            .title(g_name.clone())
            // TS `link_data.memberCount || lang.var_unknown`: zero counts
            // are falsy, so 0 (and missing) fall back to var_unknown.
            .field(
                f("help_memberc_fields"),
                count_or_unknown(inv.approximate_member_count, &unknown),
                true,
            )
            .field(
                f("var_online_members"),
                count_or_unknown(inv.approximate_presence_count, &unknown),
                true,
            )
            .field(f("var_boost_level"), g_boosts.clone(), true)
            .field(f("var_features"), g_features.clone(), false);
        e = embed_with_footer(e, &footer_name, has_footer);
        e
    };
    let mut link_buttons = vec![];
    if let Some(url) = g_icon {
        link_buttons.push(serenity::CreateButton::new_link(url).label(f("var_guild_icon")));
    }
    if let Some(url) = g_banner {
        link_buttons.push(serenity::CreateButton::new_link(url).label(f("var_guild_banner")));
    }
    if let Some(url) = g_splash {
        link_buttons.push(serenity::CreateButton::new_link(url).label(f("var_guild_splash")));
    }
    let toggle_row = |label: &str| {
        serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(
            "inviteinfo-next-page",
        )
        .style(serenity::ButtonStyle::Secondary)
        .label(label)])
    };
    let mut rows = vec![];
    if !link_buttons.is_empty() {
        rows.push(serenity::CreateActionRow::Buttons(link_buttons.clone()));
    }
    rows.push(toggle_row(">>>"));
    let mut reply = poise::CreateReply::default()
        .embed(mk_embed1())
        .components(rows);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let author = ctx.author().id;
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let mut page = 1;
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(120))
            .filter(move |i| i.data.custom_id == "inviteinfo-next-page")
            .await;
        let Some(press) = press else { break };
        if press.user.id != author {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(f("help_not_for_you"))
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        page = if page == 1 { 2 } else { 1 };
        let label = if page == 1 { ">>>" } else { "<<<" };
        let mut new_rows = vec![];
        if !link_buttons.is_empty() {
            new_rows.push(serenity::CreateActionRow::Buttons(link_buttons.clone()));
        }
        new_rows.push(toggle_row(label));
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(if page == 1 { mk_embed1() } else { mk_embed2() })
                        .components(new_rows),
                ),
            )
            .await;
    }
    // Disable the toggle when the collector ends, like the TS end handler.
    let mut end_rows = vec![];
    if !link_buttons.is_empty() {
        end_rows.push(serenity::CreateActionRow::Buttons(
            link_buttons.into_iter().map(|b| b.disabled(true)).collect(),
        ));
    }
    end_rows.push(serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new("inviteinfo-next-page")
            .style(serenity::ButtonStyle::Secondary)
            .label(if page == 1 { ">>>" } else { "<<<" })
            .disabled(true),
    ]));
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(end_rows),
        )
        .await;
    Ok(())
}

/// Guild asset extension. Mirrors `forceStatic: false` in !inviteinfo.ts:
/// animated (`a_`) hashes render as gif, static as webp.
pub fn invite_asset_ext(is_animated: bool) -> &'static str {
    if is_animated {
        "gif"
    } else {
        "webp"
    }
}

/// Count with the TS `||` fallback. Mirrors
/// `` `${link_data.memberCount || lang.var_unknown}` `` in !inviteinfo.ts:
/// zero counts are falsy, so 0 (and missing) fall back to var_unknown.
/// (Boosts keep TS `|| 0` and are untouched.)
pub fn count_or_unknown(count: Option<u64>, unknown: &str) -> String {
    match count {
        Some(n) if n != 0 => n.to_string(),
        _ => unknown.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::{count_or_unknown, invite_asset_ext};

    #[test]
    fn animated_assets_use_gif() {
        assert_eq!(invite_asset_ext(true), "gif");
        assert_eq!(invite_asset_ext(false), "webp");
    }

    #[test]
    fn zero_counts_fall_back_to_unknown() {
        assert_eq!(count_or_unknown(Some(12), "?"), "12");
        assert_eq!(count_or_unknown(Some(0), "?"), "?");
        assert_eq!(count_or_unknown(None, "?"), "?");
    }
}

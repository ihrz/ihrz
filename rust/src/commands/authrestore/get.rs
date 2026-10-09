use super::*;
use poise::serenity_prelude as serenity;

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
            Err(_) => t(&ctx, "rc_get_unkwnon_user", "Unknown user")
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
    let mut main = serenity::CreateEmbed::new()
        .title(title)
        .color(2829617)
        .footer(serenity::CreateEmbedFooter::new("iHorizon"));
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
    let members_embed = serenity::CreateEmbed::new()
        .title(members_title)
        .description(members_page_text(
            &members,
            0,
            &locale_label,
            &username_label,
        ))
        .footer(serenity::CreateEmbedFooter::new(page_footer(
            &footer_tpl,
            0,
            members.len(),
        )))
        .timestamp(serenity::Timestamp::now());
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let stats = stats_summary_text(
        &members,
        now_ms,
        &t(&ctx, "rc_total_membres", "Total Members").await,
        &t(&ctx, "rc_recent_locales_distribution", "Locales").await,
        &t(&ctx, "rc_recent_verifications", "Recent verifications").await,
    );
    let stats_embed = serenity::CreateEmbed::new()
        .description(stats)
        .color(2829617)
        .timestamp(serenity::Timestamp::now())
        .footer(serenity::CreateEmbedFooter::new("iHorizon"));
    ctx.send(
        poise::CreateReply::default()
            .embed(main)
            .embed(members_embed)
            .embed(stats_embed),
    )
    .await?;
    Ok(())
}

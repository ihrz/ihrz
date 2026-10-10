use super::*;
use poise::serenity_prelude as serenity;

/// List all sticky channels
#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    aliases("sticky-list"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn sticky_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let mut cfgs: Vec<StickyConfig> = load_all_stickies(&ctx.data().pool, &gid).await;
    cfgs.sort_by(|a, b| a.channel_id.cmp(&b.channel_id));
    let desc = if cfgs.is_empty() {
        t("sticky_list_embed_desc_empty")
    } else {
        cfgs.iter()
            .map(|cfg| {
                list_line(
                    if cfg.channel_id.is_empty() {
                        "0"
                    } else {
                        &cfg.channel_id
                    },
                    cfg.content.as_deref(),
                    // TS truthiness: a blank embed id renders the text line.
                    super::sticky::present_embed_id(cfg.embed_id.as_deref()),
                    &t("sticky_list_embed_desc_line_text"),
                    &t("sticky_list_embed_desc_line_embed"),
                    &t("sticky_list_embed_desc_line_text_embed"),
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    };
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(0x11304c))
        .title(t("sticky_list_embed_title"))
        .description(desc);
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

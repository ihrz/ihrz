use super::*;
use crate::commands::shared::{embed_with_footer, footer_parts};
use poise::serenity_prelude as serenity;

/// Get the bot invite link. Mirrors invite.ts (embed + "Add me" link
/// button, not a bare URL).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    aliases("inviteme", "oauth")
)]
pub async fn invite(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let app_id = ctx.serenity_context().cache.current_user().id.get();
    let url = format!(
        "https://discord.com/api/oauth2/authorize?client_id={app_id}&permissions=8&scope=bot"
    );
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let has_icon = footer_bytes.is_some();
    let mut embed = serenity::CreateEmbed::default()
        .colour(0x416fec)
        .title(t("invite_embed_title", "Thank you for adding iHorizon!"))
        .description(t(
            "invite_embed_description",
            "I love you; show your love back by inviting me!",
        ))
        .url(&url);
    embed = embed_with_footer(embed, &footer_name, has_icon);
    if has_icon {
        embed = embed.thumbnail("attachment://footer_icon.png");
    }
    let mut reply = poise::CreateReply::default().embed(embed).components(vec![
        serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new_link(url)
            .label(t("invite_embed_title", "Thank you for adding iHorizon!"))]),
        // Exemplar for the shared TopGG helper (U-AWESOMEEMBED): the vote
        // row mirrors generateTopggActionRow (link + label; the TS TOPGG
        // app emoji is omitted until its id is resolvable post-sync).
        crate::commands::shared::generate_topgg_action_row(
            app_id,
            &t("topgg_vote_button_label", "Vote for iHorizon"),
        ),
    ]);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

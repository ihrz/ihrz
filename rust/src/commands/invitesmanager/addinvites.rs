use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "addinvites",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn inv_add(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let cur = load_invites(&ctx.data().pool, &gid, uid).await;
    // Mirrors TS `db.add` with no clamp: negative amounts are allowed.
    let next = add_invites(&cur, amount);
    save_invites(&ctx.data().pool, &gid, uid, &next).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let desc = crate::lang::get(&code, "addinvites_confirmation_embed_description")
        .unwrap_or_else(|| "Added ${amount} invites for ${user}".to_string())
        .replace("${amount}", &amount.to_string())
        .replace("${user}", &format!("<@{uid}>"));
    // Confirmation embed. Mirrors `!addinvites.ts` (#92A8D1 + guild footer).
    let (guild_name, guild_icon) = ctx
        .guild()
        .map(|g| (g.name.clone(), g.icon_url().unwrap_or_default()))
        .unwrap_or_default();
    let icon_bytes = if guild_icon.is_empty() {
        None
    } else {
        crate::image64::image64(&guild_icon).await
    };
    let mut embed = serenity::CreateEmbed::default()
        .description(desc)
        .colour(0x92A8D1);
    if icon_bytes.is_some() {
        embed = embed.footer(
            serenity::CreateEmbedFooter::new(guild_name).icon_url("attachment://guildIcon.png"),
        );
    } else if guild_icon.is_empty() {
        embed = embed.footer(serenity::CreateEmbedFooter::new(guild_name));
    } else {
        embed = embed.footer(serenity::CreateEmbedFooter::new(guild_name).icon_url(guild_icon));
    }
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = icon_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "guildIcon.png"));
    }
    ctx.send(reply).await?;
    if let Some(log_gid) = ctx.guild_id() {
        let author_id = ctx.author().id.get();
        post_inv_log(
            &ctx,
            log_gid,
            crate::lang::get(&code, "addinvites_logs_embed_title")
                .unwrap_or_else(|| "Invite Manager Logs".to_string()),
            crate::lang::get(&code, "addinvites_logs_embed_description")
                .unwrap_or_else(|| {
                    "<@${interaction.user.id}> added ${amount} invites to <@${user.id}>!"
                        .to_string()
                })
                .replace("${interaction.user.id}", &author_id.to_string())
                .replace("${amount}", &amount.to_string())
                .replace("${user.id}", &uid.to_string()),
        )
        .await;
    }
    Ok(())
}

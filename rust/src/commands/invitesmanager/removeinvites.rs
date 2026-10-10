use super::*;
use poise::serenity_prelude as serenity;

/// Remove invites from a user!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "removeinvites",
    aliases("rinvites", "subinv"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn inv_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    // f64 mirrors the TS `ApplicationCommandOptionType.Number` (`getNumber`).
    // Invite totals stay i64, so the fractional part truncates toward zero
    // (`as i64`, like JS `Math.trunc`); the reply echoes the raw slash
    // value, exactly like TS `amount.toString()`.
    #[description = "Amount"] amount: f64,
) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the Administrator leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::ADMINISTRATOR,
    )
    .await
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let cur = load_invites(&ctx.data().pool, &gid, uid).await;
    // Mirrors TS `db.sub` with no clamp: negative amounts are allowed.
    let next = remove_invites(&cur, amount as i64);
    save_invites(&ctx.data().pool, &gid, uid, &next).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let desc = crate::lang::get(&code, "removeinvites_confirmation_embed_description")
        .unwrap_or_else(|| "Removed ${amount} invites for ${user}".to_string())
        .replace("${amount}", &amount.to_string())
        .replace("${user}", &format!("<@{uid}>"));
    // Confirmation embed. Mirrors `!removeinvites.ts` (#92A8D1 + guild footer).
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
            crate::lang::get(&code, "removeinvites_logs_embed_title")
                .unwrap_or_else(|| "Invite Manager Logs".to_string()),
            crate::lang::get(&code, "removeinvites_logs_embed_description")
                .unwrap_or_else(|| {
                    "<@${interaction.user.id}> removed ${amount} invites from <@${user.id}>!"
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

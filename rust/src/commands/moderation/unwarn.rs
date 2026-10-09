use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "unwarn",
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_unwarn(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Warn id"] warn_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let warns = load_warns(&ctx.data().pool, &gid, uid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = emoji(&ctx, "No", "❌").await;
    // TS splits empty-list vs bad-id into two messages; mirror exactly.
    if warns.is_empty() {
        ctx.say(
            t("unwarn_cannot_found")
                .replace("${client.iHorizon_Emojis.No}", &no)
                .replace("${member?.toString()}", &user.to_string()),
        )
        .await?;
        return Ok(());
    }
    let (next, removed) = remove_warn(warns, &warn_id);
    if removed {
        save_warns(&ctx.data().pool, &gid, uid, &next).await?;
        let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
            .await
            .unwrap_or_else(|| "✅".to_string());
        ctx.say(
            crate::lang::get(&code, "unwarn_command_ok")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                        .replace("${member?.toString()}", &user.to_string())
                })
                .unwrap_or_else(|| "Warn removed.".to_string()),
        )
        .await?;
        if let Some(guild_id) = ctx.guild_id() {
            post_mod_log(
                ctx.http(),
                guild_id,
                t("unwarn_logEmbed_title"),
                t("unwarn_logEmbed_desc")
                    .replace(
                        "${interaction.member.toString()}",
                        &ctx.author().to_string(),
                    )
                    .replace("${member?.toString()}", &user.to_string()),
            )
            .await;
        }
    } else {
        ctx.say(
            crate::lang::get(&code, "unwarn_cannot_found_id")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.No}", &no)
                        // TS interpolates the invoker here, not the target.
                        .replace("${member?.toString()}", &ctx.author().to_string())
                })
                .unwrap_or_else(|| "Warn not found.".to_string()),
        )
        .await?;
    }
    Ok(())
}

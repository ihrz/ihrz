use super::*;
use poise::serenity_prelude as serenity;

/// Clear one user's warns. Mirrors !clearwarn.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "clearwarn",
    aliases("clearwarns", "clearsanctions", "clearsanction"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_clearwarn(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let warn_count = load_warns(&ctx.data().pool, &gid, user.id.get())
        .await
        .len();
    let _ = crate::commands::owner::main::routed_del(
        &ctx.data().pool,
        &gid,
        &gid,
        &warns_key(user.id.get()),
    )
    .await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "clearwarn_command_ok")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${member?.toString()}", &format!("<@{}>", user.id.get()))
                    .replace("${allWarns.length}", &warn_count.to_string())
                    .replace(
                        "${interaction.member.toString()}",
                        &format!("<@{}>", ctx.author().id.get()),
                    )
            })
            .unwrap_or_else(|| "Warns cleared.".to_string()),
    )
    .await?;
    Ok(())
}

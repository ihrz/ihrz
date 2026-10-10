use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "warn",
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_warn(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Reason"] reason: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (id, total) = if let Some(guild_id) = ctx.guild_id() {
        let pool = &ctx.data().pool;
        let lang_code = code.clone();
        let author_top = ctx.author_member().await.map(|m| m.roles.clone());
        let (guild_name, guild_roles) = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                (
                    Some(g.name.clone()),
                    Some(
                        g.roles
                            .iter()
                            .map(|(id, r)| (*id, (r.name.clone(), r.position)))
                            .collect(),
                    ),
                )
            })
            .unwrap_or((None, None));
        warn_member_with_author(
            &WarnContext {
                http: ctx.http(),
                guild_name,
                author_top_roles: author_top,
                guild_roles,
                pool,
                gid: &gid,
                guild_id,
                author_name: &ctx.author().name,
                target: &user,
                reason: &reason,
                lang_code: &lang_code,
            },
            Some(ctx.author().id.get()),
        )
        .await
    } else {
        // DM context: record without the guild DM flourish.
        let pool = &ctx.data().pool;
        let mut warns = load_warns(pool, &gid, uid).await;
        let id = format!("{uid}-{at}", at = 0);
        warns = push_warn(
            warns,
            Warn {
                id: id.clone(),
                reason: reason.clone(),
                at: 0,
                author_id: Some(ctx.author().id.get().to_string()),
            },
        );
        let total = warns.len();
        save_warns(pool, &gid, uid, &warns).await?;
        (id, total)
    };
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "warn_command_work")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${member?.toString()}", &user.to_string())
                    .replace("${reason}", &reason)
                    .replace("${warnId}", &id)
            })
            .unwrap_or_else(|| format!("Warned {} (id {id}, total {total})", user.tag())),
    )
    .await?;
    if let Some(guild_id) = ctx.guild_id() {
        post_mod_log(
            ctx.http(),
            guild_id,
            t("warn_logEmbed_title"),
            t("warn_logEmbed_desc")
                .replace(
                    "${interaction.member.toString()}",
                    &ctx.author().to_string(),
                )
                .replace("${member?.toString()}", &user.to_string())
                .replace("${reason}", &reason),
        )
        .await;
    }
    Ok(())
}

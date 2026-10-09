use super::*;

/// Remove a leash. Mirrors utils !unleash.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unleash",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn unleash(
    ctx: Ctx<'_>,
    #[description = "Member to unleash"] member: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let pairs: Vec<serde_json::Value> = crate::db::kv_get(pool, &gid, "UTILS.LEASH")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let dom = ctx.author().id.get().to_string();
    let sub = member.id.get().to_string();
    if !pairs.iter().any(|p| {
        p.get("dom").and_then(|d| d.as_str()) == Some(dom.as_str())
            && p.get("sub").and_then(|s| s.as_str()) == Some(sub.as_str())
    }) {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "util_unleash_not_in_leash")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| {
                    "${client.iHorizon_Emojis.No} | This user is not on your leash!".to_string()
                }),
        )
        .await?;
        return Ok(());
    }
    let kept: Vec<serde_json::Value> = pairs
        .into_iter()
        .filter(|p| {
            !(p.get("dom").and_then(|d| d.as_str()) == Some(dom.as_str())
                && p.get("sub").and_then(|s| s.as_str()) == Some(sub.as_str()))
        })
        .collect();
    crate::db::kv_set(pool, &gid, "UTILS.LEASH", &serde_json::to_string(&kept)?).await?;
    let yes_mark = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "util_unleash_command_ok")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes_mark))
            .unwrap_or_else(|| "${client.iHorizon_Emojis.Yes} | You have successfully unleashed the user in this guild :)".to_string()),
    )
    .await?;
    Ok(())
}

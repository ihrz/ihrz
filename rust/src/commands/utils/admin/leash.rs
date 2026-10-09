use super::*;

/// Leash a member onto the invoker. Mirrors utils !leash.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "leash",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn leash(
    ctx: Ctx<'_>,
    #[description = "Member to leash"] member: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    // Config cap, mirroring the TS default {maxLeashedByUsers: 3}.
    let max_leashed: usize =
        crate::commands::owner::main::routed_get(pool, &gid, &gid, "UTILS.LEASH_CONFIG")
            .await
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .and_then(|v| {
                v.get("maxLeashedByUsers")
                    .and_then(|m| m.as_u64())
                    .map(|m| m as usize)
            })
            .unwrap_or(3);
    let mut pairs: Vec<serde_json::Value> =
        crate::commands::owner::main::routed_get(pool, &gid, &gid, "UTILS.LEASH")
            .await
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
    let dom = ctx.author().id.get().to_string();
    let sub = member.id.get().to_string();
    let owned: Vec<&serde_json::Value> = pairs
        .iter()
        .filter(|p| p.get("dom").and_then(|d| d.as_str()) == Some(dom.as_str()))
        .collect();
    if owned.len() >= max_leashed {
        ctx.say(
            crate::lang::get(&code, "util_leash_too_naugthy").unwrap_or_else(|| {
                "You little rascal, you can't leash more than 3 people :D".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    if owned
        .iter()
        .any(|p| p.get("sub").and_then(|s| s.as_str()) == Some(sub.as_str()))
    {
        ctx.say(
            crate::lang::get(&code, "util_leah_already_owned")
                .unwrap_or_else(|| "Already leashed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Confirm when the target is not in voice or the invoker is.
    // Mirrors the isInVoiceChannel-gated promptYesOrNo in !leash.ts
    // (danger=false, abort -> util_leash_canceled_leash).
    let in_voice = |user_id: poise::serenity_prelude::UserId| {
        ctx.guild_id()
            .and_then(|g| ctx.cache().guild(g))
            .and_then(|g| g.voice_states.get(&user_id).and_then(|v| v.channel_id))
            .is_some()
    };
    if !in_voice(member.id) || in_voice(ctx.author().id) {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        let warn = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Warning_Icon")
            .await
            .unwrap_or_else(|| "⚠️".to_string());
        let content =
            crate::commands::lang_for(&ctx, "util_leash_confirm_message", "Leash anyway?")
                .await
                .replace("${client.iHorizon_Emojis.No}", &no)
                .replace("${client.iHorizon_Emojis.Warning_Icon}", &warn);
        let yes = crate::commands::lang_for(&ctx, "var_yes", "Yes").await;
        let no = crate::commands::lang_for(&ctx, "var_no", "No").await;
        if !crate::commands::prompt_yes_or_no(&ctx, content, yes, no, false).await? {
            let yes_mark = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
                .await
                .unwrap_or_else(|| "✅".to_string());
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "util_leash_canceled_leash",
                    "Leash configurations canceled.",
                )
                .await
                .replace("${client.iHorizon_Emojis.Yes}", &yes_mark),
            )
            .await?;
            return Ok(());
        }
    }
    pairs.push(serde_json::json!({
        "dom": dom,
        "sub": sub,
        "timestamp": crate::commands::shared::now_ms(),
    }));
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "UTILS.LEASH",
        &serde_json::to_string(&pairs)?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes_mark = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "util_leash_confirmed_leash")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes_mark))
            .unwrap_or_else(|| "${client.iHorizon_Emojis.Yes} | You have successfully leashed the user in this guild :smirk:".to_string()),
    )
    .await?;
    Ok(())
}

use super::*;

/// Stars needed (2-10). Mirrors !threshold.ts (clamped, see clamp_threshold).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "threshold",
    aliases("starboardthreshold"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard_threshold(
    ctx: Ctx<'_>,
    #[description = "Stars needed (2-10)"] amount: i64,
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
    // TS quirk: only out-of-range amounts are stored; in-range amounts
    // echo back while the stored threshold is left untouched.
    let (display, store) = resolve_threshold_reply_and_store(amount);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    if let Some(next) = store {
        cfg.threshold = next;
    }
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "starboard_threshold_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '⭐' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${amount}", &display.to_string());
    ctx.say(text).await?;
    Ok(())
}

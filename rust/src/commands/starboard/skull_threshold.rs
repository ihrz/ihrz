use super::*;

/// Skulls needed (2-10). Mirrors skullboard !threshold.ts (clamped).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "threshold",
    aliases("skullboardthreshold"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_threshold(
    ctx: Ctx<'_>,
    #[description = "Skulls needed (2-10)"] amount: i64,
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
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    if let Some(next) = store {
        cfg.threshold = next;
    }
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "skullboard_threshold_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '💀' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${amount}", &display.to_string());
    ctx.say(text).await?;
    Ok(())
}

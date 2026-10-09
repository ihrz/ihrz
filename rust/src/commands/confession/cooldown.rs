use super::*;

/// Change the cooldown between confessions. Mirrors !cooldown.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "cooldown",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn confession_cooldown(
    ctx: Ctx<'_>,
    #[description = "Cooldown like 3h/30m/10s"] time: String,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let Some(ms) = parse_cooldown_ms(&time) else {
        ctx.say(
            crate::lang::get(&code, "too_new_account_invalid_time_on_enable")
                .unwrap_or_else(|| "The time you entered is not valid! **Example of valid time**: `3h; 30m; 4mo; 4w; 4y` -> 3 hours; 30 minutes; 4 month(s); 4 weeks; 4 years".to_string()),
        )
        .await?;
        return Ok(());
    };
    crate::db::kv_set(pool, &gid, "GUILD.CONFESSION.cooldown", &ms.to_string()).await?;
    ctx.say(beautiful_duration(ms)).await?;
    Ok(())
}

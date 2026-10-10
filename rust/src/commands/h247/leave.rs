use super::*;

/// Table-routed delete with legacy flat-row fallback. Mirrors
/// deleteH247Data in src/core/modules/h247Manager.ts (row removal;
/// the in-memory session maps stay TS-side).
async fn delete_h247(pool: &crate::db::Pool, guild_id: &str) -> anyhow::Result<()> {
    let backend = crate::backends::Backend::sqlite(pool.clone());
    let _ = backend.table(guild_id).delete(H247_KEY).await;
    let _ = crate::db::kv_del(pool, guild_id, H247_KEY).await;
    Ok(())
}

/// Leave predicate (mockable): voice is left only when no music player
/// remains, mirroring `if (!client.player.getPlayer(guild))` in TS !leave.ts.
pub fn should_leave_voice(player_exists: bool) -> bool {
    !player_exists
}

/// Leave the voice channel and disable the 24/7 connection!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "leave",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn h247_leave(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
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
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());

    if !load_h247(&ctx.data().pool, &gid).await.enabled {
        ctx.say(
            crate::lang::get(&code, "h247_leave_not_active")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "The H24/7 module is not currently active.".to_string()),
        )
        .await?;
        return Ok(());
    }

    let outcome: anyhow::Result<()> = async {
        delete_h247(&ctx.data().pool, &gid).await?;
        // In-memory state mirrors deleteH247Data in
        // src/core/modules/h247Manager.ts: drop the parked session
        // mirror and the cached voice-handshake credentials so a later
        // player cannot complete a handshake with stale legs.
        crate::commands::h247::session::clear_guild(guild_id.get()).await;
        crate::lavalink::manager()
            .drop_pending_voice(guild_id.get())
            .await;
        // Leave voice only when no music player remains (TS guard).
        let player_exists = crate::lavalink::manager()
            .snapshot(guild_id.get())
            .await
            .is_some();
        if should_leave_voice(player_exists) {
            crate::lavalink::LavalinkManager::send_voice_state(
                &ctx.serenity_context().shard,
                guild_id.get(),
                None,
            );
        }
        Ok(())
    }
    .await;

    match outcome {
        Ok(()) => {
            ctx.say(
                crate::lang::get(&code, "h247_left")
                    .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
                    .unwrap_or_else(|| "H247 disabled.".to_string()),
            )
            .await?;
        }
        Err(e) => {
            tracing::warn!("h247 leave failed for {gid}: {e:#}");
            ctx.say(
                crate::lang::get(&code, "h247_leave_error")
                    .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                    .unwrap_or_else(|| "An error occurred while disabling H24/7.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leave_voice_only_without_player() {
        assert!(should_leave_voice(false));
        assert!(!should_leave_voice(true));
    }
}

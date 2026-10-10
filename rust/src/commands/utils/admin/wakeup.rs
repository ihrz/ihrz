use super::*;
use poise::serenity_prelude as serenity;

/// Wakeup loop length from !wakeup.ts (`60_000 * 2`).
pub const WAKEUP_LOOP_MS: u64 = 60_000 * 2;

/// Delay between moves from !wakeup.ts (`wait(300)`).
pub const WAKEUP_STEP_MS: u64 = 300;

/// Move a member to your voice channel. Mirrors !wakeup.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wakeup",
    aliases("wake"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn wakeup(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    if user.id == ctx.author().id {
        ctx.say(crate::lang::get(&code, "util_wakeup_yourself").unwrap_or_else(|| {
            "Bro, are you dumb or what? Don't tell me you're sleeping on the keyboard while typing this command lol".to_string()
        }))
        .await?;
        return Ok(());
    }
    let display = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| {
            g.members
                .get(&user.id)
                .map(|m| m.display_name().to_string())
        })
        .or_else(|| user.global_name.clone())
        .unwrap_or_else(|| user.name.clone());
    let not_in_vc = || {
        crate::lang::get(&code, "util_wakeup_not_in_vc")
            .map(|s| s.replace("${user.displayName}", &display))
            .unwrap_or_else(|| "Bro, the bot isn't going to clone ${user.displayName} with the same profile pic and banner to make you think they woke up... They're not even in the VC lol".to_string())
    };
    let victim_in_vc = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.voice_states.get(&user.id).and_then(|v| v.channel_id))
        .is_some();
    if !victim_in_vc {
        ctx.say(not_in_vc()).await?;
        return Ok(());
    }
    // Reply BEFORE moving, like TS (which announces then moves).
    ctx.say(
        crate::lang::get(&code, "util_wakeup_command_work")
            .map(|s| s.replace("${user.toString()}", &format!("<@{}>", user.id.get())))
            .unwrap_or_else(|| "Let's go wake up ${user.toString()}!".to_string()),
    )
    .await?;
    // 2-minute random-channel loop, 300ms between Connect-gated moves.
    let start = std::time::Instant::now();
    let victim = user.id;
    let invoker = ctx.author().id;
    while !wakeup_expired(start.elapsed().as_millis() as u64) {
        let pick = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
            let victim_member = g.members.get(&victim)?;
            let invoker_vc = g.voice_states.get(&invoker).and_then(|v| v.channel_id);
            let victim_vc = g.voice_states.get(&victim).and_then(|v| v.channel_id);
            let _vc = victim_vc?;
            let mut candidates: Vec<serenity::ChannelId> = g
                .channels
                .values()
                .filter(|c| {
                    c.kind == serenity::ChannelType::Voice
                        && Some(c.id) != invoker_vc
                        && g.user_permissions_in(c, victim_member)
                            .contains(serenity::Permissions::CONNECT)
                })
                .map(|c| c.id)
                .collect();
            candidates.sort_unstable();
            choose_candidate(&candidates)
        });
        let Some(target) = pick else { break };
        let _ = guild_id.move_member(ctx.http(), victim, target).await;
        tokio::time::sleep(std::time::Duration::from_millis(WAKEUP_STEP_MS)).await;
    }
    Ok(())
}

/// True once the 2-minute wakeup loop budget is spent.
pub fn wakeup_expired(elapsed_ms: u64) -> bool {
    elapsed_ms >= WAKEUP_LOOP_MS
}

/// Pick a random candidate channel. Sorted input keeps the choice
/// uniform; `None` when there is nothing to move to.
pub fn choose_candidate(candidates: &[serenity::ChannelId]) -> Option<serenity::ChannelId> {
    use rand::seq::SliceRandom;
    candidates.choose(&mut rand::thread_rng()).cloned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loop_budget_is_two_minutes() {
        assert_eq!(WAKEUP_LOOP_MS, 120_000);
        assert!(!wakeup_expired(0));
        assert!(!wakeup_expired(119_999));
        assert!(wakeup_expired(120_000));
    }

    #[test]
    fn step_delay_is_300ms() {
        assert_eq!(WAKEUP_STEP_MS, 300);
    }

    #[test]
    fn candidate_pick_handles_empty() {
        assert_eq!(choose_candidate(&[]), None);
        let one = serenity::ChannelId::new(7);
        assert_eq!(choose_candidate(&[one]), Some(one));
    }
}

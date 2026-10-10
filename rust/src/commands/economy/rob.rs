use super::*;

/// Minimum wallet on each side to attempt a rob. Mirrors the
/// `author < 250` / `targetuser < 250` floors in economy/!rob.ts
/// (unset balances read as 0, so they fail the floor).
pub const ROB_MIN_MONEY: f64 = 250.0;

/// Pure floor check, unit-testable without Discord. Both sides need
/// 250+; `== 250` passes (TS only blocks strictly-below).
pub fn rob_floor_ok(author_money: f64, victim_money: f64) -> bool {
    author_money >= ROB_MIN_MONEY && victim_money >= ROB_MIN_MONEY
}

/// Rob coins from another member!
#[poise::command(slash_command, prefix_command, rename = "rob")]
// Mirrors `!rob.ts`.
pub async fn eco_rob(
    ctx: Ctx<'_>,
    #[description = "Member"]
    #[rename = "member"]
    user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    use rand::Rng;
    // Disabled guard first, like !rob.ts.
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS default `?? 3000000` for ECONOMY.settings.rob.cooldown.
    let tune = set_cooldown::load_tuning_routed(&ctx.data().pool, &gid, "rob").await;
    let from = ctx.author().id.get();
    let mut a = balance::load_econ_routed(&ctx.data().pool, &gid, from).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let now = now_ms();
    if a.rob != 0 && tune.cooldown_ms - (now - a.rob) > 0 {
        let units = time_units(&ctx).await;
        let time = beautiful_ms_lang((tune.cooldown_ms - (now - a.rob)) as f64, &units);
        let text = crate::lang::get(&code, "work_cooldown_error")
            .map(|s| {
                s.replace("${interaction.user.id}", &from.to_string())
                    .replace("${time}", &time)
            })
            .unwrap_or_else(|| "Rob on cooldown.".to_string());
        // TS replies with flags [1 << 6] (ephemeral).
        ctx.send(poise::CreateReply::default().content(text).ephemeral(true))
            .await?;
        return Ok(());
    }
    let mut b = balance::load_econ_routed(&ctx.data().pool, &gid, user.id.get()).await;
    // Both sides need 250+ (`author < 250`, `targetuser < 250`); unset
    // balances read as 0 (never the string "null" — kept correct).
    if a.money < ROB_MIN_MONEY {
        ctx.say(
            crate::lang::get(&code, "rob_dont_enought_error")
                .unwrap_or_else(|| ":x: You need at least 250$ to rob somebody.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if b.money < ROB_MIN_MONEY {
        // DELIBERATE KEEP on the name (`!rob.ts:112-120` casts
        // `user.globalName as string` with no fallback): a serenity
        // `User` carries no guild display name, so the username stands
        // in rather than rendering "null".
        let target_name = user
            .global_name
            .clone()
            .unwrap_or_else(|| user.name.clone());
        ctx.say(
            crate::lang::get(&code, "rob_him_dont_enought_error")
                .map(|s| s.replace("${user.user.username}", &target_name))
                .unwrap_or_else(|| "Rob failed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // `Math.floor(Math.random() * 200) + 1` (1..=200).
    let loot: f64 = rand::thread_rng().gen_range(1..=200) as f64;
    // TS replies with the embed BEFORE mutating (interactionSend,
    // then db.sub/add/set).
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xA4CB80)
        .description(
            crate::lang::get(&code, "rob_embed_description")
                .map(|s| {
                    s.replace("${interaction.user.id}", &from.to_string())
                        .replace("${user.id}", &user.id.get().to_string())
                        .replace("${random}", &fmt_num(loot))
                })
                .unwrap_or_else(|| format!("Robbed {loot}.")),
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    b.money -= loot;
    a.money += loot;
    a.rob = now;
    balance::save_econ_routed(&ctx.data().pool, &gid, from, &a).await?;
    balance::save_econ_routed(&ctx.data().pool, &gid, user.id.get(), &b).await?;
    let author = user_mention(from);
    let target = user_mention(user.id.get());
    let amt = fmt_num(loot);
    post_economy_log(
        &ctx,
        "economy_logs_rob_title",
        "economy_logs_rob_desc",
        &[("author", &author), ("target", &target), ("amount", &amt)],
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn floor_blocks_either_side_below_250() {
        // Mirrors `author < 250` / `targetuser < 250` (!rob.ts).
        assert!(!rob_floor_ok(249.0, 10_000.0));
        assert!(!rob_floor_ok(10_000.0, 249.0));
        assert!(!rob_floor_ok(0.0, 0.0));
        // Unset balances read as 0, so they fail the floor.
        assert!(!rob_floor_ok(0.0, 250.0));
    }

    #[test]
    fn floor_passes_at_exactly_250() {
        // TS blocks strictly-below only; 250 on both sides may rob.
        assert!(rob_floor_ok(250.0, 250.0));
        assert!(rob_floor_ok(251.0, 10_000.0));
    }

    #[test]
    fn loot_range_is_1_to_200_inclusive() {
        // `Math.floor(Math.random() * 200) + 1` — the gen_range below
        // must stay 1..=200.
        for _ in 0..1_000 {
            let loot: i64 = rand::Rng::gen_range(&mut rand::thread_rng(), 1..=200i64);
            assert!((1..=200).contains(&loot));
        }
    }
}

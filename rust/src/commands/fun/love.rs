use super::*;

/// Output filename. Mirrors `name: "love.png"` in `!love.ts`.
pub fn love_output_name() -> &'static str {
    "love.png"
}

/// html2png element selector. Mirrors `images.love` (`love.html`).
pub fn love_template_selector() -> &'static str {
    ".love-container"
}

/// Center heart asset. Mirrors the `{Y}` replace in `images.love`.
pub fn love_heart_url() -> &'static str {
    "https://gitlab.com/ihrz/ihrz/-/raw/production/src/assets/heart.png"
}

/// Render viewport. Mirrors the `width: 1600, height: 600, scaleSize: 1`
/// options in `images.love`.
pub fn love_render_size() -> (u32, u32, u32) {
    (1600, 600, 1)
}

/// Template variables for `love.html`: `{X}`/`{Z}` are the two avatar
/// URLs, `{Y}` is the heart asset.
pub fn love_render_vars(avatar1: &str, avatar2: &str) -> (String, String, String) {
    (
        avatar1.to_string(),
        love_heart_url().to_string(),
        avatar2.to_string(),
    )
}

/// Forced-100% check. Mirrors the `always100.find(...)` in `!love.ts`
/// (`config.command.always100`, exact `"id1xid2"` match in both orders).
pub fn love_is_forced(a: u64, b: u64, always100: &[String]) -> bool {
    let direct = format!("{a}x{b}");
    let swapped = format!("{b}x{a}");
    always100.iter().any(|c| c == &direct || c == &swapped)
}

/// Compatibility roll. Mirrors `Math.floor(Math.random() * 101)` in
/// `!love.ts`: uniform 0..=100, overridden to 100 for forced couples.
pub fn love_roll(a: u64, b: u64, always100: &[String]) -> u64 {
    if love_is_forced(a, b, always100) {
        return 100;
    }
    rand::Rng::gen_range(&mut rand::thread_rng(), 0..=100)
}

/// Fill `love_embed_description`. Mirrors the three TS replaces:
/// `${user1.username}`, `${user2.username}`, `${randomNumber}`.
pub fn love_description(template: &str, user1: &str, user2: &str, score: u64) -> String {
    template
        .replace("${user1.username}", user1)
        .replace("${user2.username}", user2)
        .replace("${randomNumber}", &score.to_string())
}

/// Pick a random guild member's user for the default `user2`.
/// Mirrors `interaction.guild?.members.cache.random()?.user` in `!love.ts`;
/// `None` when outside a guild or the cache is empty (caller falls back
/// to the author).
fn random_guild_user(ctx: &Ctx<'_>) -> Option<poise::serenity_prelude::User> {
    let gid = ctx.guild_id()?;
    let guild = ctx.serenity_context().cache.guild(gid)?;
    let members: Vec<_> = guild.members.values().collect();
    if members.is_empty() {
        return None;
    }
    let idx = rand::random::<usize>() % members.len();
    Some(members[idx].user.clone())
}

/// Love command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "love")]
pub async fn love(
    ctx: Ctx<'_>,
    #[description = "First user"] user1: Option<poise::serenity_prelude::User>,
    #[description = "Second user"] user2: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Both options are optional in TS: user1 defaults to the invoker,
    // user2 to a random guild member.
    let u1 = user1.unwrap_or_else(|| ctx.author().clone());
    let u2 = user2
        .or_else(|| random_guild_user(&ctx))
        .unwrap_or_else(|| ctx.author().clone());
    let score = love_roll(u1.id.get(), u2.id.get(), &[]);
    let (_x, _y, _z) = love_render_vars(&u1.face(), &u2.face());
    // Image render (`html2png` love template, `.love-container`,
    // `love.png`) pending; the embed shape (pink, title, description,
    // timestamp) is ported.
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xFFC0CB)
        .title("💕")
        .description(love_description(
            &crate::lang::get(&code, "love_embed_description").unwrap_or_else(|| {
                "**${user1.username}** + **${user2.username}** = __${randomNumber}%__ of love 💗"
                    .to_string()
            }),
            &u1.name,
            &u2.name,
            score,
        ))
        .timestamp(poise::serenity_prelude::Timestamp::now());
    if let Err(error) = ctx.send(poise::CreateReply::default().embed(embed)).await {
        tracing::warn!("love reply failed: {error}");
        ctx.say(
            crate::lang::get(&code, "love_command_error").unwrap_or_else(|| {
                "An error occurred while trying to create the image".to_string()
            }),
        )
        .await?;
    }
    Ok(())
}

#[cfg(test)]
mod love_tests {
    use super::*;

    #[test]
    fn love_shape_matches_ts() {
        assert_eq!(love_output_name(), "love.png");
        assert_eq!(love_template_selector(), ".love-container");
        assert_eq!(
            love_heart_url(),
            "https://gitlab.com/ihrz/ihrz/-/raw/production/src/assets/heart.png"
        );
        assert_eq!(love_render_size(), (1600, 600, 1));
        let (x, y, z) = love_render_vars("a1", "a2");
        assert_eq!(
            (x.as_str(), y.as_str(), z.as_str()),
            ("a1", love_heart_url(), "a2")
        );
    }

    #[test]
    fn description_fills_all_three_tokens() {
        let out = love_description(
            "**${user1.username}** + **${user2.username}** = __${randomNumber}%__",
            "ann",
            "bob",
            42,
        );
        assert_eq!(out, "**ann** + **bob** = __42%__");
    }

    #[test]
    fn forced_couples_score_100_both_orders() {
        let list = vec!["1x2".to_string()];
        assert!(love_is_forced(1, 2, &list));
        assert!(love_is_forced(2, 1, &list));
        assert!(!love_is_forced(1, 3, &list));
        assert!(!love_is_forced(1, 2, &[]));
        assert_eq!(love_roll(1, 2, &list), 100);
        assert_eq!(love_roll(2, 1, &list), 100);
    }

    #[test]
    fn roll_is_bounded() {
        for _ in 0..50 {
            assert!(love_roll(7, 9, &[]) <= 100);
        }
    }
}

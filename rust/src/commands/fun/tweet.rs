use super::*;

/// `twitterCommentCard` HTML template
/// (`src/assets/html/twitterCommentCard.html`, TS `!tweet.ts:85`).
const TWEET_CARD_TEMPLATE: &str =
    include_str!("../../../../src/assets/html/twitterCommentCard.html");

/// html2png options mirror (TS `!tweet.ts:105-112`).
const TWEET_OPTIONS_JSON: &str = r#"{"omitBackground":true,"selectElement":true,"elementSelector":".tweet-card","width":1200,"height":500,"scaleSize":3}"#;

/// Every template value for the `twitterCommentCard` card.
pub struct TweetCardData {
    pub tweet: String,
    pub ago: String,
    pub pfp: String,
    pub displayname: String,
    pub handle: String,
    pub likes: String,
    pub retweets: String,
    pub replies: String,
    pub views: String,
}

/// Fill the `twitterCommentCard` template. Mirrors the replace chain
/// in TS `!tweet.ts:85-103` (`replaceAll` throughout; `{ago}` is the
/// hardcoded `"2h"`).
pub fn tweet_card_html(d: &TweetCardData) -> String {
    TWEET_CARD_TEMPLATE
        .replace("{tweet}", &d.tweet)
        .replace("{ago}", &d.ago)
        .replace("{pfp}", &d.pfp)
        .replace("{displayname}", &d.displayname)
        .replace("{handle}", &d.handle)
        .replace("{likes}", &d.likes)
        .replace("{retweets}", &d.retweets)
        .replace("{replies}", &d.replies)
        .replace("{views}", &d.views)
}

/// Prefix gate mirroring `checkCommandArgs` (method.ts:493-557) for the
/// tweet leaf. Both TS options are required (`user` User, `comment`
/// String longString). Fewer than 2 tokens is the missing-arg leg
/// (caret at the missing index via `prefix_usage_denial` with no input,
/// like the bare/single-token prod legs). A first token failing the TS
/// `isValidArgument` "user" leg (method.ts:598-604: `<@id>`/`<@!id>`
/// mention, numeric id, or exact cached-member username) is the caret
/// usage embed on `[user]` (`prefix_usage_denial` with the offending
/// token — prod WAVE-HD answers `.fun image tweet parity check` with
/// `+tweet [user] [string]`, caret on `[user]`).
/// Without this head, poise `Option<User>` backtracking swallows the
/// bad token into `comment` and renders a card prod never reaches.
#[derive(Debug, PartialEq, Eq)]
pub enum TweetPrefixGate {
    Proceed,
    MissingArgs,
    BadUser(String),
}

pub fn tweet_prefix_gate(
    tokens: &[String],
    member_username_known: impl Fn(&str) -> bool,
) -> TweetPrefixGate {
    if tokens.len() < 2 {
        return TweetPrefixGate::MissingArgs;
    }
    if !tweet_first_token_is_user(&tokens[0], &member_username_known) {
        return TweetPrefixGate::BadUser(tokens[0].clone());
    }
    TweetPrefixGate::Proceed
}

/// TS `isValidArgument` "user" leg (method.ts:598-604) via the shared
/// decision helper (mention, JS-numeric id, or exact cached-member
/// username); `member_username_known` is the Discord-bound username
/// find, taken from the guild cache by the caller.
fn tweet_first_token_is_user(token: &str, member_username_known: impl Fn(&str) -> bool) -> bool {
    crate::bot::prefix_args::is_valid_user_arg(token, member_username_known(token))
}

/// Permit to send custom tweet !
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "tweet",
    description_localized("fr", "Permis d'envoyer un tweet personnalisé"),
    description_localized("ja", "カスタムツイートを送信可能に！"),
    description_localized("ru", "Разрешить отправку пользовательского твита!"),
    description_localized("es-ES", "Permitir enviar tweet personalizado!")
)]
pub async fn tweet(
    ctx: Ctx<'_>,
    // Optional on prefix (falls back to the invoker like the TS
    // `|| interaction.author` path in !tweet.ts); the TS slash schema
    // marks `user` required:true (fun.ts) so slash callers always pass it.
    #[description_localized("fr", "L'utilisateur")]
    #[description_localized("ja", "ユーザー")]
    #[description_localized("ru", "Пользователь")]
    #[description_localized("es-ES", "El usuario")]
    #[description = "The user"]
    user: Option<poise::serenity_prelude::User>,
    // `#[rest]` so prefix keeps multi-word comments like the TS
    // `longString(args, 1)` path (slash uses `getString("comment")`).
    #[description_localized("fr", "Le commentaire")]
    #[description_localized("ja", "コメント")]
    #[description_localized("ru", "Комментарий")]
    #[description_localized("es-ES", "El comentario")]
    #[description = "The comment"]
    #[rest]
    comment: String,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    // Prefix checkCommandArgs head (method.ts:493-557): both TS options
    // are required, and the first must pass the "user" leg before the
    // handler runs — poise `Option<User>` backtracking would otherwise
    // swallow a bad first token into `comment` and render a card prod
    // answers with the caret usage embed instead (WAVE-HD).
    if let poise::Context::Prefix(pctx) = ctx {
        let tokens = crate::bot::prefix_args::split_caret_args(pctx.args);
        let gate = tweet_prefix_gate(&tokens, |name| {
            ctx.guild_id()
                .and_then(|gid| ctx.serenity_context().cache.guild(gid))
                .is_some_and(|g| g.members.values().any(|m| m.user.name == name))
        });
        match gate {
            TweetPrefixGate::Proceed => {}
            TweetPrefixGate::MissingArgs => {
                crate::bot::prefix_usage_denial(ctx, None).await;
                return Ok(());
            }
            TweetPrefixGate::BadUser(tok) => {
                crate::bot::prefix_usage_denial(ctx, Some(tok)).await;
                return Ok(());
            }
        }
    }
    let user = user.as_ref().unwrap_or_else(|| ctx.author());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // NOTE: `!tweet.ts` gates on `messageArgs.length < 1`, but
    // `"".split(" ")` yields `[""]`, so the gate never fires: TS accepts
    // whitespace-only comments and so do we (no `has_comment` gate).
    // Display preference mirrors `user.globalName || user.displayName ||
    // user.username` (serenity `display_name()` is global-name-or-username),
    // truncated at 15 chars. Comment, display name and handle all go
    // through `sanitizing` like the TS `sanitizing(...)` replaces, so raw
    // mentions/markdown cannot leak into the template.
    let display = crate::funcs::sanitizing(&tweet_display_name(user));
    let handle = tweet_handle(&crate::funcs::sanitizing(&user.name));
    let comment = crate::funcs::sanitizing(&comment);
    // Four independent `rand` draws; every stat goes through the number
    // beautifier like the TS `{likes}`/`{retweets}`/`{replies}`/`{views}`
    // replaces (`client.func.numberBeautifuer`).
    let s = tweet_stats();
    let likes = crate::funcs::format_number(s.likes as f64);
    let retweets = crate::funcs::format_number(s.retweets as f64);
    let replies = crate::funcs::format_number(s.replies as f64);
    let views = crate::funcs::format_number(s.views as f64);
    // Card leg (`!tweet.ts:85-112`): the filled `twitterCommentCard`
    // through HorizonGateway, attached as `twitter.png` on a
    // black embed like TS. Gateway unset/fail keeps the text reply.
    let card = TweetCardData {
        tweet: comment.clone(),
        ago: "2h".to_string(),
        // Mirrors `displayAvatarURL({extension:"png", size:1024})`.
        pfp: avatar_png_url(user, 1024),
        displayname: display.clone(),
        handle: handle.clone(),
        likes: likes.clone(),
        retweets: retweets.clone(),
        replies: replies.clone(),
        views: views.clone(),
    };
    if let Some(base) = ctx.data().config.gateway_internal() {
        let token = crate::config::api_token().unwrap_or_default();
        let html = tweet_card_html(&card);
        if let Ok(png) = crate::funcs::gateway_render_html(
            &base,
            &token,
            &html,
            TWEET_OPTIONS_JSON,
            &[],
            Some(std::time::Duration::from_secs(30)),
        )
        .await
        {
            use poise::serenity_prelude as serenity;
            let gid_str = ctx
                .guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default();
            let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid_str).await;
            let mut embed = serenity::CreateEmbed::default()
                .colour(0x000000)
                .image("attachment://twitter.png")
                .timestamp(serenity::Timestamp::now());
            embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some());
            let mut reply = poise::CreateReply::default()
                .embed(embed)
                .attachment(serenity::CreateAttachment::bytes(png, "twitter.png"));
            if let Some(bytes) = fbytes {
                reply =
                    reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
            }
            ctx.send(reply).await?;
            return Ok(());
        }
    }
    ctx.say(crate::lang::get(&code, "fun_tweet_pending")
            .map(|t| {
                t.replace("${display}", &display)
                    .replace("${handle}", &handle)
                    .replace("${comment}", &comment)
                    .replace("${likes}", &likes)
                    .replace("${retweets}", &retweets)
                    .replace("${replies}", &replies)
                    .replace("${views}", &views)
            })
            .unwrap_or_else(|| {
                format!(
                    "{display} {handle}: {comment} ({likes} likes, {retweets} RTs, {replies} replies, {views} views, render pending)"
                )
            }),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tweet_card_tests {
    use super::*;

    #[test]
    fn fill_replaces_every_placeholder() {
        let d = TweetCardData {
            tweet: "hello".to_string(),
            ago: "2h".to_string(),
            pfp: "P".to_string(),
            displayname: "bob".to_string(),
            handle: "@bob".to_string(),
            likes: "1K".to_string(),
            retweets: "2K".to_string(),
            replies: "3".to_string(),
            views: "4K".to_string(),
        };
        let html = tweet_card_html(&d);
        for ph in [
            "{tweet}",
            "{ago}",
            "{pfp}",
            "{displayname}",
            "{handle}",
            "{likes}",
            "{retweets}",
            "{replies}",
            "{views}",
        ] {
            assert!(!html.contains(ph), "placeholder left: {ph}");
        }
        assert!(html.contains("hello"));
    }

    #[test]
    fn prefix_gate_mirrors_check_command_args() {
        use TweetPrefixGate::*;
        let toks = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        fn nobody(_: &str) -> bool {
            false
        }
        // Fewer than 2 tokens (both TS options required): missing leg.
        assert_eq!(tweet_prefix_gate(&toks(&[]), nobody), MissingArgs);
        assert_eq!(tweet_prefix_gate(&toks(&["<@123>"]), nobody), MissingArgs);
        assert_eq!(tweet_prefix_gate(&toks(&["hello"]), nobody), MissingArgs);
        // Unresolvable first token: BadUser (prod WAVE-HD answers the
        // caret usage embed on `[user]`, never a card).
        assert_eq!(
            tweet_prefix_gate(&toks(&["parity", "check"]), nobody),
            BadUser("parity".to_string())
        );
        assert_eq!(
            tweet_prefix_gate(&toks(&["<@abc>", "hi"]), nobody),
            BadUser("<@abc>".to_string())
        );
        // Mention / numeric id / known username: proceed.
        assert_eq!(
            tweet_prefix_gate(&toks(&["<@324942190222770176>", "hello"]), nobody),
            Proceed
        );
        assert_eq!(
            tweet_prefix_gate(&toks(&["<@!324942190222770176>", "hello"]), nobody),
            Proceed
        );
        assert_eq!(
            tweet_prefix_gate(&toks(&["324942190222770176", "hello"]), nobody),
            Proceed
        );
        assert_eq!(
            tweet_prefix_gate(&toks(&["somemember", "hello"]), |n| n == "somemember"),
            Proceed
        );
        assert_eq!(
            tweet_prefix_gate(&toks(&["somemember", "hello"]), nobody),
            BadUser("somemember".to_string())
        );
    }

    #[test]
    fn slash_option_names_match_ts() {
        // Poise 0.6 sorts optional params last in `parameters`
        // ([comment, user]), while the TS fun.ts tweet options — and the
        // prod usage line (WAVE-HD `[user] [string]`) — keep declaration
        // order; `ts_param_order` restores it for the denial render.
        let cmd = tweet();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["comment", "user"]);
        assert_eq!(
            crate::bot::prefix_args::ts_param_order("fun image tweet"),
            Some(&["user", "comment"][..])
        );
        assert_eq!(
            crate::bot::prefix_args::ts_param_order("fun image other"),
            None
        );
    }
}

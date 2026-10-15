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
}

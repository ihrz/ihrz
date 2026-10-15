use super::*;

/// `youtubeCommentCard` HTML template
/// (`src/assets/html/youtubeCommentCard.html`, TS `!youtube.ts:82`).
const YOUTUBE_CARD_TEMPLATE: &str =
    include_str!("../../../../src/assets/html/youtubeCommentCard.html");

/// html2png options mirror (TS `!youtube.ts:93-99`).
const YOUTUBE_OPTIONS_JSON: &str = r#"{"omitBackground":true,"selectElement":true,"elementSelector":".comment","width":800,"height":200,"scaleSize":1.2}"#;

/// Every template value for the `youtubeCommentCard` card.
pub struct YoutubeCardData {
    pub comment: String,
    pub ago: String,
    pub pfp: String,
    pub displayname: String,
    pub likes: String,
    pub reply: String,
}

/// Fill the `youtubeCommentCard` template. Mirrors the replace chain
/// in TS `!youtube.ts:82-91` (single `replace` per slot;
/// `{ago}` is the hardcoded `"2 hours ago"`, `{reply}` the
/// hardcoded `"REPLY"`).
pub fn youtube_card_html(d: &YoutubeCardData) -> String {
    YOUTUBE_CARD_TEMPLATE
        .replace("{comment}", &d.comment)
        .replace("{ago}", &d.ago)
        .replace("{pfp}", &d.pfp)
        .replace("{displayname}", &d.displayname)
        .replace("{likes}", &d.likes)
        .replace("{reply}", &d.reply)
}

/// Permit to send custom youtube comment (real) !
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "youtube",
    description_localized("fr", "Permis d'envoyer un commentaire YouTube personnalisé (réel)"),
    description_localized("ja", "カスタムYouTubeコメントを送信可能に（実際のコメント）！"),
    description_localized(
        "ru",
        "Разрешить отправку пользовательского комментария YouTube (настоящего)!"
    ),
    description_localized("es-ES", "Permitir enviar comentario personalizado de YouTube (real)!")
)]
pub async fn youtube(
    ctx: Ctx<'_>,
    // Optional on prefix (falls back to the invoker like the TS
    // `|| interaction.author` path in !youtube.ts); the TS slash schema
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
    // NOTE: `!youtube.ts` gates on `messageArgs.length < 1`, but
    // `"".split(" ")` yields `[""]`, so the gate never fires: TS accepts
    // whitespace-only comments and so do we (no `has_comment` gate).
    // Mirrors `user.globalName || user.username` (required target user),
    // truncated at 15 chars, then `sanitizing(...)` like the TS
    // `{displayname}` replace so raw mentions/markdown cannot leak.
    let display = crate::funcs::sanitizing(&youtube_display_name(
        user.global_name.as_deref(),
        &user.name,
    ));
    let likes = crate::funcs::format_number(youtube_likes() as f64);
    let sanitized_comment = crate::funcs::sanitizing(&comment);
    // Card leg (`!youtube.ts:82-99`): the filled `youtubeCommentCard`
    // through HorizonGateway, attached as `youtube.png` on a near-black
    // embed like TS. Gateway unset/fail keeps the text reply.
    let card = YoutubeCardData {
        comment: sanitized_comment.clone(),
        ago: "2 hours ago".to_string(),
        // Mirrors `displayAvatarURL({extension:"png", size:1024})`.
        pfp: avatar_png_url(user, 1024),
        displayname: display.clone(),
        likes: likes.clone(),
        reply: "REPLY".to_string(),
    };
    if let Some(base) = ctx.data().config.gateway_internal() {
        let token = crate::config::api_token().unwrap_or_default();
        let html = youtube_card_html(&card);
        if let Ok(png) = crate::funcs::gateway_render_html(
            &base,
            &token,
            &html,
            YOUTUBE_OPTIONS_JSON,
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
                .colour(0x010101)
                .image("attachment://youtube.png")
                .timestamp(serenity::Timestamp::now());
            embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some());
            let mut reply = poise::CreateReply::default()
                .embed(embed)
                .attachment(serenity::CreateAttachment::bytes(png, "youtube.png"));
            if let Some(bytes) = fbytes {
                reply =
                    reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
            }
            ctx.send(reply).await?;
            return Ok(());
        }
    }
    ctx.say(
        crate::lang::get(&code, "fun_youtube_pending")
            .map(|s| {
                s.replace("${display}", &display)
                    // Mirrors `.replace("{comment}", sanitizing(...))`.
                    .replace("${comment}", &sanitized_comment)
                    .replace("${likes}", &likes)
            })
            .unwrap_or_else(|| format!("{display}: {comment} ({likes} likes, render pending)")),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod youtube_card_tests {
    use super::*;

    #[test]
    fn fill_replaces_every_placeholder() {
        let d = YoutubeCardData {
            comment: "nice".to_string(),
            ago: "2 hours ago".to_string(),
            pfp: "P".to_string(),
            displayname: "bob".to_string(),
            likes: "1K".to_string(),
            reply: "REPLY".to_string(),
        };
        let html = youtube_card_html(&d);
        for ph in [
            "{comment}",
            "{ago}",
            "{pfp}",
            "{displayname}",
            "{likes}",
            "{reply}",
        ] {
            assert!(!html.contains(ph), "placeholder left: {ph}");
        }
        assert!(html.contains("nice"));
    }
}

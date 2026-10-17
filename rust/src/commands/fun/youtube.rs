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

/// Prefix gate mirroring `checkCommandArgs` (method.ts:493-557) for the
/// youtube leaf. Both TS options are required (`user` User, `comment`
/// String longString; fun.ts youtube decl). Fewer than 2 tokens is the
/// missing-arg leg (caret at the missing index via `prefix_usage_denial`
/// with no input — prod WAVE-HI answers
/// `.fun image youtube notaproperuser123` with
/// `+youtube [user] [string]`, caret on `[string]`). A first token
/// failing the TS `isValidArgument` "user" leg (method.ts:598-604:
/// `<@id>`/`<@!id>` mention, numeric id, or exact cached-member
/// username) is the caret usage embed on `[user]`
/// (`prefix_usage_denial` with the offending token).
/// Without this head, poise `Option<User>` backtracking swallows the
/// bad token into `comment` and renders a card prod never reaches
/// (same latent class as the tweet WAVE-HD fix).
#[derive(Debug, PartialEq, Eq)]
pub enum YoutubePrefixGate {
    Proceed,
    MissingArgs,
    BadUser(String),
}

pub fn youtube_prefix_gate(
    tokens: &[String],
    member_username_known: impl Fn(&str) -> bool,
) -> YoutubePrefixGate {
    if tokens.len() < 2 {
        return YoutubePrefixGate::MissingArgs;
    }
    if !youtube_first_token_is_user(&tokens[0], &member_username_known) {
        return YoutubePrefixGate::BadUser(tokens[0].clone());
    }
    YoutubePrefixGate::Proceed
}

/// TS `isValidArgument` "user" leg (method.ts:598-604) via the shared
/// decision helper (mention, JS-numeric id, or exact cached-member
/// username); `member_username_known` is the Discord-bound username
/// find, taken from the guild cache by the caller.
fn youtube_first_token_is_user(token: &str, member_username_known: impl Fn(&str) -> bool) -> bool {
    crate::bot::prefix_args::is_valid_user_arg(token, member_username_known(token))
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
    // Prefix checkCommandArgs head (method.ts:493-557): both TS options
    // are required, and the first must pass the "user" leg before the
    // handler runs — poise `Option<User>` backtracking would otherwise
    // swallow a bad first token into `comment` and render a card prod
    // answers with the caret usage embed instead (WAVE-HI, same class
    // as the tweet WAVE-HD fix).
    if let poise::Context::Prefix(pctx) = ctx {
        let tokens = crate::bot::prefix_args::split_caret_args(pctx.args);
        let gate = youtube_prefix_gate(&tokens, |name| {
            ctx.guild_id()
                .and_then(|gid| ctx.serenity_context().cache.guild(gid))
                .is_some_and(|g| g.members.values().any(|m| m.user.name == name))
        });
        match gate {
            YoutubePrefixGate::Proceed => {}
            YoutubePrefixGate::MissingArgs => {
                crate::bot::prefix_usage_denial(ctx, None).await;
                return Ok(());
            }
            YoutubePrefixGate::BadUser(tok) => {
                crate::bot::prefix_usage_denial(ctx, Some(tok)).await;
                return Ok(());
            }
        }
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

    #[test]
    fn prefix_gate_mirrors_check_command_args() {
        use YoutubePrefixGate::*;
        let toks = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        fn nobody(_: &str) -> bool {
            false
        }
        // Fewer than 2 tokens (both TS options required): missing leg
        // (caret on `[string]` — prod WAVE-HI answers the single-token
        // leg with `+youtube [user] [string]`, caret at index 1).
        assert_eq!(youtube_prefix_gate(&toks(&[]), nobody), MissingArgs);
        assert_eq!(youtube_prefix_gate(&toks(&["<@123>"]), nobody), MissingArgs);
        assert_eq!(
            youtube_prefix_gate(&toks(&["notaproperuser123"]), nobody),
            MissingArgs
        );
        // Unresolvable first token: BadUser (caret usage embed on
        // `[user]`, never a card).
        assert_eq!(
            youtube_prefix_gate(&toks(&["parity", "check"]), nobody),
            BadUser("parity".to_string())
        );
        assert_eq!(
            youtube_prefix_gate(&toks(&["<@abc>", "hi"]), nobody),
            BadUser("<@abc>".to_string())
        );
        // Mention / numeric id / known username: proceed.
        assert_eq!(
            youtube_prefix_gate(&toks(&["<@324942190222770176>", "hello"]), nobody),
            Proceed
        );
        assert_eq!(
            youtube_prefix_gate(&toks(&["<@!324942190222770176>", "hello"]), nobody),
            Proceed
        );
        assert_eq!(
            youtube_prefix_gate(&toks(&["324942190222770176", "hello"]), nobody),
            Proceed
        );
        assert_eq!(
            youtube_prefix_gate(&toks(&["somemember", "hello"]), |n| n == "somemember"),
            Proceed
        );
        assert_eq!(
            youtube_prefix_gate(&toks(&["somemember", "hello"]), nobody),
            BadUser("somemember".to_string())
        );
    }

    #[test]
    fn slash_option_names_match_ts() {
        // Poise 0.6 sorts optional params last in `parameters`
        // ([comment, user]), while the TS fun.ts youtube options — and
        // the prod usage line (WAVE-HI `[user] [string]`) — keep
        // declaration order; `ts_param_order` restores it for the
        // denial render.
        let cmd = youtube();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["comment", "user"]);
        assert_eq!(
            crate::bot::prefix_args::ts_param_order("fun image youtube"),
            Some(&["user", "comment"][..])
        );
        assert_eq!(
            crate::bot::prefix_args::ts_param_order("fun image other"),
            None
        );
    }
}

use super::*;
use poise::serenity_prelude as serenity;

/// warn a user
#[poise::command(
    slash_command,
    prefix_command,
    rename = "warn",
    default_member_permissions = "MODERATE_MEMBERS",
    description_localized("fr", "avertir un utilisateur"),
    description_localized("ja", "ユーザーを警告"),
    description_localized("ru", "предупредить пользователя"),
    description_localized("es-ES", "advertir a un usuario")
)]
pub async fn mod_warn(
    ctx: Ctx<'_>,
    // Optional here (TS `method.member` can return null on prefix), but
    // the slash option stays effectively required: a missing entity is
    // answered with the TS `ban_dont_found_member` reply below.
    #[description_localized("fr", "le membre que vous voulez signaler")]
    #[description_localized("ja", "警告したいメンバー")]
    #[description_localized("ru", "Участник для предупреждения")]
    #[description_localized("es-ES", "El miembro al que quieres advertir")]
    #[description = "The member you want to warn"]
    member: Option<crate::reply_user::ReplyUser>,
    #[description_localized("fr", "La raison du warn")]
    #[description_localized("ja", "このメンバーを警告する理由")]
    #[description_localized("ru", "Причина предупреждения этого участника")]
    #[description_localized("es-ES", "La razón por la que quieres advertir a este miembro")]
    #[description = "The reason why you want to warn this member"]
    reason: String,
) -> Result<(), anyhow::Error> {
    // Prefix count-check first (mirrors checkCommandArgs in
    // method.ts:500-514 — counts before per-arg validation). Poise
    // backtracks `Option<User>` greedily: with only a mention present
    // the member parse succeeds, `reason` then fails, and poise
    // retries with member=None + reason=mention, reaching the
    // not-found leg for a present member. Fewer than 2 tokens means
    // the required reason is missing → caret usage embed (prod
    // behavior for `.warn @X`), never the member reply.
    if let poise::Context::Prefix(pctx) = ctx {
        if !warn_prefix_complete(pctx.args) {
            crate::bot::prefix_usage_denial(ctx, None).await;
            return Ok(());
        }
    }
    // Ack first: mod.ts sets `thinking: true`, so TS defers the slash
    // reply before running; defer here for the same 3s window.
    ctx.defer().await?;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let Some(member) = member else {
        // Mirrors `if (!member)` in !warn.ts.
        reply_member_not_found(
            &ctx,
            &code,
            "ban_dont_found_member",
            "🔍 | Cannot find this member",
        )
        .await?;
        return Ok(());
    };
    let uid = member.id.get();
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (id, total) = if let Some(guild_id) = ctx.guild_id() {
        let pool = &ctx.data().pool;
        let lang_code = code.clone();
        let author_top = ctx.author_member().await.map(|m| m.roles.clone());
        let (guild_name, guild_roles) = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                (
                    Some(g.name.clone()),
                    Some(
                        g.roles
                            .iter()
                            .map(|(id, r)| (*id, (r.name.clone(), r.position)))
                            .collect(),
                    ),
                )
            })
            .unwrap_or((None, None));
        warn_member_with_author(
            &WarnContext {
                http: ctx.http(),
                guild_name,
                author_top_roles: author_top,
                guild_roles,
                pool,
                gid: &gid,
                guild_id,
                author_name: &ctx.author().name,
                target: &member,
                reason: &reason,
                lang_code: &lang_code,
            },
            Some(ctx.author().id.get()),
        )
        .await
    } else {
        // DM context: record without the guild DM flourish.
        let pool = &ctx.data().pool;
        let mut warns = load_warns(pool, &gid, uid).await;
        let id = format!("{uid}-{at}", at = 0);
        warns = push_warn(
            warns,
            Warn {
                id: id.clone(),
                reason: reason.clone(),
                at: 0,
                author_id: Some(ctx.author().id.get().to_string()),
            },
        );
        let total = warns.len();
        save_warns(pool, &gid, uid, &warns).await?;
        (id, total)
    };
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "warn_command_work")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${member?.toString()}", &member.to_string())
                    .replace("${reason}", &reason)
                    .replace("${warnId}", &id)
            })
            .unwrap_or_else(|| format!("Warned {} (id {id}, total {total})", member.tag())),
    )
    .await?;
    if let Some(guild_id) = ctx.guild_id() {
        post_mod_log(
            ctx.http(),
            guild_id,
            t("warn_logEmbed_title"),
            t("warn_logEmbed_desc")
                .replace(
                    "${interaction.member.toString()}",
                    &ctx.author().to_string(),
                )
                .replace("${member?.toString()}", &member.to_string())
                .replace("${reason}", &reason),
        )
        .await;
    }
    Ok(())
}

/// Prefix completeness gate: member + reason (2 whitespace-separated
/// tokens minimum). Below that the required reason is missing, so the
/// caller renders the caret usage embed instead of letting poise's
/// `Option<User>` backtrack steal the lone mention into `reason` and
/// hit the member-not-found leg for a present member.
pub fn warn_prefix_complete(args: &str) -> bool {
    args.split_whitespace().count() >= 2
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slash_option_names_match_ts() {
        // TS mod.ts warn options: member, reason. Poise lists required
        // slash options first, so `reason` (still required) precedes
        // `member` (optional so prefix can hit the TS not-found reply);
        // prefix parsing still takes member first like TS
        // `method.member(args, 0)`.
        let cmd = mod_warn();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["reason", "member"]);
    }

    #[test]
    fn warn_prefix_completeness_gate() {
        assert!(!warn_prefix_complete(""));
        assert!(!warn_prefix_complete("<@123>"));
        assert!(warn_prefix_complete("<@123> rrr"));
        assert!(warn_prefix_complete("<@123> some longer reason"));
    }
}

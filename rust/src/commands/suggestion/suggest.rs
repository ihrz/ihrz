use super::*;
use poise::serenity_prelude as serenity;

/// Subcommand for suggest category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "suggestion",
    rename = "suggest",
    subcommands("suggest_accept", "suggest_deny", "suggest_delete", "suggest_reply"),
    subcommand_required
)]
pub async fn suggest(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// One moderation action. Mirrors !accept/!deny/!reply.ts: embed addFields
/// + color + title, `replied` dual-write, thread lock.
struct Moderation {
    /// Lang-key stem: "accept" | "deny" | "reply".
    kind: &'static str,
    /// Stored status string (dual-written with the TS `replied` flag).
    status: &'static str,
    /// Embed color (#21744c accept, #f13b38 deny, #8afe46 reply).
    color: u32,
}

const ACCEPT: Moderation = Moderation {
    kind: "accept",
    status: "accepted",
    color: SUGGEST_ACCEPT_COLOR,
};
const DENY: Moderation = Moderation {
    kind: "deny",
    status: "denied",
    color: SUGGEST_DENY_COLOR,
};
const REPLY: Moderation = Moderation {
    kind: "reply",
    status: "replied",
    color: SUGGEST_REPLY_COLOR,
};

/// Ephemeral text reply. Mirrors the `flags: [1 << 6]` on every TS
/// suggest `editReply` (all suggestion replies are ephemeral).
async fn say_eph(ctx: &Ctx<'_>, text: String) -> Result<(), anyhow::Error> {
    ctx.send(poise::CreateReply::default().content(text).ephemeral(true))
        .await?;
    Ok(())
}

/// Channel/disabled guard. Mirrors the `!baseData || channel mismatch ||
/// disable` early return in !accept/!deny/!reply/!delete.ts.
fn guard_channel(suggest_channel: Option<&str>, disabled: bool, current: &str) -> bool {
    match suggest_channel {
        Some(ch) => ch != current || disabled,
        None => true,
    }
}

/// not_good_channel text with `${baseData?.channel}` filled.
async fn bad_channel_text(ctx: &Ctx<'_>, kind: &str, channel: Option<&str>) -> String {
    let key = format!("suggest_{kind}_not_good_channel");
    let fallback = "This command needs to be run in the Suggestion Module's channel!";
    crate::commands::lang_for(ctx, &key, fallback)
        .await
        .replace("${baseData?.channel}", channel.unwrap_or("unknown"))
}

/// command_work text with guild/channel/message ids filled.
fn work_text(template: String, guild_id: &str, channel_id: &str, msg_id: &str) -> String {
    template
        .replace("${interaction.guild.id}", guild_id)
        .replace("${interaction.channel.id}", channel_id)
        .replace("${fetchId?.msgId}", msg_id)
}

/// Rebuild the suggestion embed from the posted one with the staff
/// response field, the action color and the action title. Mirrors
/// `new EmbedBuilder(msg.embeds[0].data)` + addFields + setColor +
/// setTitle in !accept/!deny/!reply.ts.
fn restyle_suggest_embed(
    posted: &serenity::Embed,
    action: &Moderation,
    field_name: String,
    field_value: &str,
    title: String,
) -> serenity::CreateEmbed {
    let mut out = serenity::CreateEmbed::default()
        .description(posted.description.clone().unwrap_or_default());
    for f in &posted.fields {
        out = out.field(f.name.clone(), f.value.clone(), f.inline);
    }
    out = out.field(field_name, field_value.to_string(), false);
    out = out.title(title).colour(action.color);
    if let Some(author) = &posted.author {
        let mut a = serenity::CreateEmbedAuthor::new(author.name.clone());
        if let Some(icon) = &author.icon_url {
            a = a.icon_url(icon.clone());
        }
        if let Some(url) = &author.url {
            a = a.url(url.clone());
        }
        out = out.author(a);
    }
    if let Some(footer) = &posted.footer {
        let mut foot = serenity::CreateEmbedFooter::new(footer.text.clone());
        if let Some(icon) = &footer.icon_url {
            foot = foot.icon_url(icon.clone());
        }
        out = out.footer(foot);
    }
    if let Some(ts) = posted.timestamp {
        out = out.timestamp(ts);
    }
    out
}

/// Best-effort thread lock. Mirrors `msg.thread?.setLocked(true)`.
async fn lock_thread(http: &serenity::Http, thread_id: &str) {
    let Ok(tid) = thread_id.parse::<u64>() else {
        return;
    };
    if tid == 0 {
        return;
    }
    let _ = http
        .edit_thread(
            serenity::ChannelId::new(tid),
            &serenity::EditThread::new().locked(true),
            Some("Suggestion resolved"),
        )
        .await;
}

async fn moderate(
    ctx: Ctx<'_>,
    code: &str,
    action: &Moderation,
    response: String,
) -> Result<(), anyhow::Error> {
    let code_trim = code.trim();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let current_ch = ctx.channel_id().get().to_string();

    let suggest_channel = load_suggest_string(pool, &gid, "SUGGEST.channel").await;
    let disabled = load_suggest_disabled(pool, &gid).await;
    if guard_channel(suggest_channel.as_deref(), disabled, &current_ch) {
        say_eph(
            &ctx,
            bad_channel_text(&ctx, action.kind, suggest_channel.as_deref()).await,
        )
        .await?;
        return Ok(());
    }
    let channel_id: u64 = suggest_channel
        .as_deref()
        .unwrap_or("0")
        .parse()
        .unwrap_or(0);

    let Some(mut s) = load_suggestion(pool, &gid, code_trim).await else {
        let key = format!("suggest_{}_not_found_db", action.kind);
        let text = if action.kind == "reply" {
            crate::commands::lang_for(
                &ctx,
                "suggest_replynot_found_db",
                "The suggestion is not found in my DB!",
            )
            .await
        } else {
            crate::commands::lang_for(&ctx, &key, "The suggestion is not found in my DB!").await
        };
        say_eph(&ctx, text).await?;
        return Ok(());
    };
    if s.is_answered() {
        let key = format!("suggest_{}_already_replied", action.kind);
        let text =
            crate::commands::lang_for(&ctx, &key, "This suggestion has already been replied to!")
                .await;
        say_eph(&ctx, text).await?;
        return Ok(());
    }
    let Ok(msg_id) = s.msg_id.parse::<u64>() else {
        let key = format!("suggest_{}_command_error", action.kind);
        let text = crate::commands::lang_for(
            &ctx,
            &key,
            "The suggestion is not found in the Discord channel!",
        )
        .await;
        say_eph(&ctx, text).await?;
        return Ok(());
    };

    let channel = serenity::ChannelId::new(channel_id);
    let msg = match channel
        .message(ctx.http(), serenity::MessageId::new(msg_id))
        .await
    {
        Ok(m) => m,
        Err(_) => {
            let key = format!("suggest_{}_command_error", action.kind);
            let text = crate::commands::lang_for(
                &ctx,
                &key,
                "The suggestion is not found in the Discord channel!",
            )
            .await;
            say_eph(&ctx, text).await?;
            return Ok(());
        }
    };
    let posted = msg.embeds.first().cloned().unwrap_or_default();

    // TS replaces `${interaction.user.username}` with the global name.
    let author_name = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    let field_tpl_key = format!("suggest_{}_embed_fields_to_put", action.kind);
    let field_name = crate::commands::lang_for(&ctx, &field_tpl_key, "Staff response")
        .await
        .replace("${interaction.user.username}", &author_name);
    let title_tpl_key = format!("suggest_{}_embed_title_to_put", action.kind);
    let old_title = posted.title.clone().unwrap_or_default();
    let title = crate::commands::lang_for(&ctx, &title_tpl_key, &old_title)
        .await
        .replace("${msg.embeds[0].data?.title}", &old_title);
    let embed = restyle_suggest_embed(&posted, action, field_name, &response, title);
    if channel
        .edit_message(
            ctx.http(),
            msg.id,
            serenity::EditMessage::new().embed(embed),
        )
        .await
        .is_err()
    {
        let key = format!("suggest_{}_command_error", action.kind);
        let text = crate::commands::lang_for(
            &ctx,
            &key,
            "The suggestion is not found in the Discord channel!",
        )
        .await;
        say_eph(&ctx, text).await?;
        return Ok(());
    }

    s.mark_answered(action.status);
    save_suggestion(pool, &gid, code_trim, &s).await?;
    lock_thread(ctx.http(), &s.thread_id.clone()).await;

    let key = format!("suggest_{}_command_work", action.kind);
    let text = crate::commands::lang_for(&ctx, &key, "Done.").await;
    say_eph(&ctx, work_text(text, &gid, &current_ch, &s.msg_id)).await?;
    Ok(())
}

/// Accept an suggestion (need admin permission)!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "accept",
    aliases("sug-accept"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn suggest_accept(
    ctx: Ctx<'_>,
    #[description = "Code"]
    #[rename = "id"]
    code: String,
    #[description = "Reason"] reason: String,
) -> Result<(), anyhow::Error> {
    moderate(ctx, &code, &ACCEPT, reason).await
}

/// Deny an suggestion (need admin permission)!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "deny",
    aliases("sug-deny"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn suggest_deny(
    ctx: Ctx<'_>,
    #[description = "Code"]
    #[rename = "id"]
    code: String,
    #[description = "Reason"] reason: String,
) -> Result<(), anyhow::Error> {
    moderate(ctx, &code, &DENY, reason).await
}

/// Reply to the suggestion (need admin permission)!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "reply",
    aliases("sug-reply"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn suggest_reply(
    ctx: Ctx<'_>,
    #[description = "Code"]
    #[rename = "id"]
    code: String,
    #[description = "Reply"]
    #[rename = "message"]
    reply: String,
) -> Result<(), anyhow::Error> {
    moderate(ctx, &code, &REPLY, reply).await
}

/// Delete a role for a certain amount of money!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "delete",
    aliases("sug-delete"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn suggest_delete(
    ctx: Ctx<'_>,
    #[description = "Code"]
    #[rename = "id"]
    code: String,
) -> Result<(), anyhow::Error> {
    let code_trim = code.trim();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let current_ch = ctx.channel_id().get().to_string();

    let suggest_channel = load_suggest_string(pool, &gid, "SUGGEST.channel").await;
    let disabled = load_suggest_disabled(pool, &gid).await;
    if guard_channel(suggest_channel.as_deref(), disabled, &current_ch) {
        say_eph(
            &ctx,
            bad_channel_text(&ctx, "delete", suggest_channel.as_deref()).await,
        )
        .await?;
        return Ok(());
    }
    let channel_id: u64 = suggest_channel
        .as_deref()
        .unwrap_or("0")
        .parse()
        .unwrap_or(0);

    let Some(s) = load_suggestion(pool, &gid, code_trim).await else {
        let text = crate::commands::lang_for(
            &ctx,
            "suggest_delete_not_found_db",
            "The suggestion is not found in my DB!",
        )
        .await;
        say_eph(&ctx, text).await?;
        return Ok(());
    };

    // Mirrors !delete.ts: delete the Discord message, then the DB row.
    // On fetch failure the DB row is kept (TS `.catch` only replies).
    let Ok(msg_id) = s.msg_id.parse::<u64>() else {
        let text = crate::commands::lang_for(
            &ctx,
            "suggest_delete_command_error",
            "The suggestion is not found in this Discord channel!",
        )
        .await;
        say_eph(&ctx, text).await?;
        return Ok(());
    };
    let channel = serenity::ChannelId::new(channel_id);
    if let Ok(msg) = channel
        .message(ctx.http(), serenity::MessageId::new(msg_id))
        .await
    {
        let _ = msg.delete(ctx.http()).await;
    } else {
        let text = crate::commands::lang_for(
            &ctx,
            "suggest_delete_command_error",
            "The suggestion is not found in this Discord channel!",
        )
        .await;
        say_eph(&ctx, text).await?;
        return Ok(());
    }
    delete_suggestion(pool, &gid, code_trim).await?;
    let text = crate::commands::lang_for(
        &ctx,
        "suggest_delete_command_work",
        "You have deleted the suggestion!",
    )
    .await;
    say_eph(&ctx, text).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn guard_requires_configured_enabled_current_channel() {
        assert!(guard_channel(None, false, "5"));
        assert!(guard_channel(Some("6"), false, "5"));
        assert!(guard_channel(Some("5"), true, "5"));
        assert!(!guard_channel(Some("5"), false, "5"));
    }

    #[test]
    fn work_text_fills_ids() {
        let out = work_text(
            "https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${fetchId?.msgId}".to_string(),
            "1",
            "2",
            "3",
        );
        assert_eq!(out, "https://discord.com/channels/1/2/3");
    }

    #[test]
    fn restyle_adds_field_color_and_title() {
        let posted = serenity::Embed::default();
        let embed = restyle_suggest_embed(
            &posted,
            &ACCEPT,
            "Response of Root (Accepting)".to_string(),
            "Ship it",
            "[Accepting] #ABC".to_string(),
        );
        let dbg = format!("{embed:?}");
        assert!(dbg.contains("Ship it"));
        assert!(dbg.contains("Accepting"));
    }
}

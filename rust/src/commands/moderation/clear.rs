use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "clear",
    aliases("cls"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn mod_clear(
    ctx: Ctx<'_>,
    #[description = "Amount (1-100)"] amount: u64,
    #[description = "Only this member's messages"] member: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let channel_id = ctx.channel_id();
    // TS adds +1 to cover the invoking message, capped at 100.
    let want = amount.saturating_add(1).clamp(1, 100) as usize;
    let cutoff = crate::bot::now_ms() - BULK_DELETE_MAX_AGE_MS;
    let mut collected: Vec<serenity::Message> = vec![];
    // Member filter scans back through history like findMessagesByAuthor.
    let mut before: Option<serenity::MessageId> = None;
    for _ in 0..10 {
        let mut q = serenity::GetMessages::new().limit(100);
        if let Some(b) = before {
            q = q.before(b);
        }
        let batch = channel_id.messages(ctx.http(), q).await?;
        if batch.is_empty() {
            break;
        }
        before = batch.last().map(|m| m.id);
        for m in batch {
            if let Some(u) = &member {
                if m.author.id != u.id {
                    continue;
                }
            }
            // 14-day bulk-delete filter.
            if m.timestamp.unix_timestamp() * 1000 <= cutoff {
                continue;
            }
            collected.push(m);
            if collected.len() >= want {
                break;
            }
        }
        if collected.len() >= want {
            break;
        }
        if member.is_none() {
            break;
        }
    }
    if collected.is_empty() {
        ctx.say(t("clear_command_no_message")).await?;
        return Ok(());
    }
    let ids: Vec<serenity::MessageId> = collected.iter().map(|m| m.id).collect();
    // TS surfaces the raw error text on failure.
    if let Err(e) = if ids.len() == 1 {
        channel_id
            .delete_message(ctx.http(), ids[0])
            .await
            .map(|_| ())
    } else {
        channel_id.delete_messages(ctx.http(), &ids).await
    } {
        ctx.say(e.to_string()).await?;
        return Ok(());
    }
    let n = ids.len();
    let handle = ctx
        .say(t("clear_confirmation_message").replace("${messages.size}", &n.to_string()))
        .await?;
    // Auto-delete the confirmation after 5s like afterSent.
    if let Ok(sent) = handle.into_message().await {
        let http = ctx.serenity_context().http.clone();
        let invoker = match ctx {
            poise::Context::Prefix(p) => Some(p.msg.id),
            _ => None,
        };
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            let _ = channel_id.delete_message(&*http, sent.id).await;
            if let Some(inv) = invoker {
                let _ = channel_id.delete_message(&*http, inv).await;
            }
        });
    }
    if let Some(guild_id) = ctx.guild_id() {
        post_mod_log(
            ctx.http(),
            guild_id,
            t("clear_logs_embed_title"),
            t("clear_logs_embed_description")
                .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
                .replace("${messages.size}", &n.to_string())
                .replace("${interaction.channel.id}", &channel_id.get().to_string()),
        )
        .await;
    }
    Ok(())
}

use super::*;
use poise::serenity_prelude as serenity;

/// Pacing between history fetches on the member-filtered path.
/// Mirrors `FETCH_DELAY_MS` in !clear.ts (stays clear of the
/// messages.fetch rate limit).
const FETCH_DELAY_MS: u64 = 350;

/// Delete target count. Mirrors !clear.ts: the plain path caps at 100
/// (`Math.min(amount, 100)`), the member-filtered path passes an
/// uncapped `targetAmount` (`Math.max(amount, 1)`).
fn want_count(amount: u64, by_member: bool) -> usize {
    let want = amount.saturating_add(1).max(1) as usize;
    if by_member {
        want
    } else {
        want.min(100)
    }
}

/// Clear a amount of message in the channel !
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
    // TS adds +1 to cover the invoking message; only the plain path
    // caps at 100, the member-filtered path is uncapped (targetAmount).
    let want = want_count(amount, member.is_some());
    let cutoff = crate::bot::now_ms() - BULK_DELETE_MAX_AGE_MS;
    let mut collected: Vec<serenity::Message> = vec![];
    // Member filter scans back through history like findMessagesByAuthor.
    let mut before: Option<serenity::MessageId> = None;
    for i in 0..10 {
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
        // Pace history fetches on the member-filtered path, like the TS
        // `if (!isLastIteration) await Bun.sleep(FETCH_DELAY_MS)`.
        if i + 1 < 10 {
            tokio::time::sleep(std::time::Duration::from_millis(FETCH_DELAY_MS)).await;
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
    // Auto-delete the confirmation after 5s like afterSent
    // (`moderation/!clear.ts:13-28`): channel-visible reply, never ephemeral.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn want_count_matches_ts_paths() {
        // Plain path caps at 100; member path has no 100-cap.
        assert_eq!(want_count(5, false), 6);
        assert_eq!(want_count(200, false), 100);
        assert_eq!(want_count(200, true), 201);
        assert_eq!(want_count(0, true), 1);
    }

    #[test]
    fn fetch_pacing_matches_ts() {
        assert_eq!(FETCH_DELAY_MS, 350);
        assert_eq!(
            std::time::Duration::from_millis(FETCH_DELAY_MS),
            std::time::Duration::from_millis(350)
        );
    }
}

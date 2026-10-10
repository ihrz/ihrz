use super::*;
use poise::serenity_prelude as serenity;
use poise::serenity_prelude::Mentionable;

// Button custom ids. Mirror `!message.ts:104,108`.
#[allow(dead_code)]
pub const MSG_SET_ID: &str = "xpMessage-set-message";
#[allow(dead_code)]
pub const MSG_DEFAULT_ID: &str = "xpMessage-default-message";

/// Cap a level-up template at 1010 chars. Mirrors the TS modal
/// `maxLength: 1010` (`!message.ts:144`) and the
/// `xpMessage?.substring(0, 1010)` read guard (`!message.ts:63`).
pub fn truncate_xp_message(template: &str) -> String {
    template.chars().take(1010).collect()
}

/// Preview one template the way the level-up announce renders it:
/// raw template plus the member/guild render at level 4 (mirrors the
/// `!message.ts:73-83,88-98` help embed, whose previews render with
/// `ranks: { level: 4 }`).
fn preview_block(
    raw: &str,
    username: &str,
    mention: &str,
    member_count: u64,
    guild_name: &str,
) -> String {
    let rendered =
        crate::events::render_xp_announce(raw, username, mention, member_count, guild_name, 4);
    format!("```{raw}```\n{rendered}")
}

/// Preview, set, or clear the custom level-up message.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "message",
    aliases("msg"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_msg(
    ctx: Ctx<'_>,
    #[description = "Template (omit to preview, empty to clear)"] template: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    let tick = crate::emojis::app_emoji_markup(ctx.http(), "GreenTick")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    // TS replies with `ranksSetMessage_command_work_on_enable` on both
    // the set and the reset flows (`!message.ts:181-187,214-221`).
    let reply = say(
        "ranksSetMessage_command_work_on_enable",
        "Level-up message updated.",
    )
    .replace("${client.iHorizon_Emojis.GreenTick}", &tick);
    let Some(template) = template else {
        // Preview leg: custom template (raw + render) and the guild-lang
        // default (raw + render), mirroring the help embed fields.
        let stored = super::migrated_get(
            &ctx.data().pool,
            &gid,
            super::GUILD_MESSAGE_NEW,
            &[super::GUILD_MESSAGE_OLD],
        )
        .await
        .map(|t| truncate_xp_message(&t));
        let default_tpl = say("event_xp_level_earn", crate::events::XP_EARN_FALLBACK);
        let mention = ctx.author().mention().to_string();
        let (guild_name, member_count) = ctx
            .guild_id()
            .and_then(|id| ctx.cache().guild(id))
            .map(|g| (g.name.clone(), g.member_count))
            .unwrap_or_default();
        let custom_field = match stored.filter(|t| !t.is_empty()) {
            Some(t) => preview_block(&t, &ctx.author().name, &mention, member_count, &guild_name),
            None => say(
                "ranksSetMessage_help_embed_fields_custom_name_empy",
                "No custom message set.",
            ),
        };
        let default_field = preview_block(
            &default_tpl,
            &ctx.author().name,
            &mention,
            member_count,
            &guild_name,
        );
        let embed = serenity::CreateEmbed::default()
            .title(say("ranksSetMessage_help_embed_title", "Level-up message"))
            .description(say(
                "ranksSetMessage_help_embed_desc",
                "Preview of the level-up message.",
            ))
            .field(
                say(
                    "ranksSetMessage_help_embed_fields_custom_name",
                    "Custom message",
                ),
                custom_field,
                false,
            )
            .field(
                say(
                    "ranksSetMessage_help_embed_fields_default_name_empy",
                    "Default message",
                ),
                default_field,
                false,
            );
        ctx.send(poise::CreateReply::default().embed(embed)).await?;
        return Ok(());
    };
    let trimmed = template.trim().to_string();
    if trimmed.is_empty() {
        super::migrated_del(
            &ctx.data().pool,
            &gid,
            super::GUILD_MESSAGE_NEW,
            &[super::GUILD_MESSAGE_OLD],
        )
        .await?;
        ctx.say(reply).await?;
        let title = say(
            "ranksSetMessage_logs_embed_title_on_disable",
            "RanksSetMessage Logs.",
        );
        let desc = say(
            "ranksSetMessage_logs_embed_description_on_disable",
            "Ranks message deleted by <@id>.",
        )
        .replace("${interaction.user.id}", &author_id);
        crate::commands::economy::post_ihorizon_log(&ctx, &title, &desc).await;
        return Ok(());
    }
    // Modal `minLength: 2` gate (`!message.ts:145`).
    if !super::xp_message_valid(&trimmed) {
        ctx.say("Message too short: the level-up template needs at least 2 characters.")
            .await?;
        return Ok(());
    }
    let capped = truncate_xp_message(&trimmed);
    super::migrated_set(
        &ctx.data().pool,
        &gid,
        super::GUILD_MESSAGE_NEW,
        &[super::GUILD_MESSAGE_OLD],
        &capped,
    )
    .await?;
    ctx.say(reply).await?;
    let title = say(
        "ranksSetMessage_logs_embed_title_on_enable",
        "RanksSetMessage Logs.",
    );
    let desc = say(
        "ranksSetMessage_logs_embed_description_on_enable",
        "Ranks message set by <@id>.",
    )
    .replace("${interaction.user.id}", &author_id);
    crate::commands::economy::post_ihorizon_log(&ctx, &title, &desc).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::truncate_xp_message;

    #[test]
    fn truncation_caps_at_1010_chars_like_ts_substring() {
        let long = "a".repeat(2000);
        assert_eq!(truncate_xp_message(&long).len(), 1010);
        assert_eq!(truncate_xp_message("hi"), "hi");
        let wide = "é".repeat(2000);
        assert_eq!(truncate_xp_message(&wide).chars().count(), 1010);
    }

    async fn mem_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:")
            .unwrap()
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[tokio::test]
    async fn message_key_roundtrips_through_both_stores() {
        use super::{GUILD_MESSAGE_NEW, GUILD_MESSAGE_OLD};
        use crate::commands::ranks::{migrated_del, migrated_get, migrated_set};
        let pool = mem_pool().await;
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD]).await,
            None
        );
        migrated_set(
            &pool,
            "g",
            GUILD_MESSAGE_NEW,
            &[GUILD_MESSAGE_OLD],
            "gg {user}",
        )
        .await
        .unwrap();
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("gg {user}")
        );
        // Locked legacy readers still see the write.
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_OLD)
                .await
                .as_deref(),
            Some("gg {user}")
        );
        assert!(
            migrated_del(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .unwrap()
        );
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD]).await,
            None
        );
        assert!(
            !migrated_del(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .unwrap()
        );
    }

    #[tokio::test]
    async fn legacy_message_key_reads_and_promotes() {
        use super::{GUILD_MESSAGE_NEW, GUILD_MESSAGE_OLD};
        use crate::commands::ranks::migrated_get;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", GUILD_MESSAGE_OLD, "hi {user}")
            .await
            .unwrap();
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("hi {user}")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_NEW)
                .await
                .as_deref(),
            Some("hi {user}")
        );
    }
}

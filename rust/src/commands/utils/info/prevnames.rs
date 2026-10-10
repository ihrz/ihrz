use super::*;
use poise::serenity_prelude as serenity;

/// Named table mirroring TS `prevnamesTable`. Scope "0" and
/// `PREVNAMES.<uid>` keys are unchanged from the legacy kv layout.
pub const PREVNAMES_TABLE: &str = "prevnames";

/// Collector lifetime from !prevnames.ts (`60_000 * 15`).
pub const PREVNAMES_COLLECTOR_SECS: u64 = 60 * 15;

/// Previous names. Mirrors utils !prevnames.ts (tracked in user_update).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "prevnames",
    aliases("pvnames", "pvname", "prevname")
)]
pub async fn prevnames(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let target = user.unwrap_or_else(|| ctx.author().clone());
    // Named `prevnames` table first, legacy kv fallback (the writer in
    // events.rs still targets kv): scope "0", `PREVNAMES.<uid>` keys
    // unchanged, fallback hits promoted lazily.
    let key = crate::events::prevnames_key(target.id.get());
    let raw = crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        PREVNAMES_TABLE,
        crate::commands::owner::main::GLOBAL_SCOPE,
        &key,
    )
    .await;
    let history: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if history.is_empty() {
        ctx.say(t("prevnames_undetected")).await?;
        return Ok(());
    }
    let display = target
        .global_name
        .clone()
        .unwrap_or_else(|| target.name.clone());
    let pages = prevnames_pages(&history, &t("prevnames_embed_title"), &display);
    let total = pages.len();
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let footer_icon = footer_bytes.is_some();
    let mk_embed = |cur: usize| {
        let (title, desc) = pages[cur].clone();
        serenity::CreateEmbed::default()
            .colour(serenity::Colour::from_rgb(0x01, 0x01, 0x01))
            .title(title)
            .description(desc)
            .footer(
                serenity::CreateEmbedFooter::new(crate::commands::shared::footer_page_text(
                    &footer_name,
                    &page_word,
                    (cur + 1) as u64,
                    total as u64,
                ))
                .icon_url(if footer_icon {
                    "attachment://footer_icon.png".to_string()
                } else {
                    String::new()
                }),
            )
            .timestamp(serenity::Timestamp::now())
    };
    let mk_row = || {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("previousPage")
                .label("<<<")
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("nextPage")
                .label(">>>")
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("trash-prevnames-embed")
                .label("🗑️")
                .style(serenity::ButtonStyle::Danger),
        ])
    };
    let mut reply = poise::CreateReply::default()
        .embed(mk_embed(0))
        .components(vec![mk_row()]);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let author = ctx.author().id;
    let target_id = target.id;
    let mut cur = 0usize;
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(PREVNAMES_COLLECTOR_SECS))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author {
            // TS defers then ignores foreign presses.
            let _ = press
                .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                .await;
            continue;
        }
        match press.data.custom_id.as_str() {
            "previousPage" => {
                cur = (cur + total - 1) % total;
            }
            "nextPage" => {
                cur = (cur + 1) % total;
            }
            "trash-prevnames-embed" => {
                if author == target_id && can_erase_prevnames(author.get(), target_id.get()) {
                    let _ = crate::commands::owner::main::routed_del(
                        &ctx.data().pool,
                        PREVNAMES_TABLE,
                        crate::commands::owner::main::GLOBAL_SCOPE,
                        &key,
                    )
                    .await;
                    let _ = press
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::Acknowledge,
                        )
                        .await;
                    let _ = msg
                        .edit(
                            ctx.http(),
                            serenity::EditMessage::new()
                                .content(t("prevnames_data_erased"))
                                .suppress_embeds(true)
                                .components(vec![]),
                        )
                        .await;
                    return Ok(());
                }
                // Not the owner: fall through and re-render, like TS.
            }
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(cur))
                        .components(vec![mk_row()]),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![prevnames_dead_row()]),
        )
        .await;
    Ok(())
}

/// Disabled navigation row for the timeout cleanup.
fn prevnames_dead_row() -> serenity::CreateActionRow {
    let btn = |id: &str, label: &str| {
        serenity::CreateButton::new(id)
            .label(label)
            .style(serenity::ButtonStyle::Secondary)
            .disabled(true)
    };
    serenity::CreateActionRow::Buttons(vec![
        btn("previousPage", "<<<"),
        btn("nextPage", ">>>"),
        serenity::CreateButton::new("trash-prevnames-embed")
            .label("🗑️")
            .style(serenity::ButtonStyle::Danger)
            .disabled(true),
    ])
}

/// Prevnames pager size from !prevnames.ts.
pub const PREVNAMES_PER_PAGE: usize = 5;

/// Build pager pages (5 names each). The title template's
/// `${user.username}` becomes the display name and `| Page N` is
/// appended, mirroring the TS pages build.
pub fn prevnames_pages(
    history: &[String],
    title_tpl: &str,
    display: &str,
) -> Vec<(String, String)> {
    history
        .chunks(PREVNAMES_PER_PAGE)
        .enumerate()
        .map(|(i, chunk)| {
            (
                format!(
                    "{} | Page {}",
                    title_tpl.replace("${user.username}", display),
                    i + 1
                ),
                chunk.join("\n"),
            )
        })
        .collect()
}

/// Trash-button guard: only the profile owner may erase their own
/// history (`interaction.member?.user.id === user.id`), replying
/// `prevnames_data_erased` on success.
pub fn can_erase_prevnames(invoker: u64, target: u64) -> bool {
    invoker == target
}

#[cfg(test)]
mod tests {
    use super::PREVNAMES_TABLE;
    use crate::commands::owner::main::{routed_get, GLOBAL_SCOPE};

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

    #[test]
    fn table_and_key_layout() {
        assert_eq!(PREVNAMES_TABLE, "prevnames");
        assert_eq!(crate::events::prevnames_key(5), "PREVNAMES.5");
    }

    #[test]
    fn pages_chunk_by_five_with_numbered_titles() {
        use super::{can_erase_prevnames, prevnames_pages};
        let history: Vec<String> = (0..6).map(|i| format!("name{i}")).collect();
        let pages = prevnames_pages(&history, "List of all ${user.username}'s nicknames", "bob");
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "List of all bob's nicknames | Page 1");
        assert_eq!(pages[0].1, "name0\nname1\nname2\nname3\nname4");
        assert_eq!(pages[1].0, "List of all bob's nicknames | Page 2");
        assert_eq!(pages[1].1, "name5");
        assert!(can_erase_prevnames(7, 7));
        assert!(!can_erase_prevnames(7, 8));
    }

    #[test]
    fn collector_window_is_900s() {
        assert_eq!(super::PREVNAMES_COLLECTOR_SECS, 900);
    }

    #[tokio::test]
    async fn routed_read_falls_back_to_kv_writer_and_promotes() {
        let pool = mem_pool().await;
        // events.rs writer shape: kv only, scope "0".
        crate::db::kv_set(&pool, "0", "PREVNAMES.5", "[\"old\"]")
            .await
            .unwrap();
        let raw = routed_get(&pool, PREVNAMES_TABLE, GLOBAL_SCOPE, "PREVNAMES.5").await;
        assert_eq!(raw.as_deref(), Some("[\"old\"]"));
        // Promoted: survives the legacy row's removal.
        crate::db::kv_del(&pool, "0", "PREVNAMES.5").await.unwrap();
        let raw = routed_get(&pool, PREVNAMES_TABLE, GLOBAL_SCOPE, "PREVNAMES.5").await;
        assert_eq!(raw.as_deref(), Some("[\"old\"]"));
    }
}

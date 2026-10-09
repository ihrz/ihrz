use super::*;
use poise::serenity_prelude as serenity;

/// Default ticket category. Mirrors !set-category.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-category",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_set_category(
    ctx: Ctx<'_>,
    #[description = "Category name"] name: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors !set-category.ts: disable guard, then the channel must
    // be a category channel (prefix accepts an id or <#mention>).
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    let not_category_msg = || {
        crate::lang::get(&code, "setticketcategory_not_a_category").unwrap_or_else(|| {
            "The channel specified is not a category, please try again.".to_string()
        })
    };
    let raw = name.trim().replace("<#", "").replace(['#', '>'], "");
    let Ok(cat_id) = raw.parse::<u64>() else {
        ctx.say(not_category_msg()).await?;
        return Ok(());
    };
    let http = ctx.serenity_context().http.clone();
    let resolved = serenity::ChannelId::new(cat_id)
        .to_channel(&http)
        .await
        .ok()
        .and_then(|c| match c {
            serenity::Channel::Guild(gc) if gc.kind == serenity::ChannelType::Category => {
                Some((gc.id, gc.name))
            }
            _ => None,
        });
    let Some((cat_id, cat_name)) = resolved else {
        ctx.say(not_category_msg()).await?;
        return Ok(());
    };
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "GUILD.TICKET.category",
        &cat_id.get().to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "setticketcategory_command_work")
            .map(|s| {
                s.replace("${category.name}", &cat_name)
                    .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            })
            .unwrap_or_else(|| "Ticket category set.".to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
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
    async fn category_flag_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::commands::owner::main::routed_set(&pool, "g", "g", "GUILD.TICKET.category", "123")
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.TICKET.category")
                .await
                .as_deref(),
            Some("123")
        );
        assert!(tbl_get_value(&pool, "g", "GUILD.TICKET.category")
            .await
            .is_some());
    }
}

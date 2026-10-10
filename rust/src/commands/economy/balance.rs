use super::*;

/// Table-first economy account load with legacy kv fallback (keys
/// unchanged). A legacy hit promotes into the table so rows migrate
/// lazily; pair with `save_econ_routed` (dual-write) so kv-only
/// readers (mod.rs `load_econ`, `claim_inner`) stay fresh.
pub async fn load_econ_routed(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> EconAccount {
    crate::commands::owner::main::routed_get(pool, guild_id, guild_id, &econ_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Table-first economy account store with legacy kv dual-write (keys
/// unchanged).
pub async fn save_econ_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    account: &EconAccount,
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        &econ_key(user_id),
        &serde_json::to_string(account)?,
    )
    .await
}

/// Mirrors `!balance.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "balance",
    aliases("wallet", "coins", "bal")
)]
pub async fn eco_balance(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let a = load_econ_routed(&ctx.data().pool, &gid, uid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let coin = coin_markup(&ctx).await;
    let wallet = wallet_markup(&ctx).await;
    // Mirrors `!balance.ts:84`: the title always uses the username,
    // never the global display name.
    let member_name = user
        .as_ref()
        .map(|u| u.name.clone())
        .unwrap_or_else(|| ctx.author().name.clone());
    let who = user
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_else(|| ctx.author().to_string());
    let shop_json =
        crate::commands::owner::main::routed_get(&ctx.data().pool, &gid, &gid, shop_key())
            .await
            .unwrap_or_else(|| "{}".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(&ctx).await);
    let total = a.money + a.bank;
    // Mirrors !balance.ts: #e3c6ff embed, "`name`'s Wallet" title,
    // wallet desc, bank / money / boost fields with Coin suffix.
    // Balances render with `fmt_num` (JS `toString`: 10 -> "10").
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xE3C6FF)
        .title(format!("`{member_name}`'s Wallet"))
        .description(
            crate::lang::get(&code, "balance_he_have_wallet")
                .map(|s| {
                    s.replace("${user}", &who)
                        .replace("${bal}", &fmt_num(total))
                        .replace("${client.iHorizon_Emojis.Wallet}", &wallet)
                })
                .unwrap_or_else(|| format!("Wallet: {}", fmt_num(total))),
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", fmt_num(a.bank)),
            true,
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields2_name")
                .unwrap_or_else(|| "Wallet".to_string()),
            format!("{}{coin}", fmt_num(a.money)),
            true,
        )
        .field(
            crate::lang::get(&code, "var_boost").unwrap_or_else(|| "Boost".to_string()),
            format!("{boost}x"),
            true,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), uid).await {
            embed = embed.thumbnail(member.avatar_url().unwrap_or_else(|| member.user.face()));
        }
    }
    // Footer like !balance.ts (footerBuilder + footerAttachmentBuilder).
    send_with_footer(&ctx, embed).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{load_econ_routed, save_econ_routed};
    use crate::commands::economy::EconAccount;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn legacy_account_reads_and_promotes_to_table() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "USER.1.ECONOMY", r#"{"money":100,"bank":50}"#)
            .await
            .unwrap();
        let a = load_econ_routed(&pool, "g", 1).await;
        assert_eq!((a.money, a.bank), (100.0, 50.0));
        // Legacy hit promotes into the table handle.
        let promoted = tbl_get_value(&pool, "g", "USER.1.ECONOMY").await.unwrap();
        assert_eq!(promoted.get("money").and_then(|v| v.as_i64()), Some(100));
        // Unknown users still default.
        assert_eq!(load_econ_routed(&pool, "g", 9).await.money, 0.0);
    }

    #[tokio::test]
    async fn table_wins_over_legacy_on_conflict() {
        use crate::commands::owner::main::table_backend;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "USER.1.ECONOMY", r#"{"money":1,"bank":0}"#)
            .await
            .unwrap();
        table_backend(&pool)
            .table("g")
            .set(
                "USER.1.ECONOMY",
                serde_json::json!({"money": 777, "bank": 0}),
            )
            .await
            .unwrap();
        assert_eq!(load_econ_routed(&pool, "g", 1).await.money, 777.0);
    }

    #[tokio::test]
    async fn save_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        let account = EconAccount {
            money: 40.0,
            bank: 2.0,
            ..Default::default()
        };
        save_econ_routed(&pool, "g", 4, &account).await.unwrap();
        // kv-only readers (load_econ, claim_inner) stay fresh.
        let legacy = crate::db::kv_get(&pool, "g", "USER.4.ECONOMY")
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<EconAccount>(&legacy).unwrap().money,
            40.0
        );
        let stored = tbl_get_value(&pool, "g", "USER.4.ECONOMY").await.unwrap();
        assert_eq!(stored.get("bank").and_then(|v| v.as_i64()), Some(2));
        // Round-trip through the routed loader.
        assert_eq!(load_econ_routed(&pool, "g", 4).await.money, 40.0);
    }
}

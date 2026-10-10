use super::*;
use std::collections::HashMap;

/// Select-menu custom id. Mirrors `setCustomId("shop")` (!shop.ts:161).
pub const SHOP_SELECT_ID: &str = "shop";

/// Table-first shop load with legacy kv fallback (keys unchanged). Accepts
/// the TS map shape plus the legacy Rust Vec shape (`[{role_id, price,
/// boost}]`) for old rows; a legacy hit promotes into the table.
/// Pair with `save_shop_routed` (dual-write) so kv-only readers stay fresh.
pub async fn load_shop_routed(pool: &crate::db::Pool, guild_id: &str) -> ShopMap {
    let Some(raw) =
        crate::commands::owner::main::routed_get(pool, guild_id, guild_id, shop_key()).await
    else {
        return ShopMap::new();
    };
    if let Ok(map) = serde_json::from_str::<ShopMap>(&raw) {
        return map;
    }
    // Legacy Vec shape fallback (mirrors the mod.rs owner).
    let mut out = ShopMap::new();
    if let Ok(vec) = serde_json::from_str::<Vec<serde_json::Value>>(&raw) {
        for entry in vec {
            let Some(role_id) = entry
                .get("role_id")
                .and_then(|r| {
                    r.as_str().map(|s| s.to_string()).or_else(|| {
                        r.as_u64()
                            .map(|n| n.to_string())
                            .or_else(|| r.as_i64().map(|n| n.to_string()))
                    })
                })
                .filter(|s| !s.is_empty())
            else {
                continue;
            };
            let price = entry
                .get("price")
                .and_then(|p| p.as_f64().or_else(|| p.as_i64().map(|i| i as f64)))
                .unwrap_or(0.0);
            let boost = entry.get("boost").and_then(|b| {
                b.as_f64().or_else(|| {
                    b.as_i64().map(|i| i as f64).or_else(|| {
                        b.as_str().and_then(|s| {
                            let t = s.trim().trim_start_matches('x').trim();
                            if t.is_empty() {
                                None
                            } else {
                                t.parse::<f64>().ok()
                            }
                        })
                    })
                })
            });
            out.insert(role_id, ShopEntry { price, boost });
        }
    }
    out
}

/// Table-first shop store with legacy kv dual-write (keys unchanged).
pub async fn save_shop_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    roles: &ShopMap,
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        shop_key(),
        &serde_json::to_string(roles)?,
    )
    .await
}

/// Collector lifetime. Mirrors `time: 600_000` (!shop.ts:184).
pub const SHOP_COLLECTOR_SECS: u64 = 600;

/// One assembled select-menu row: (label, value, description).
/// Pure over inputs so it is unit-testable without Discord.
pub fn shop_menu_options(
    shop: &ShopMap,
    owned: &[String],
    names: &HashMap<String, String>,
    price_word: &str,
    already_owned: &str,
    unknown_role: &str,
) -> Vec<(String, String, String)> {
    shop.iter()
        .map(|(role_id, e)| {
            // Mirrors !shop.ts:129-137 (label fallback, owned marking).
            // DELIBERATE KEEP (improvement): TS shows raw role names;
            // here labels cap at 100 chars (the Discord select-option
            // limit) instead of failing the whole menu send.
            let mut label = names
                .get(role_id)
                .cloned()
                .unwrap_or_else(|| unknown_role.to_string());
            if label.chars().count() > 100 {
                label = label.chars().take(100).collect();
            }
            let description = if owned.iter().any(|r| r == role_id) {
                already_owned.to_string()
            } else {
                format!("{price_word}: {} 💰", fmt_num(e.price))
            };
            (label, role_id.clone(), description)
        })
        .collect()
}

/// Shop display + interactive buy flow. Mirrors `shop.ts`.
#[poise::command(slash_command, prefix_command, rename = "shop")]
pub async fn eco_shop(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let shop = load_shop_routed(pool, &gid).await;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let text = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let uid = ctx.author().id.get();
    let base = balance::load_econ_routed(pool, &gid, uid).await;
    // Restore sweep: re-grant owned roles the member is missing.
    // DELIBERATE KEEP (extends `economy/!shop.ts:143-150`): the TS
    // restore loop sits behind `selectMenuOptions.length === 0`, which is
    // unreachable dead code — the options map 1:1 over a non-empty
    // `buyableRolesArray` (the empty case returns earlier at `:89-94`),
    // so TS never re-grants. The Rust side runs the sweep on every shop
    // open with the same reason string ("[Economy Shop] Role was not
    // given to the user."), because silently keeping paid roles
    // ungranted is the worse behaviour. Purchases themselves go through
    // /economy buy.
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
            for role_id in &base.owned_roles {
                if let Ok(rid) = role_id.parse::<u64>() {
                    let role = poise::serenity_prelude::RoleId::new(rid);
                    if !member.roles.contains(&role) {
                        let _ = member.add_role(ctx.http(), role).await;
                    }
                }
            }
        }
    }
    if shop.is_empty() {
        ctx.say(text("economy_shop_not_set", "Shop is empty."))
            .await?;
        return Ok(());
    }
    let shop_json = crate::commands::owner::main::routed_get(pool, &gid, &gid, shop_key())
        .await
        .unwrap_or_else(|| "{}".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(&ctx).await);
    let coin = coin_markup(&ctx).await;
    // Mirrors the !shop.ts embed (title with guild name, #45f712,
    // desc, bank / money / boost fields, footer).
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(
            crate::lang::get(&code, "economy_shop_embed_title")
                .map(|s| s.replace("${interaction.guild.name}", &guild_name(&ctx)))
                .unwrap_or_else(|| "Shop".to_string()),
        )
        .colour(0x45F712)
        .description(
            crate::lang::get(&code, "economy_shop_embed_desc")
                .unwrap_or_else(|| "Buy roles with your money.".to_string()),
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", fmt_num(base.bank)),
            true,
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields2_name")
                .unwrap_or_else(|| "Wallet".to_string()),
            format!("{}{coin}", fmt_num(base.money)),
            true,
        )
        .field(
            crate::lang::get(&code, "var_boost").unwrap_or_else(|| "Boost".to_string()),
            format!("{boost}x"),
            true,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    // Role-name lookup for select labels (cache miss -> unknown role).
    let names: HashMap<String, String> = match ctx.guild_id() {
        Some(g) => ctx
            .http()
            .get_guild_roles(g)
            .await
            .unwrap_or_default()
            .into_iter()
            .map(|r| (r.id.get().to_string(), r.name))
            .collect(),
        None => HashMap::new(),
    };
    // Select-menu options over ALL buyable roles with owned-role
    // marking (!shop.ts:129-137; no owned filter, per line 96).
    let rows = shop_menu_options(
        &shop,
        &base.owned_roles,
        &names,
        &text("var_price", "Price"),
        &text("economy_shop_already_owned", "Already owned"),
        &text("economy_shop_unknown_role", "Unknown Role"),
    );
    let mk_select = |disabled: bool| {
        let options = rows
            .iter()
            .map(|(label, value, desc)| {
                serenity::CreateSelectMenuOption::new(label.clone(), value.clone())
                    .description(desc.clone())
            })
            .collect();
        serenity::CreateSelectMenu::new(
            SHOP_SELECT_ID,
            serenity::CreateSelectMenuKind::String { options },
        )
        .placeholder(text(
            "economy_shop_menu_placeholder",
            "Select a role to purchase",
        ))
        .disabled(disabled)
    };
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed).components(vec![
        serenity::CreateActionRow::SelectMenu(mk_select(false)),
    ]);
    if let Some(bytes) = fbytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let author = ctx.author().id;
    // In-message select-menu collector, 10-min timeout (!shop.ts:183-186).
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(SHOP_COLLECTOR_SECS);
    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if press.data.custom_id != SHOP_SELECT_ID {
            continue;
        }
        // Author gate, ephemeral like the TS collector (!shop.ts:189-195).
        if press.user.id != author {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(text("help_not_for_you", "This interaction is not for you"))
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        let value = match &press.data.kind {
            serenity::ComponentInteractionDataKind::StringSelect { values } => {
                values.first().cloned().unwrap_or_default()
            }
            _ => continue,
        };
        // Unknown value (role left the shop): ephemeral, no state change.
        let Ok(role_id) = value.parse::<u64>() else {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(text("economy_shop_not_available", "Role not in shop."))
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        };
        if !shop.contains_key(&value) {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(text("economy_shop_not_available", "Role not in shop."))
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        let role_name = names
            .get(&value)
            .cloned()
            .unwrap_or_else(|| text("economy_shop_unknown_role", "Unknown Role"));
        // Shared purchase core (owned restore, funds check, money +
        // ownedRoles writes, grant); reply is ephemeral like the TS
        // collector replies. Fresh DB read per pick (TS reuses its
        // stale closure; the Rust side never double-pushes ownedRoles).
        match do_buy(&ctx, role_id, &role_name).await? {
            Some(reply_text) => {
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(reply_text)
                                .ephemeral(true),
                        ),
                    )
                    .await;
            }
            None => {
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
            }
        }
    }
    // Timeout: disable the menu like the TS end handler (!shop.ts:261-270).
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new()
                .components(vec![serenity::CreateActionRow::SelectMenu(mk_select(true))]),
        )
        .await;
    Ok(())
}

/// Pure purchase gate. Mirrors the !shop.ts collector order:
/// already-owned first (restore + no charge), then the funds check
/// (`baseData.money < role.price`). Exact price passes (only
/// strictly-below is rejected).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BuyGate {
    Owned,
    InsufficientFunds,
    Ok,
}

pub fn buy_gate(owned_roles: &[String], role_id: &str, money: f64, price: f64) -> BuyGate {
    if owned_roles.iter().any(|r| r == role_id) {
        return BuyGate::Owned;
    }
    if money < price {
        return BuyGate::InsufficientFunds;
    }
    BuyGate::Ok
}

/// Shared purchase core for /economy buy (and the shop flow): returns
/// the reply text after performing the TS collector steps
/// (already-owned restore, funds check, money + ownedRoles writes,
/// role grant). Replies are ephemeral, like the TS collector replies.
///
/// Deliberate divergences from `!shop.ts` (no behavior change intended
/// beyond these): the TS collector pushes `role.roleId` onto its
/// in-memory `baseData.ownedRoles` AND writes a spread copy
/// (`[...ownedRoles, roleId]`) per collect, so repeated buys in one
/// session duplicate the entry; here each pick re-reads fresh DB state
/// and pushes exactly once. And `eco_buy` exposes the same core as a
/// standalone `/economy buy` command, while TS only sells through the
/// shop select-menu collector.
async fn do_buy(
    ctx: &Ctx<'_>,
    role_id: u64,
    role_name: &str,
) -> Result<Option<String>, anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let text = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let shop = load_shop_routed(pool, &gid).await;
    let Some(item) = shop.get(&role_id.to_string()) else {
        return Ok(Some(text(
            "economy_shop_not_available",
            "Role not in shop.",
        )));
    };
    let price = item.price;
    let uid = ctx.author().id.get();
    let mut a = balance::load_econ_routed(pool, &gid, uid).await;
    // Owned-role path (!shop.ts collector): already-owned roles are
    // re-granted if missing and never charged.
    if buy_gate(&a.owned_roles, &role_id.to_string(), a.money, price) == BuyGate::Owned {
        if let Some(guild_id) = ctx.guild_id() {
            if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
                let role = poise::serenity_prelude::RoleId::new(role_id);
                if !member.roles.contains(&role) {
                    let _ = member.add_role(ctx.http(), role).await;
                }
            }
        }
        return Ok(Some(text(
            "economy_shop_already_own_role",
            "You already own this role.",
        )));
    }
    if buy_gate(&a.owned_roles, &role_id.to_string(), a.money, price) == BuyGate::InsufficientFunds
    {
        return Ok(Some(text(
            "economy_shop_not_enough_money",
            "Not enough money.",
        )));
    }
    // TS `!shop.ts` subtracts the raw price (`db.sub(..., role.price)`):
    // float money minus float price, no truncation.
    a.money -= price;
    a.owned_roles.push(role_id.to_string());
    balance::save_econ_routed(pool, &gid, uid, &a).await?;
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
            let _ = member
                .add_role(ctx.http(), poise::serenity_prelude::RoleId::new(role_id))
                .await;
        }
    }
    Ok(Some(
        text(
            "economy_shop_role_purchased",
            "Bought {roleName} for ${role.price}.",
        )
        .replace("{roleName}", role_name)
        .replace("${role.price}", &fmt_num(price)),
    ))
}

/// Buy command.
#[poise::command(slash_command, prefix_command, rename = "buy")]
pub async fn eco_buy(
    ctx: Ctx<'_>,
    #[description = "Role to buy"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    if let Some(reply) = do_buy(&ctx, role.id.get(), &role.name).await? {
        ctx.send(poise::CreateReply::default().content(reply).ephemeral(true))
            .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_shop() -> ShopMap {
        [(
            "111".to_string(),
            ShopEntry {
                price: 500.0,
                boost: None,
            },
        )]
        .into_iter()
        .collect()
    }

    #[test]
    fn unowned_option_shows_price_description() {
        let shop = sample_shop();
        let names: HashMap<String, String> = [("111".to_string(), "VIP".to_string())]
            .into_iter()
            .collect();
        let rows = shop_menu_options(&shop, &[], &names, "Price", "Already owned", "Unknown Role");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].0, "VIP");
        assert_eq!(rows[0].1, "111");
        assert_eq!(rows[0].2, "Price: 500 💰");
    }

    #[test]
    fn owned_option_is_marked_not_priced() {
        let shop = sample_shop();
        let names: HashMap<String, String> = [("111".to_string(), "VIP".to_string())]
            .into_iter()
            .collect();
        let rows = shop_menu_options(
            &shop,
            &["111".to_string()],
            &names,
            "Price",
            "Already owned",
            "Unknown Role",
        );
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].2, "Already owned");
    }

    #[test]
    fn missing_role_name_falls_back_to_unknown() {
        let shop = sample_shop();
        let rows = shop_menu_options(
            &shop,
            &[],
            &HashMap::new(),
            "Price",
            "Already owned",
            "Unknown Role",
        );
        assert_eq!(rows[0].0, "Unknown Role");
        assert_eq!(rows[0].1, "111");
    }

    #[test]
    fn empty_shop_yields_no_options() {
        let rows = shop_menu_options(
            &ShopMap::new(),
            &[],
            &HashMap::new(),
            "Price",
            "Already owned",
            "Unknown Role",
        );
        assert!(rows.is_empty());
    }

    #[test]
    fn buy_gate_owned_first_then_funds() {
        // Mirrors the !shop.ts collector order: owned restores without
        // charge even when funds are short; funds gate is strict <.
        let owned = vec!["111".to_string()];
        assert_eq!(buy_gate(&owned, "111", 0.0, 500.0), BuyGate::Owned);
        assert_eq!(
            buy_gate(&[], "111", 499.0, 500.0),
            BuyGate::InsufficientFunds
        );
        assert_eq!(buy_gate(&[], "111", 500.0, 500.0), BuyGate::Ok);
        assert_eq!(buy_gate(&[], "111", 501.0, 500.0), BuyGate::Ok);
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn legacy_map_row_reads_and_promotes_to_table() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", shop_key(), r#"{"7":{"price":500}}"#)
            .await
            .unwrap();
        let shop = load_shop_routed(&pool, "g").await;
        assert_eq!(shop.get("7").map(|e| e.price), Some(500.0));
        assert!(tbl_get_value(&pool, "g", shop_key()).await.is_some());
        assert!(load_shop_routed(&pool, "g9").await.is_empty());
    }

    #[tokio::test]
    async fn legacy_vec_shape_still_parses() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            shop_key(),
            r#"[{"role_id":"7","price":500,"boost":"x2"}]"#,
        )
        .await
        .unwrap();
        let shop = load_shop_routed(&pool, "g").await;
        assert_eq!(shop.get("7").map(|e| e.price), Some(500.0));
        assert_eq!(shop.get("7").and_then(|e| e.boost), Some(2.0));
    }

    #[tokio::test]
    async fn save_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        save_shop_routed(&pool, "g", &sample_shop()).await.unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", shop_key()).await.as_deref(),
            Some(r#"{"111":{"price":500}}"#)
        );
        assert!(tbl_get_value(&pool, "g", shop_key()).await.is_some());
    }
}

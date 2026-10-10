use super::*;

/// All GUILD.REACT_MSG.* trigger key names: guild-table subtree
/// first, legacy kv rows filling gaps. Mirrors the ticket TICKET_ALL
/// prefix scan; keys unchanged.
pub async fn load_react_triggers(pool: &crate::db::Pool, gid: &str) -> Vec<String> {
    use crate::commands::owner::main as routed;
    let mut keys = std::collections::HashSet::new();
    if let Some(root) = routed::tbl_get_value(pool, gid, "GUILD").await {
        if let Some(obj) = routed::walk_path(&root, &["REACT_MSG"]).and_then(|v| v.as_object()) {
            for k in obj.keys() {
                keys.insert(format!("GUILD.REACT_MSG.{k}"));
            }
        }
    }
    for (k, _) in routed::legacy_scan(pool, gid, "GUILD.REACT_MSG.").await {
        keys.insert(k);
    }
    let mut rows: Vec<String> = keys.into_iter().collect();
    rows.sort();
    rows
}

/// Show all specific messages saved to be react
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "list-react",
    aliases("react-list", "listreact", "reactlist")
)]
pub async fn list_react(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows = load_react_triggers(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if rows.is_empty() {
        crate::lang::get(&code, "list_react_nothing_found")
            .unwrap_or_else(|| "No data found, please add some first.".to_string())
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}

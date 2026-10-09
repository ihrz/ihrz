use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'GIVEAWAY.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No giveaways.".to_string()
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}

/// List all giveaways with status. Mirrors !get-all.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "get-all",
    aliases("gall"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_get_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'GIVEAWAY.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    // Mirrors the embed in !get-all.ts:57-88 (title + one field per
    // live giveaway; empty store sends the bare titled embed).
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let guild_name = ctx
        .guild()
        .map(|g| g.name.clone())
        .unwrap_or_else(|| gid.clone());
    let mut embed = poise::serenity_prelude::CreateEmbed::default().title(
        t(
            "gw_getall_embed_title",
            "Giveaway(s) List for ${interaction.guild?.name}",
        )
        .replace("${interaction.guild?.name}", &guild_name),
    );
    for (k, v) in &rows {
        if let Ok(gw) = serde_json::from_str::<Giveaway>(v) {
            if gw.ended {
                continue;
            }
            let giveaway_id = k.strip_prefix("GIVEAWAY.").unwrap_or(k);
            let channel = format!("<#{}>", gw.channel_id);
            let message_url = format!(
                "https://discord.com/channels/{gid}/{}/{giveaway_id}",
                gw.channel_id
            );
            let expire_in = format!("<t:{}:d>", gw.expire_in_ms.div_euclid(1000));
            embed = embed.field(
                format!("`{giveaway_id}`"),
                t(
                    "gw_getall_embed_fields",
                    "${Channel} [See Here](${MessageURL}) \n**Expires In** ${ExpireIn}",
                )
                .replace("${Channel}", &channel)
                .replace("${MessageURL}", &message_url)
                .replace("${ExpireIn}", &expire_in),
                false,
            );
        }
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

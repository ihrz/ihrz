use super::*;
use poise::serenity_prelude as serenity;

/// Table-first rank load with legacy key fallback
/// (`USER.<uid>.XP_LEVELING`, legacy `RANKS.<uid>`).
/// A legacy hit promotes into the new key so rows migrate lazily; pair
/// with `save_rank_routed` (dual-write) so legacy rows stay fresh for
/// direct kv readers.
pub async fn load_rank_routed(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> RankEntry {
    let new_key = super::user_key_new(user_id);
    let old_key = super::user_key_old(user_id);
    super::migrated_get(pool, guild_id, &new_key, &[&old_key])
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Rank store on the new key with legacy kv dual-write (keys migrated).
pub async fn save_rank_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    entry: &RankEntry,
) -> anyhow::Result<()> {
    let new_key = super::user_key_new(user_id);
    let old_key = super::user_key_old(user_id);
    super::migrated_set(
        pool,
        guild_id,
        &new_key,
        &[&old_key],
        &serde_json::to_string(entry)?,
    )
    .await
}

/// Guild display name for the rank card. Mirrors `!show.ts:82,105-108`
/// (`user.user.globalName || user.displayName` on the guild member):
/// the member's display name (server nickname first) wins, falling back
/// to the global name / username when the member is not resolvable.
pub async fn rank_display_name(ctx: &Ctx<'_>, user: &serenity::User) -> String {
    if let Some(gid) = ctx.guild_id() {
        if let Ok(member) = gid.member(ctx.http(), user.id).await {
            let name = member.display_name();
            if !name.is_empty() {
                return name.to_string();
            }
        }
    }
    user.global_name
        .clone()
        .unwrap_or_else(|| user.name.clone())
}

/// Show the sticky configuration of one channel
#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    aliases("rsee", "look", "level", "ranks-show")
)]
pub async fn ranks_show(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let member = user.as_ref().unwrap_or_else(|| ctx.author());
    let uid = member.id.get();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let e = load_rank_routed(&ctx.data().pool, &gid, uid).await;
    // Mirrors !show.ts: `level = baseData?.level || 0`,
    // `currentxp = baseData?.xp || 0`, `xpNeeded = level * 500 + 500`.
    let level = e.level;
    let currentxp = e.xp;
    let need = level.saturating_mul(500).saturating_add(500).max(500);
    // DELIBERATE KEEP (differs from `!show.ts:75-76`): TS computes
    // `xpNeeded - currentxp` raw, which goes negative on an overfilled
    // bar and renders a negative "XP remaining" count. The Rust side
    // saturates at 0 — the TS negative is a display bug, not data.
    let remaining = need.saturating_sub(currentxp);
    // TS display name (`!show.ts:82,105-108`): the guild member's
    // display name (server nickname first), with the global name /
    // username as fallback.
    let display = rank_display_name(&ctx, member).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Snapshot the avatar via the shared image64 helper so the card and
    // the thumbnail survive avatar changes (never a raw CDN URL).
    let face_url = member.face();
    let face_bytes = crate::image64::image64(&face_url).await;
    let avatar_data = face_bytes
        .as_deref()
        .map(|b| crate::image64::data_url(b, "image/png"));
    let title = crate::lang::get(&code, "level_embed_title")
        .map(|s| s.replace("${user.username}", &display))
        .unwrap_or_else(|| format!("__**XP Level**__: `{display}`"));
    // TS pairs the fields cross-wise: fields1_name carries the LEVEL
    // value (fields2_value), fields2_name carries the XP value
    // (fields1_value).
    let level_name =
        crate::lang::get(&code, "level_embed_fields1_name").unwrap_or_else(|| "Level".to_string());
    let level_value = crate::lang::get(&code, "level_embed_fields2_value")
        .map(|s| s.replace("${level}", &level.to_string()))
        .unwrap_or_else(|| format!("`{level}`"));
    let xp_name = crate::lang::get(&code, "level_embed_fields2_name")
        .unwrap_or_else(|| "Experience".to_string());
    let xp_value = crate::lang::get(&code, "level_embed_fields1_value")
        .map(|s| {
            s.replace("${currentxp}", &currentxp.to_string())
                .replace("${xpNeeded}", &need.to_string())
        })
        .unwrap_or_else(|| format!("`{currentxp}/{need}`"));
    let desc = crate::lang::get(&code, "level_embed_description")
        .map(|s| s.replace("${expNeededForLevelUp}", &remaining.to_string()))
        .unwrap_or_else(|| {
            format!("`{remaining}` **experience points needed for the next level!**")
        });
    let svg = crate::cards::rank_card_svg(&display, level, currentxp, avatar_data.as_deref());
    // Mirrors `!show.ts:66-67`: the embed colour is the avatar's
    // dominant colour, with a constant fallback when offline.
    let colour = crate::funcs::image_dominant_color(&face_url)
        .await
        .ok()
        .and_then(|(c1, _)| u32::from_str_radix(c1.trim_start_matches('#'), 16).ok())
        .unwrap_or(0x9A5AF2);
    let mut embed = serenity::CreateEmbed::default()
        .title(title)
        .colour(colour)
        .description(desc)
        .field(level_name, level_value, true)
        .field(xp_name, xp_value, true)
        .image("attachment://rank.svg")
        .timestamp(serenity::Timestamp::now());
    embed = if face_bytes.is_some() {
        embed.thumbnail("attachment://avatar.png")
    } else {
        embed.thumbnail(face_url)
    };
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some());
    let mut reply =
        poise::CreateReply::default()
            .embed(embed)
            .attachment(serenity::CreateAttachment::bytes(
                svg.into_bytes(),
                "rank.svg",
            ));
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "avatar.png"));
    }
    if let Some(bytes) = fbytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{load_rank_routed, save_rank_routed};
    use crate::commands::ranks::RankEntry;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn legacy_key_reads_and_promotes_to_new_key() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "RANKS.1",
            r#"{"level":2,"xp":10,"xptotal":210}"#,
        )
        .await
        .unwrap();
        let e = load_rank_routed(&pool, "g", 1).await;
        assert_eq!((e.level, e.xp, e.xptotal), (2, 10, 210));
        // Legacy hit promotes into the new TS-parity key.
        let promoted = crate::db::kv_get(&pool, "g", "USER.1.XP_LEVELING")
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<RankEntry>(&promoted).unwrap().level,
            2
        );
        // Unknown users still default.
        assert_eq!(load_rank_routed(&pool, "g", 9).await.level, 0);
    }

    #[tokio::test]
    async fn new_key_wins_over_legacy_on_conflict() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "RANKS.1",
            r#"{"level":9,"xp":0,"xptotal":9000}"#,
        )
        .await
        .unwrap();
        crate::db::kv_set(
            &pool,
            "g",
            "USER.1.XP_LEVELING",
            r#"{"level":1,"xp":5,"xptotal":105}"#,
        )
        .await
        .unwrap();
        let e = load_rank_routed(&pool, "g", 1).await;
        assert_eq!((e.level, e.xp, e.xptotal), (1, 5, 105));
    }

    #[tokio::test]
    async fn save_dual_writes_new_and_legacy_keys() {
        let pool = mem_pool().await;
        let entry = RankEntry {
            level: 3,
            xp: 7,
            xptotal: 307,
        };
        save_rank_routed(&pool, "g", 4, &entry).await.unwrap();
        // Routed save dual-writes, so legacy rows stay fresh for direct kv readers.
        let legacy = crate::db::kv_get(&pool, "g", "RANKS.4").await.unwrap();
        assert_eq!(
            serde_json::from_str::<RankEntry>(&legacy).unwrap().xptotal,
            307
        );
        let stored = crate::db::kv_get(&pool, "g", "USER.4.XP_LEVELING")
            .await
            .unwrap();
        assert_eq!(serde_json::from_str::<RankEntry>(&stored).unwrap().level, 3);
        // Round-trip through the routed loader.
        assert_eq!(load_rank_routed(&pool, "g", 4).await.xptotal, 307);
    }
}

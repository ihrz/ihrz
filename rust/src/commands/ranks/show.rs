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
/// the global name wins, then the member's display name (server
/// nickname first), falling back to the username when neither resolves.
pub async fn rank_display_name(ctx: &Ctx<'_>, user: &serenity::User) -> String {
    if let Some(g) = &user.global_name {
        if !g.is_empty() {
            return g.clone();
        }
    }
    if let Some(gid) = ctx.guild_id() {
        if let Ok(member) = gid.member(ctx.http(), user.id).await {
            let name = member.display_name();
            if !name.is_empty() {
                return name.to_string();
            }
        }
    }
    user.name.clone()
}

/// Get the user's xp level!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    aliases("rsee", "look", "level", "ranks-show"),
    name_localized("fr", "afficher"),
    name_localized("ja", "show"),
    name_localized("ru", "show"),
    name_localized("es-ES", "show"),
    description_localized("fr", "Obtenez le niveau XP de l'utilisateur"),
    description_localized("ja", "ユーザーのXPレベルを取得！"),
    description_localized("ru", "Получить уровень XP пользователя!"),
    description_localized("es-ES", "Obtener el nivel de XP del usuario!")
)]
pub async fn ranks_show(
    ctx: Ctx<'_>,
    #[description_localized("fr", "L'utilisateur que vous souhaitez rechercher.")]
    #[description_localized("ja", "検索したいユーザー（空白で自分の統計を表示）")]
    #[description_localized(
        "ru",
        "Пользователь для поиска, оставьте пустым для показа своей статистики"
    )]
    #[description_localized(
        "es-ES",
        "El usuario que quieres buscar, déjalo en blanco si quieres mostrar tus estadísticas"
    )]
    #[description = "Member"]
    user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    // Defer up front: rank load + member fetch + lang + avatar/color
    // HTTP + footer reads run before the first reply, past the 3s slash
    // window (ranks.ts `show` thinking: true; no defer_policy entry).
    ctx.defer().await?;
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
    // Avatar URL mirrors `user.displayAvatarURL({ extension: "png",
    // size: 4096 })` in !show.ts:62-65 (guild avatar first, then the
    // user avatar). PNG explicitly: `member.face()` yields webp, which
    // the image crate cannot decode, so every analysis failed into the
    // fallback colour instead of the pfp's.
    let face_url = match ctx
        .author_member()
        .await
        .as_deref()
        .and_then(|m| m.avatar.as_ref())
        .map(|h| {
            format!(
                "https://cdn.discordapp.com/guilds/{}/users/{}/avatars/{}.png?size=4096",
                ctx.guild_id().map(|g| g.get()).unwrap_or_default(),
                member.id.get(),
                h
            )
        }) {
        Some(url) => url,
        None => match &member.avatar {
            Some(hash) => format!(
                "https://cdn.discordapp.com/avatars/{}/{}.png?size=4096",
                member.id.get(),
                hash
            ),
            None => member.default_avatar_url(),
        },
    };
    let face_bytes = crate::image64::image64(&face_url).await;
    let title = crate::lang::get(&code, "level_embed_title")
        .map(|s| s.replace("${user.username}", &display))
        .unwrap_or_else(|| format!("__**XP Level**__: `{display}`"));
    // TS pairs the fields cross-wise: fields1_name carries the LEVEL
    // value (fields2_value), fields2_name carries the XP value
    // (fields1_value).
    let level_name = crate::lang::get(&code, "level_embed_fields1_name")
        .unwrap_or_else(|| ":arrow_up:・__Levels:__".to_string());
    let level_value = crate::lang::get(&code, "level_embed_fields2_value")
        .map(|s| s.replace("${level}", &level.to_string()))
        .unwrap_or_else(|| format!("`{level}`"));
    let xp_name = crate::lang::get(&code, "level_embed_fields2_name")
        .unwrap_or_else(|| ":money_with_wings:・__Experience:__".to_string());
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
    let labels = crate::cards::RankCardLabels {
        level_word: crate::lang::get(&code, "var_level").unwrap_or_else(|| "Level".to_string()),
        needed_label: crate::lang::get(&code, "level_xp_needed_for_new_level")
            .unwrap_or_else(|| "XP needed".to_string()),
        total_label: crate::lang::get(&code, "level_xp_total")
            .unwrap_or_else(|| "Total XP".to_string()),
    };
    // Card image mirrors !show.ts:78-101: the filled ranksCard HTML is
    // rendered to PNG (elementSelector ".card", transparent background)
    // and attached as image.png. Without a gateway the image is omitted
    // (Discord cannot display the SVG fallback, so it is not attached).
    let (color1_hex, color2_hex) = crate::funcs::image_dominant_color(&face_url)
        .await
        .unwrap_or_else(|_| ("#9A5AF2".to_string(), "#6D28D9".to_string()));
    let card_html = ranks_card_html(
        &face_url,
        &display,
        &level.to_string(),
        &(currentxp as f64 / need as f64 * 100.0).to_string(),
        &currentxp.to_string(),
        &need.to_string(),
        &remaining.to_string(),
        &currentxp.to_string(),
        &labels.level_word,
        &labels.total_label,
        &labels.needed_label,
        &color1_hex,
        &color2_hex,
    );
    let card_png: Option<Vec<u8>> = match ctx
        .data()
        .config
        .gateway_internal()
        .map(|base| (base, crate::config::api_token().unwrap_or_default()))
    {
        Some((base, token)) => crate::funcs::gateway_render_html(
            &base,
            &token,
            &card_html,
            RANK_CARD_OPTIONS_JSON,
            &[],
            Some(std::time::Duration::from_secs(30)),
        )
        .await
        .ok(),
        None => None,
    };
    // Mirrors `!show.ts:66-67,110`: the embed colour is the avatar's
    // dominant colour (color1), with a constant fallback when offline.
    let colour = u32::from_str_radix(color1_hex.trim_start_matches('#'), 16).unwrap_or(0x9A5AF2);
    let mut embed = serenity::CreateEmbed::default()
        .title(title)
        .colour(colour)
        .description(desc)
        .field(level_name, level_value, true)
        .field(xp_name, xp_value, true);
    if card_png.is_some() {
        embed = embed.image("attachment://image.png");
    }
    embed = embed.timestamp(serenity::Timestamp::now());
    embed = if face_bytes.is_some() {
        embed.thumbnail("attachment://avatar.png")
    } else {
        embed.thumbnail(face_url)
    };
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    // No icon means plain footer text (never an empty-string icon_url);
    // the file is attached below only when the footer references it.
    if fbytes.is_some() {
        embed = crate::commands::shared::embed_with_footer(embed, &fname, true);
    } else {
        embed = embed.footer(serenity::CreateEmbedFooter::new(fname.clone()));
    }
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(png) = card_png {
        reply = reply.attachment(serenity::CreateAttachment::bytes(png, "image.png"));
    }
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "avatar.png"));
    }
    if let Some(bytes) = fbytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Render options for the rank card. Mirrors the html2png call in
/// !show.ts:95-99 (elementSelector ".card", transparent background).
const RANK_CARD_OPTIONS_JSON: &str =
    r#"{"elementSelector":".card","omitBackground":true,"selectElement":true}"#;

/// `ranksCard` HTML template (`src/assets/html/ranksCard.html`, TS
/// `!show.ts:78`). The filled HTML feeds the gateway html2png render
/// (`image.png`); covered by `ranks_card_html_fill_replaces_every_placeholder`.
const RANKS_CARD_TEMPLATE: &str = include_str!("../../../../src/assets/html/ranksCard.html");

/// Fill the `ranksCard` template. Mirrors the replace chain in TS
/// `!show.ts:80-93` (single `replace` for the `AVATAR_URL` /
/// `USERNAME` / `LEVEL` / `PROGRESS_PERCENT` / `CURRENT_XP` /
/// `XP_NEEDED` / `XP_REMAINING` / `TOTAL_XP` / `{level}` /
/// `{xp_total}` / `{needed_xp}` slots, `replaceAll` for
/// `[color1]` / `[color2]` — identical output either way).
#[allow(clippy::too_many_arguments)]
pub fn ranks_card_html(
    avatar_url: &str,
    username: &str,
    level: &str,
    progress_percent: &str,
    current_xp: &str,
    xp_needed: &str,
    xp_remaining: &str,
    total_xp: &str,
    level_word: &str,
    xp_total_label: &str,
    needed_xp_label: &str,
    color1: &str,
    color2: &str,
) -> String {
    RANKS_CARD_TEMPLATE
        .replace("AVATAR_URL", avatar_url)
        .replace("USERNAME", username)
        .replace("LEVEL", level)
        .replace("PROGRESS_PERCENT", progress_percent)
        .replace("CURRENT_XP", current_xp)
        .replace("XP_NEEDED", xp_needed)
        .replace("XP_REMAINING", xp_remaining)
        .replace("TOTAL_XP", total_xp)
        .replace("{level}", level_word)
        .replace("{xp_total}", xp_total_label)
        .replace("{needed_xp}", needed_xp_label)
        .replace("[color1]", color1)
        .replace("[color2]", color2)
}

#[cfg(test)]
mod ranks_card_html_tests {
    use super::ranks_card_html;

    #[test]
    fn ranks_card_html_fill_replaces_every_placeholder() {
        let html = ranks_card_html(
            "AV",
            "bob",
            "3",
            "50",
            "250",
            "500",
            "250",
            "250",
            "Level",
            "Total XP:",
            "XP until next level:",
            "#9a5af2",
            "#6d28d9",
        );
        for ph in [
            "AVATAR_URL",
            "USERNAME",
            "LEVEL",
            "PROGRESS_PERCENT",
            "CURRENT_XP",
            "XP_NEEDED",
            "XP_REMAINING",
            "TOTAL_XP",
            "{level}",
            "{xp_total}",
            "{needed_xp}",
            "[color1]",
            "[color2]",
        ] {
            assert!(!html.contains(ph), "placeholder left: {ph}");
        }
        assert!(html.contains("bob"));
    }
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

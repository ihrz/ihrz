// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/invitesmanager/*.
//
// TS keys: <guild>.USER.<uid>.INVITES {invites, regular, bonus, leaves}.
// Leaderboard scans USER table sorted desc with 15/page pagination.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct InviteStats {
    #[serde(default)]
    pub invites: i64,
    #[serde(default)]
    pub regular: i64,
    #[serde(default)]
    pub bonus: i64,
    #[serde(default)]
    pub leaves: i64,
}

pub fn invites_key(user_id: u64) -> String {
    format!("USER.{user_id}.INVITES")
}

pub fn add_invites(s: &InviteStats, amount: i64) -> InviteStats {
    InviteStats {
        invites: s.invites + amount,
        regular: s.regular,
        bonus: s.bonus + amount,
        leaves: s.leaves,
    }
}

pub fn remove_invites(s: &InviteStats, amount: i64) -> InviteStats {
    InviteStats {
        invites: (s.invites - amount).max(0),
        regular: s.regular,
        bonus: (s.bonus - amount).max(0),
        leaves: s.leaves,
    }
}

/// Sort desc by invites, stable by user id asc. Mirrors leaderboard tri.
pub fn sort_leaderboard(mut rows: Vec<(u64, InviteStats)>) -> Vec<(u64, InviteStats)> {
    rows.sort_by(|a, b| b.1.invites.cmp(&a.1.invites).then(a.0.cmp(&b.0)));
    rows
}

pub async fn load_invites(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> InviteStats {
    crate::db::kv_get(pool, guild_id, &invites_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_invites(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    stats: &InviteStats,
) -> anyhow::Result<()> {
    crate::db::kv_set(
        pool,
        guild_id,
        &invites_key(user_id),
        &serde_json::to_string(stats)?,
    )
    .await
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "invitemanager",
    rename = "inv",
    subcommands("inv_see", "inv_add", "inv_remove", "inv_lb", "inv_reset"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn inv(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "invites")]
pub async fn inv_see(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let target = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let s = load_invites(&ctx.data().pool, &gid, target).await;
    ctx.say(format!(
        "Invites: {} (bonus {}, leaves {})",
        s.invites, s.bonus, s.leaves
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "addinvites")]
pub async fn inv_add(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let cur = load_invites(&ctx.data().pool, &gid, uid).await;
    let next = add_invites(&cur, amount.max(0));
    save_invites(&ctx.data().pool, &gid, uid, &next).await?;
    ctx.say(format!("Added {amount} invites (total {})", next.invites))
        .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "removeinvites")]
pub async fn inv_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let cur = load_invites(&ctx.data().pool, &gid, uid).await;
    let next = remove_invites(&cur, amount.max(0));
    save_invites(&ctx.data().pool, &gid, uid, &next).await?;
    ctx.say(format!("Removed {amount} invites (total {})", next.invites))
        .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "leaderboard")]
pub async fn inv_lb(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.INVITES'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut parsed: Vec<(u64, InviteStats)> = rows
        .iter()
        .filter_map(|(k, v)| {
            let id = k
                .strip_prefix("USER.")?
                .strip_suffix(".INVITES")?
                .parse()
                .ok()?;
            let s: InviteStats = serde_json::from_str(v).ok()?;
            Some((id, s))
        })
        .collect();
    parsed = sort_leaderboard(parsed);
    let page = crate::executor::paginate(&parsed, 1, 15);
    let top: Vec<String> = page
        .iter()
        .enumerate()
        .map(|(i, (uid, s))| format!("{}. <@{uid}> — {}", i + 1, s.invites))
        .collect();
    ctx.say(if top.is_empty() {
        "No invites.".to_string()
    } else {
        top.join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "reset")]
pub async fn inv_reset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "resetallinvites_warning_msg",
        "Delete all invite data? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.INVITES'")
        .bind(&gid)
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Invites reset.").await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_goes_to_bonus_not_regular() {
        let s = add_invites(&InviteStats::default(), 5);
        assert_eq!(s.invites, 5);
        assert_eq!(s.bonus, 5);
        assert_eq!(s.regular, 0);
    }

    #[test]
    fn remove_floors_at_zero() {
        let s = remove_invites(
            &InviteStats {
                invites: 3,
                bonus: 3,
                ..Default::default()
            },
            10,
        );
        assert_eq!(s.invites, 0);
        assert_eq!(s.bonus, 0);
    }

    #[test]
    fn leaderboard_sorts_desc_then_id() {
        let rows = vec![
            (
                2,
                InviteStats {
                    invites: 5,
                    ..Default::default()
                },
            ),
            (
                1,
                InviteStats {
                    invites: 5,
                    ..Default::default()
                },
            ),
            (
                3,
                InviteStats {
                    invites: 9,
                    ..Default::default()
                },
            ),
        ];
        let sorted = sort_leaderboard(rows);
        assert_eq!(sorted[0].0, 3);
        assert_eq!(sorted[1].0, 1);
        assert_eq!(sorted[2].0, 2);
    }
}

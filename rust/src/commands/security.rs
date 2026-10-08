// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/security/*.
//
// TS keys: <guild>.SECURITY.disable (bool, false = on), .channel,
// .role (role-to-give), .role2 (role-to-remove).
// YAML: security_disable_pw_on/off, security_channel_command_work,
// security_role_to_give_command_work.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// "on" => enabled=true, "off" => enabled=false.
pub fn parse_on_off(action: &str) -> Option<bool> {
    match action.to_ascii_lowercase().as_str() {
        "on" | "power on" | "enable" => Some(true),
        "off" | "power off" | "disable" => Some(false),
        _ => None,
    }
}

/// Captcha code: 5 chars from unambiguous alphabet (no 0/O/1/l).
/// Mirrors Events/security/onMemberJoin.ts image captcha.
pub fn gen_captcha(seed: u64) -> String {
    const ALPHA: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut out = String::with_capacity(5);
    for _ in 0..5 {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        out.push(ALPHA[(state % ALPHA.len() as u64) as usize] as char);
    }
    out
}

/// Exact TS alphabet (captcha.ts, 7 chars, no J).
pub fn captcha_code(seed: u64) -> String {
    const ALPHA: &[u8] = b"ABCDEFGHIKLMNOPQRSTUVWXYZ0123456789";
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut out = String::with_capacity(7);
    for _ in 0..7 {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        out.push(ALPHA[(state % ALPHA.len() as u64) as usize] as char);
    }
    out
}

pub fn verify_captcha(expected: &str, given: &str) -> bool {
    expected.eq_ignore_ascii_case(given.trim())
}

/// TS stores `disable` (inverse of enabled).
pub fn disable_flag(enabled: bool) -> &'static str {
    if enabled {
        "0"
    } else {
        "1"
    }
}

async fn guild_id_str(ctx: &Ctx<'_>) -> Option<String> {
    ctx.guild_id().map(|g| g.get().to_string())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "security",
    rename = "security",
    subcommands(
        "security_channel",
        "security_config",
        "security_give",
        "security_remove"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn security(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "channel")]
pub async fn security_channel(
    ctx: Ctx<'_>,
    #[description = "Verification channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_str(&ctx).await else {
        return Ok(());
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "SECURITY.channel",
        &channel.id.get().to_string(),
    )
    .await?;
    let lang = ctx.data().pool.clone();
    let code = crate::db::guild_lang(&lang, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "security_channel_command_work")
        .unwrap_or_else(|| "Security channel set.".to_string());
    ctx.say(msg).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "config")]
pub async fn security_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let Some(enabled) = parse_on_off(&action) else {
        ctx.say("Use on/off.").await?;
        return Ok(());
    };
    let Some(gid) = guild_id_str(&ctx).await else {
        return Ok(());
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "SECURITY.disable",
        disable_flag(enabled),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let key = if enabled {
        "security_disable_pw_on"
    } else {
        "security_disable_pw_off"
    };
    let msg = crate::lang::get(&code, key).unwrap_or_else(|| key.to_string());
    ctx.say(msg).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "role-to-give")]
pub async fn security_give(
    ctx: Ctx<'_>,
    #[description = "Role to give"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_str(&ctx).await else {
        return Ok(());
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "SECURITY.role",
        &role.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "security_role_to_give_command_work")
        .unwrap_or_else(|| "Role to give set.".to_string());
    ctx.say(msg).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "role-to-remove")]
pub async fn security_remove(
    ctx: Ctx<'_>,
    #[description = "Role to remove"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_str(&ctx).await else {
        return Ok(());
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "SECURITY.role2",
        &role.id.get().to_string(),
    )
    .await?;
    ctx.say("Role to remove set.").await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn on_off_parses_ts_choices() {
        assert_eq!(parse_on_off("on"), Some(true));
        assert_eq!(parse_on_off("off"), Some(false));
        assert_eq!(parse_on_off("Power On"), Some(true));
        assert_eq!(parse_on_off("Power Off"), Some(false));
        assert_eq!(parse_on_off("bogus"), None);
    }

    #[test]
    fn disable_flag_is_inverse_of_enabled() {
        assert_eq!(disable_flag(true), "0");
        assert_eq!(disable_flag(false), "1");
    }

    #[test]
    fn captcha_exact_shape() {
        let c = captcha_code(99);
        assert_eq!(c.len(), 7);
        assert!(c
            .chars()
            .all(|x| "ABCDEFGHIKLMNOPQRSTUVWXYZ0123456789".contains(x)));
        assert!(!c.contains('J'));
    }

    #[test]
    fn captcha_roundtrip_case_insensitive() {
        let code = gen_captcha(12345);
        assert_eq!(code.len(), 5);
        assert!(verify_captcha(&code, &code.to_ascii_lowercase()));
        assert!(!verify_captcha(&code, "zzzzz"));
        assert!(!verify_captcha(&code, ""));
    }
}

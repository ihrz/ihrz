// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/rolereactions/* (rolereaction,
// rolebutton, roleselect). Runtime toggling lives in events_handler.rs
// (reaction_add/remove); roleselect builder UI flattened to kv config.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// Emoji normalization: custom `<:name:id>` / `<a:name:id>` -> id, else raw.
/// Mirrors emojiChecker + regex in rolebutton.ts.
pub fn normalize_emoji(raw: &str) -> String {
    let s = raw.trim();
    if let Some(start) = s.rfind(':') {
        let mut id: String = s[start + 1..]
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .collect();
        if !id.is_empty() {
            return id;
        }
        // animated form <a:name:id> handled by same branch; fall through otherwise
        let _ = &mut id;
    }
    s.to_string()
}

pub fn rr_key(message_id: u64, emoji: &str) -> String {
    format!("GUILD.REACTION_ROLES.{message_id}.{emoji}")
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "rolereactions",
    rename = "rolereaction",
    subcommands("rr_add", "rr_remove"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rolereaction(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rr_add(
    ctx: Ctx<'_>,
    #[description = "Message id"] message_id: String,
    #[description = "Emoji"] emoji: String,
    #[description = "Role"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    if mid == 0 {
        ctx.say("Bad message id.").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &rr_key(mid, &normalize_emoji(&emoji)),
        &role.id.get().to_string(),
    )
    .await?;
    ctx.say("Reaction role added.").await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rr_remove(
    ctx: Ctx<'_>,
    #[description = "Message id"] message_id: String,
    #[description = "Emoji"] emoji: String,
) -> Result<(), anyhow::Error> {
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(rr_key(mid, &normalize_emoji(&emoji)))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Reaction role removed.").await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "rolereactions",
    rename = "rolebutton",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rolebutton(
    ctx: Ctx<'_>,
    #[description = "Message id"] message_id: String,
    #[description = "Emoji"] emoji: String,
    #[description = "Role"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    if mid == 0 {
        ctx.say("Bad message id.").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("GUILD.BUTTON_ROLES.{mid}.{}", normalize_emoji(&emoji)),
        &role.id.get().to_string(),
    )
    .await?;
    ctx.say("Button role added.").await?;
    Ok(())
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct RoleSelectEntry {
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub role_id: String,
    #[serde(default)]
    pub emoji: String,
    #[serde(default)]
    pub desc: String,
}

pub fn roleselect_key(message_id: u64) -> String {
    format!("GUILD.ROLE_SELECT.{message_id}")
}

pub const ROLESELECT_CUSTOM_ID: &str = "roleselect-pick";

/// Pure helper: parse a "role_<id>" select value into a RoleId.
pub fn parse_roleselect_value(value: &str) -> Option<serenity::RoleId> {
    value
        .strip_prefix("role_")?
        .trim()
        .parse::<u64>()
        .ok()
        .map(serenity::RoleId::new)
}

pub async fn load_roleselect(
    pool: &crate::db::Pool,
    guild_id: &str,
    message_id: u64,
) -> Vec<RoleSelectEntry> {
    crate::db::kv_get(pool, guild_id, &roleselect_key(message_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "rolereactions",
    rename = "roleselect",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn roleselect(
    ctx: Ctx<'_>,
    #[description = "Channel to post in"] channel: serenity::Channel,
    #[description = "Role 1"] role1: serenity::Role,
    #[description = "Role 2"] role2: Option<serenity::Role>,
    #[description = "Role 3"] role3: Option<serenity::Role>,
    #[description = "Placeholder"] placeholder: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let roles: Vec<serenity::Role> = [Some(role1), role2, role3].into_iter().flatten().collect();
    let entries: Vec<RoleSelectEntry> = roles
        .iter()
        .map(|r| RoleSelectEntry {
            label: r.name.clone(),
            role_id: r.id.get().to_string(),
            ..Default::default()
        })
        .collect();

    let options: Vec<serenity::CreateSelectMenuOption> = entries
        .iter()
        .map(|e| {
            serenity::CreateSelectMenuOption::new(e.label.clone(), format!("role_{}", e.role_id))
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        ROLESELECT_CUSTOM_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(placeholder.unwrap_or_else(|| "Pick your roles".to_string()));
    let row = serenity::CreateActionRow::SelectMenu(menu);

    let guild_channel = channel.id().to_channel(&ctx.http()).await?;
    let target = guild_channel.guild().expect("guild channel only");
    let msg = target
        .send_message(
            &ctx.http(),
            serenity::CreateMessage::new()
                .content("Select your roles below.")
                .components(vec![row]),
        )
        .await?;

    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &roleselect_key(msg.id.get()),
        &serde_json::to_string(&entries)?,
    )
    .await?;
    ctx.say(format!("Roleselect posted: {}.", msg.id.get()))
        .await?;
    Ok(())
}

/// Component handler: toggle the chosen role. Called from
/// events_handler.rs `interaction_create` when
/// `custom_id == ROLESELECT_CUSTOM_ID`.
pub async fn handle_roleselect_pick(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let values = match &comp.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => values.clone(),
        _ => vec![],
    };
    let Some(first) = values.first() else {
        return Ok(());
    };
    let Some(role_id) = parse_roleselect_value(first) else {
        return Ok(());
    };
    let member = guild_id.member(&ctx.http, comp.user.id).await?;
    let has = member.roles.contains(&role_id);
    if has {
        member.remove_role(&ctx.http, role_id).await?;
    } else {
        member.add_role(&ctx.http, role_id).await?;
    }
    comp.create_response(
        &ctx.http,
        serenity::CreateInteractionResponse::Message(
            serenity::CreateInteractionResponseMessage::new()
                .content(if has { "Role removed." } else { "Role added." })
                .ephemeral(true),
        ),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_role_values() {
        assert_eq!(
            parse_roleselect_value("role_123"),
            Some(serenity::RoleId::new(123))
        );
        assert_eq!(parse_roleselect_value("role_abc"), None);
        assert_eq!(parse_roleselect_value("pick_123"), None);
        assert_eq!(parse_roleselect_value(""), None);
    }

    #[test]
    fn roleselect_key_shape() {
        assert_eq!(roleselect_key(42), "GUILD.ROLE_SELECT.42");
    }

    #[test]
    fn emoji_normalizes_custom() {
        assert_eq!(normalize_emoji("<:pepe:12345>"), "12345");
        assert_eq!(normalize_emoji("<a:dance:678>"), "678");
        assert_eq!(normalize_emoji("👍"), "👍");
        assert_eq!(normalize_emoji("⭐"), "⭐");
    }
}

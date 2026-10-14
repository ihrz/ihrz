use super::*;
use poise::serenity_prelude as serenity;

// FAILED-unexpressible as a static ChoiceParameter: the TS `permission`
// choices (`permissionLevel`, perm.ts:42-61/113/224/317) are computed at
// runtime by spreading the `permissionsRole` array (`...permissionsRole.map(...)`)
// with a `.filter(x => x.value !== "0")` variant, and the `command`
// option (perm.ts:362-393) is built from the live `client.commands`
// registry. Both stay free-form here (numeric level 0-9 / command path).

/// Escalation gate for `perm-user`. Mirrors `!set-user.ts`:
/// `fetchedPerm <= parseInt(perm) && guild.ownerId !== member.id`
/// warns and returns. `checkUserPermissions` reads the caller's
/// `UTILS.USER_PERMS.<caller>` row (or 0); the `Array.isArray` arm in
/// TS never fires for that helper (it returns a level), so it maps to
/// "not blocked". Pure for testability.
pub fn perm_user_blocked(caller_level: i64, target: i64, is_owner: bool) -> bool {
    !is_owner && caller_level <= target
}

/// Key for one user's global level (`UTILS.USER_PERMS.<uid>`).
pub fn user_perm_key(user_id: u64) -> String {
    format!("UTILS.USER_PERMS.{user_id}")
}

/// Perm set-user command (`user` + `permission`; 0 deletes the row).
// Mirrors the TS `set-user` subcommand (perm.ts:74-125 + `!set-user.ts`):
// `permission` is a string choice 0-9 in TS, free-form numeric here like
// `command`'s `permission`. No `command` scoping: the row is global
// (`UTILS.USER_PERMS.<uid>`).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-user",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_user(
    ctx: Ctx<'_>,
    #[description = "Member you want"] user: serenity::User,
    #[description = "Permission you want to set for the member (0 deletes)"] permission: i64,
) -> Result<(), anyhow::Error> {
    // Defer up front: lang + level/owner reads + write run before the
    // first reply (perm.ts:409 `thinking: true`; no defer_policy entry).
    ctx.defer().await?;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let permission = permission.clamp(0, 9);
    // `perm === "0"` deletes the row (TS `db.delete`).
    if permission == 0 {
        let _ = crate::db::tbl_del(pool, &gid, &user_perm_key(user.id.get())).await;
        ctx.say(
            crate::lang::get(&code, "perm_set_deleted")
                .map(|s| s.replace("${user.toString()}", &user.to_string()))
                .unwrap_or_else(|| format!("Permission deleted for {}.", user)),
        )
        .await?;
        return Ok(());
    }
    // Escalation guard (non-owners cannot grant at/above their own level).
    let caller_level: i64 = crate::db::tbl_get(pool, &gid, &user_perm_key(ctx.author().id.get()))
        .await
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0);
    let is_owner = ctx
        .guild()
        .map(|g| g.owner_id.get() == ctx.author().id.get())
        .unwrap_or(false);
    if perm_user_blocked(caller_level, permission, is_owner) {
        ctx.say(
            crate::lang::get(&code, "perm_set_warn_message")
                .map(|s| {
                    s.replace(
                        "${interaction.member.toString()}",
                        &ctx.author().to_string(),
                    )
                })
                .unwrap_or_else(|| {
                    format!(
                        "{} You cannot set a permission at or above your own level.",
                        ctx.author()
                    )
                }),
        )
        .await?;
        return Ok(());
    }
    crate::db::tbl_set(
        pool,
        &gid,
        &user_perm_key(user.id.get()),
        &permission.to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "perm_set_ok")
            .map(|s| {
                s.replace("${user.toString()}", &user.to_string())
                    .replace("${perm}", &permission.to_string())
            })
            .unwrap_or_else(|| format!("Permission set for {user}.")),
    )
    .await?;
    Ok(())
}

/// Parse one stored per-user level. Rust writes plain integers
/// (`tbl_set` of `permission.to_string()`); legacy TS rows are JSON
/// numbers. Accepts both (plus JSON strings for safety).
fn parse_user_perm_level(raw: &str) -> Option<i64> {
    if let Ok(n) = raw.trim().parse::<i64>() {
        return Some(n);
    }
    match serde_json::from_str::<serde_json::Value>(raw).ok()? {
        serde_json::Value::Number(n) => n.as_i64(),
        serde_json::Value::String(s) => s.trim().parse().ok(),
        _ => None,
    }
}

/// Load every per-user global level (`UTILS.USER_PERMS` map of
/// user id -> level). Mirrors the `all_members` read in `!list.ts`.
/// Merged-table subtree first (wins on conflict), legacy / dual-write
/// per-uid rows via prefix scan below it. Sorted by user id.
async fn load_all_user_perms(pool: &crate::db::Pool, gid: &str) -> Vec<(String, i64)> {
    use std::collections::HashMap;
    let mut levels: HashMap<String, i64> = HashMap::new();
    for (key, value) in crate::db::kv_scan_prefix(pool, gid, "UTILS.USER_PERMS.").await {
        if let Some(uid) = key
            .strip_prefix("UTILS.USER_PERMS.")
            .filter(|u| !u.is_empty() && !u.contains('.'))
        {
            if let Some(n) = parse_user_perm_level(&value) {
                levels.insert(uid.to_string(), n);
            }
        }
    }
    if let Some(raw) = crate::db::tbl_get(pool, gid, "UTILS.USER_PERMS").await {
        if let Ok(map) = serde_json::from_str::<HashMap<String, serde_json::Value>>(&raw) {
            for (uid, v) in map {
                if uid.is_empty() || uid.contains('.') {
                    continue;
                }
                let n = match &v {
                    serde_json::Value::Number(n) => n.as_i64(),
                    serde_json::Value::String(s) => s.trim().parse().ok(),
                    _ => None,
                };
                if let Some(n) = n {
                    levels.insert(uid, n);
                }
            }
        }
    }
    let mut out: Vec<(String, i64)> = levels.into_iter().collect();
    out.sort();
    out
}

/// Perm list command (no options; page 1 of the guild user grants).
// Mirrors the TS `list` subcommand (perm.ts:272-287, body `!list.ts`):
// all granted users (`UTILS.USER_PERMS` members plus the `UTILS.roles`
// level map), grouped as `Perm N` embed fields, 10 entries per page
// with prev/next buttons in TS. The stateless leaf shows page 1 with
// no buttons (same precedent as the `command` list arm).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Defer up front: map loads + lang read run before the first reply
    // (perm.ts:409 `thinking: true`; no defer_policy entry).
    ctx.defer().await?;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let members = load_all_user_perms(pool, &gid).await;
    let roles = load_perm_roles(pool, &gid).await;
    // TS order: role-map entries first, then member entries.
    let mut all: Vec<(i64, String)> = vec![];
    let mut role_levels: Vec<(i64, String)> = roles
        .into_iter()
        .filter_map(|(perm, rid)| perm.parse::<i64>().ok().map(|g| (g, rid)))
        .collect();
    role_levels.sort();
    for (group, rid) in role_levels {
        all.push((group, format!("<@&{rid}>")));
    }
    for (uid, group) in members {
        all.push((group, format!("<@{uid}>")));
    }
    let total_pages = all.len().div_ceil(10).max(1);
    let mut grouped: std::collections::BTreeMap<i64, Vec<String>> =
        std::collections::BTreeMap::new();
    for (group, mention) in all.into_iter().take(10) {
        grouped.entry(group).or_default().push(mention);
    }
    let mut embed = serenity::CreateEmbed::default()
        .colour(0x475387)
        .title(format!("{} (1/{total_pages})", t("perm_list_embed_title")))
        .timestamp(serenity::Timestamp::now());
    for (group, users) in &grouped {
        let mut value = users.join("\n");
        if value.is_empty() {
            value = t("perm_list_no_user");
            if value.is_empty() {
                value = "No user found".to_string();
            }
        }
        value.truncate(1024);
        embed = embed.field(format!("Perm {group}"), value, false);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Perm command action choice. Mirrors the `action` option `choices`
/// in perm.ts:151-192 (`command` subcommand): slash shows the
/// localized display names, the handler maps each variant back to the
/// TS `value` (`change` / `delete` / `delete-all` / `list`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum PermCommandAction {
    #[name = "change"]
    #[name_localized("en-US", "Change command permission")]
    #[name_localized("en-GB", "Change command permission")]
    #[name_localized("fr", "Modifier la permission de commande")]
    #[name_localized("ja", "change_command_permission")]
    #[name_localized("ru", "change_command_permission")]
    #[name_localized("es-ES", "change_command_permission")]
    Change,
    #[name = "delete"]
    #[name_localized("en-US", "Delete command permission")]
    #[name_localized("en-GB", "Delete command permission")]
    #[name_localized("fr", "Supprimer la permission de commande")]
    #[name_localized("ja", "delete_command_permission")]
    #[name_localized("ru", "delete_command_permission")]
    #[name_localized("es-ES", "delete_command_permission")]
    Delete,
    #[name = "delete-all"]
    #[name_localized("en-US", "Delete permission (role/user/level)")]
    #[name_localized("en-GB", "Delete permission (role/user/level)")]
    #[name_localized("fr", "Supprimer la permission (rôle/utilisateur/niveau)")]
    #[name_localized("ja", "delete_permission_role_user_leve")]
    #[name_localized("ru", "delete_permission_role_user_leve")]
    #[name_localized("es-ES", "delete_permission_role_user_leve")]
    DeleteAll,
    #[name = "list"]
    #[name_localized("en-US", "List all commands permission set")]
    #[name_localized("en-GB", "List all commands permission set")]
    #[name_localized("fr", "Liste toutes les permissions de commande")]
    #[name_localized("ja", "list_all_commands_permission_set")]
    #[name_localized("ru", "list_all_commands_permission_set")]
    #[name_localized("es-ES", "list_all_commands_permission_set")]
    List,
}

impl PermCommandAction {
    /// TS `value` (`change` / `delete` / `delete-all` / `list`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Change => "change",
            Self::Delete => "delete",
            Self::DeleteAll => "delete-all",
            Self::List => "list",
        }
    }
}

/// Perm command settings (TS `command` subcommand).
// Mirrors SlashCommands/guildconfig/perm/!command.ts: required
// `action` (change/delete/delete-all/list) with the shared
// `command` / `permission` / `custom-role` / `custom-user` options,
// dispatching to the four existing bodies below (kept as leaves
// until the frozen `perm` parent + registry pins are rewired in
// follow-up; NOT this unit).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "command",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_command(
    ctx: Ctx<'_>,
    #[description = "What you want to do?"] action: PermCommandAction,
    #[description = "The command you want to update"] command: Option<String>,
    #[description = "The permission for the selected command"] permission: Option<i64>,
    // TS SlashCommands/guildconfig/perm/!command.ts registers "custom-role" / "custom-user".
    #[description = "The custom role you want to set for the command"]
    #[rename = "custom-role"]
    custom_role: Option<serenity::Role>,
    #[description = "The custom user you want to set for the command"]
    #[rename = "custom-user"]
    custom_user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    // Defer up front: every action arm does lang + row reads/writes
    // before the first reply (perm.ts:409 `thinking: true`).
    ctx.defer().await?;
    match action {
        // TS !command.ts change arm: missing `command` ->
        // `perm_add_args_error` (guarded inside the shared body).
        PermCommandAction::Change => {
            run_perm_change(ctx, command, permission, custom_role, custom_user).await
        }
        PermCommandAction::Delete => run_perm_delete(ctx, command).await,
        PermCommandAction::DeleteAll => {
            run_perm_delete_all(ctx, permission, custom_role, custom_user).await
        }
        // TS list arm pages via prev/next buttons; the leaf's stateless
        // `page` option has no TS counterpart, so the dispatcher opens
        // page 1 (`None`).
        PermCommandAction::List => run_perm_list_all(ctx, None).await,
    }
}

/// Shared change body (TS `command` subcommand, change action).
// Mirrors the change action in !command.ts: level set (0 clears),
// role/user toggle, change summary, row deleted when emptied.
// Missing/empty `command` answers `perm_add_args_error`, like TS.
pub async fn run_perm_change(
    ctx: Ctx<'_>,
    command: Option<String>,
    permission: Option<i64>,
    custom_role: Option<serenity::Role>,
    custom_user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let Some(command) = command
        .map(|c| c.trim().to_string())
        .filter(|c| !c.is_empty())
    else {
        ctx.say(t("perm_add_args_error")).await?;
        return Ok(());
    };
    let mut perms = load_cmd_perms(pool, &gid, &command)
        .await
        .unwrap_or_default();
    let mut changes: Vec<String> = vec![];
    if let Some(p) = permission {
        let normalized = match p.clamp(0, 9) as u8 {
            0 => None,
            n => Some(n),
        };
        if normalized != perms.level {
            let none = t("var_none");
            changes.push(format!(
                "{}: {} ➡️ {}",
                t("perm_set_chng_perm_lvl"),
                perm_level_label(perms.level, &none),
                perm_level_label(normalized, &none)
            ));
            perms.level = normalized;
        }
    }
    if let Some(role) = &custom_role {
        let id = role.id.get().to_string();
        let mention = format!("<@&{id}>");
        if toggle_grant(&mut perms.roles, &id) {
            changes.push(format!("{}: {mention}", t("perm_set_add_role")));
        } else {
            changes.push(format!("{}: {mention}", t("perm_rmv_role")));
        }
    }
    if let Some(user) = &custom_user {
        let id = user.id.get().to_string();
        let mention = format!("<@{id}>");
        if toggle_grant(&mut perms.users, &id) {
            changes.push(format!("{}: {mention}", t("perm_set_add_usr")));
        } else {
            changes.push(format!("{}: {mention}", t("perm_rmv_usr")));
        }
    }
    let parts = command.split_whitespace().count();
    let kind = match parts {
        1 => t("var_command"),
        2 => t("var_subcommand"),
        _ => t("var_subcommand_group"),
    };
    if !has_perm_requirements(&perms) {
        crate::db::tbl_del(pool, &gid, &perm_key(&command)).await?;
        ctx.say(format!(
            "{kind}: {command}\n {}",
            t("perm_set_command_reset")
        ))
        .await?;
    } else {
        let summary = if changes.is_empty() {
            t("perm_set_no_modified")
        } else {
            changes.join("\n")
        };
        crate::db::tbl_set(
            pool,
            &gid,
            &perm_key(&command),
            &serde_json::to_string(&perms).unwrap_or_default(),
        )
        .await?;
        ctx.say(format!("{kind}: {command}\n\n{summary}")).await?;
    }
    Ok(())
}

/// Shared delete body (TS `command` subcommand, delete action).
// Mirrors the delete action in !command.ts.
pub async fn run_perm_delete(ctx: Ctx<'_>, command: Option<String>) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let Some(cmd) = command
        .map(|c| c.trim().to_string())
        .filter(|c| !c.is_empty())
    else {
        ctx.say(t("perm_command_delete_specify_command")).await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    if load_cmd_perms(pool, &gid, &cmd).await.is_none() {
        ctx.say(t("perm_command_delete_dont_exist")).await?;
        return Ok(());
    }
    crate::db::tbl_del(pool, &gid, &perm_key(&cmd)).await?;
    ctx.say(t("perm_command_delete_command_deleted").replace("${commands}", &cmd))
        .await?;
    Ok(())
}

/// Shared list body (TS `command` subcommand, list action).
// Mirrors the list action in !command.ts (15 fields per page;
// page param replaces the prev/next collector).
pub async fn run_perm_list_all(ctx: Ctx<'_>, page: Option<i64>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let entries = load_all_cmd_perms(pool, &gid).await;
    if entries.is_empty() {
        ctx.say(t("perm_list_no_command_set")).await?;
        return Ok(());
    }
    let live: std::collections::HashSet<String> = ctx
        .guild_id()
        .map(|g| {
            ctx.cache()
                .guild(g)
                .map(|gd| gd.roles.keys().map(|r| r.get().to_string()).collect())
                .unwrap_or_default()
        })
        .unwrap_or_default();
    let fields = perm_list_fields(&entries, &t("var_permission"), Some(&live));
    let pages = fields.len().div_ceil(15).max(1);
    let page = (page.unwrap_or(1).max(1) as usize).min(pages);
    let mut embed = serenity::CreateEmbed::default()
        .colour(0x010101)
        .title(format!("{} ({page}/{pages})", t("var_permission")))
        .timestamp(serenity::Timestamp::now());
    for (name, value, inline) in fields.iter().skip((page - 1) * 15).take(15) {
        embed = embed.field(name, value, *inline);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Shared delete-all body (TS `command` subcommand, delete-all action).
// Mirrors the delete-all action in !command.ts.
pub async fn run_perm_delete_all(
    ctx: Ctx<'_>,
    permission: Option<i64>,
    custom_role: Option<serenity::Role>,
    custom_user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let set_count = [
        permission.is_some(),
        custom_role.is_some(),
        custom_user.is_some(),
    ]
    .into_iter()
    .filter(|b| *b)
    .count();
    if set_count == 0 {
        ctx.say(t("perm_command_delete_all_one")).await?;
        return Ok(());
    }
    if set_count > 1 {
        ctx.say(t("perm_command_delete_all_one_option")).await?;
        return Ok(());
    }
    let entries = load_all_cmd_perms(pool, &gid).await;
    if entries.is_empty() {
        ctx.say(t("perm_list_no_command_set")).await?;
        return Ok(());
    }
    let mut changes: Vec<String> = vec![];
    if let Some(p) = permission {
        let level = p.clamp(0, 9) as u8;
        for (cmd, perms) in &entries {
            if perms.level.unwrap_or(0) == level && level > 0 {
                crate::db::tbl_del(pool, &gid, &perm_key(cmd)).await?;
                changes.push(format!("- {cmd} ({}: {level})\n", t("var_level")));
            }
        }
    } else if let Some(role) = &custom_role {
        let id = role.id.get().to_string();
        for (cmd, perms) in &entries {
            if perms.roles.iter().any(|r| r == &id) {
                let mut next = perms.clone();
                next.roles.retain(|r| r != &id);
                if !has_perm_requirements(&next) {
                    crate::db::tbl_del(pool, &gid, &perm_key(cmd)).await?;
                } else {
                    crate::db::tbl_set(
                        pool,
                        &gid,
                        &perm_key(cmd),
                        &serde_json::to_string(&next).unwrap_or_default(),
                    )
                    .await?;
                }
                changes.push(format!("- {cmd} ({}: @{})\n", t("var_roles"), role.name));
            }
        }
    } else if let Some(user) = &custom_user {
        let id = user.id.get().to_string();
        for (cmd, perms) in &entries {
            if perms.users.iter().any(|u| u == &id) {
                let mut next = perms.clone();
                next.users.retain(|u| u != &id);
                if !has_perm_requirements(&next) {
                    crate::db::tbl_del(pool, &gid, &perm_key(cmd)).await?;
                } else {
                    crate::db::tbl_set(
                        pool,
                        &gid,
                        &perm_key(cmd),
                        &serde_json::to_string(&next).unwrap_or_default(),
                    )
                    .await?;
                }
                changes.push(format!("- {cmd} ({}: {id})\n", t("var_user")));
            }
        }
    }
    if changes.is_empty() {
        ctx.say(t("perm_command_delete_all_zero_change")).await?;
        return Ok(());
    }
    let (kind, value) = if let Some(p) = permission {
        (t("var_permission"), p.clamp(0, 9).to_string())
    } else if let Some(role) = &custom_role {
        (t("var_roles"), format!("<@&{}>", role.id.get()))
    } else if let Some(user) = &custom_user {
        (t("var_user"), format!("<@{}>", user.id.get()))
    } else {
        (String::new(), String::new())
    };
    let mut msg = format!("```diff\n{}```", changes.concat());
    msg += &t("perm_command_delete_all_command_ok")
        .replace("${changes.length}", &changes.len().to_string())
        .replace("${type}", &kind)
        .replace("${value}", &value);
    ctx.say(msg).await?;
    Ok(())
}

/// Create the Perm 1-9 roles when missing.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "create-roles",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_roles_create(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    // Defer up front: lang + owner check + up to 9 role creates run
    // before the first reply (perm.ts:409 `thinking: true`).
    ctx.defer().await?;
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if !is_guild_owner(ctx).await {
        ctx.say(
            crate::lang::get(&code, "perm_roles_not_owner").unwrap_or_else(|| {
                "Only the server owner can add permission level roles.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    let outcome: anyhow::Result<String> = async {
        let mut map = load_perm_roles(pool, &gid).await;
        let guild_id = ctx.guild_id().unwrap();
        let live = guild_id.roles(ctx.http()).await.unwrap_or_default();
        let mut created: Vec<String> = vec![];
        for n in 1..=9i64 {
            let name = perm_level_name(n);
            let key = n.to_string();
            let keep = map
                .get(&key)
                .and_then(|r| r.parse::<u64>().ok())
                .map(|r| live.contains_key(&serenity::RoleId::new(r)))
                .unwrap_or(false);
            if keep {
                continue;
            }
            let role = guild_id
                .create_role(ctx.http(), serenity::EditRole::new().name(&name))
                .await?;
            map.insert(key, role.id.get().to_string());
            created.push(name);
        }
        crate::db::tbl_set(pool, &gid, "UTILS.roles", &serde_json::to_string(&map)?).await?;
        Ok(if created.is_empty() {
            crate::lang::get(&code, "perm_roles_already_upate").unwrap_or_default()
        } else {
            crate::lang::get(&code, "perm_roles_created_role")
                .unwrap_or_default()
                .replace("${createdRoles.join(', ')}", &created.join(", "))
        })
    }
    .await;
    match outcome {
        Ok(msg) => {
            ctx.say(msg).await?;
        }
        Err(_) => {
            let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "perm_roles_error").unwrap_or_else(|| {
                    "An error occurred while creating or updating the roles.".to_string()
                }),
            )
            .await?;
        }
    }
    Ok(())
}

/// Point a perm level at a role.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "edit-roles",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_roles_edit(
    ctx: Ctx<'_>,
    // TS SlashCommands/guildconfig/perm/!edit-roles.ts registers "perm_level" / "perm_role".
    #[description = "Level 1-9"]
    #[rename = "perm_level"]
    level: i64,
    #[description = "Role"]
    #[rename = "perm_role"]
    role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    // Defer up front: lang + owner/level checks + row write run before
    // the first reply (perm.ts:409 `thinking: true`).
    ctx.defer().await?;
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if !is_guild_owner(ctx).await {
        ctx.say(
            crate::lang::get(&code, "perm_roles_not_owner").unwrap_or_else(|| {
                "Only the server owner can add permission level roles.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    if !(1..=9).contains(&level) {
        ctx.say(
            crate::lang::get(&code, "msg_level_must_be_1_9")
                .unwrap_or_else(|| "Level must be 1-9.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let mut map = load_perm_roles(pool, &gid).await;
    map.insert(level.to_string(), role.id.get().to_string());
    crate::db::tbl_set(
        pool,
        &gid,
        "UTILS.roles",
        &serde_json::to_string(&map).unwrap_or_default(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "perm_edit_roles_command_ok")
            .unwrap_or_default()
            .replace("${permName}", &perm_level_name(level))
            .replace("${strRole}", &format!("<@&{}>", role.id.get())),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn cmd_perm_row_dual_writes_table_and_legacy() {
        let pool = memory_pool().await;
        let key = perm_key("ban");
        let body = serde_json::json!({"users": [], "roles": [], "level": 3}).to_string();
        crate::db::tbl_set(&pool, "g1", &key, &body).await.unwrap();
        // Table-first read serves the row.
        assert_eq!(
            crate::db::tbl_get(&pool, "g1", &key).await.as_deref(),
            Some(body.as_str())
        );
        // Legacy flat row stays fresh for unmigrated kv readers.
        assert_eq!(
            crate::db::kv_get(&pool, "g1", &key).await.as_deref(),
            Some(body.as_str())
        );
        // Shared loader decodes the routed row.
        let loaded = load_cmd_perms(&pool, "g1", "ban").await.unwrap();
        assert_eq!(loaded.level, Some(3));
        // Delete clears both stores.
        crate::db::tbl_del(&pool, "g1", &key).await.unwrap();
        assert!(crate::db::tbl_get(&pool, "g1", &key).await.is_none());
        assert!(crate::db::kv_get(&pool, "g1", &key).await.is_none());
        assert!(load_cmd_perms(&pool, "g1", "ban").await.is_none());
    }

    #[tokio::test]
    async fn user_perm_level_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        let key = user_perm_key(7);
        crate::db::kv_set(&pool, "g1", &key, "4").await.unwrap();
        let level: i64 = crate::db::tbl_get(&pool, "g1", &key)
            .await
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(0);
        assert_eq!(level, 4);
    }

    #[tokio::test]
    async fn perm_roles_routed_read_covers_table_and_legacy() {
        let pool = memory_pool().await;
        let body = serde_json::json!({"1": "11"}).to_string();
        crate::db::tbl_set(&pool, "g1", "UTILS.roles", &body)
            .await
            .unwrap();
        assert_eq!(
            load_perm_roles(&pool, "g1")
                .await
                .get("1")
                .map(String::as_str),
            Some("11")
        );
        // Legacy-only row (pre-migration write) still loads.
        crate::db::kv_set(&pool, "g2", "UTILS.roles", &body)
            .await
            .unwrap();
        assert_eq!(
            load_perm_roles(&pool, "g2")
                .await
                .get("1")
                .map(String::as_str),
            Some("11")
        );
    }

    #[test]
    fn parse_user_perm_level_accepts_plain_and_json() {
        assert_eq!(parse_user_perm_level("4"), Some(4));
        assert_eq!(parse_user_perm_level(" 7 "), Some(7));
        assert_eq!(parse_user_perm_level("5"), Some(5));
        assert_eq!(parse_user_perm_level("\"6\""), Some(6));
        assert_eq!(parse_user_perm_level("nope"), None);
    }

    #[tokio::test]
    async fn user_perm_list_loads_dotted_rows() {
        let pool = memory_pool().await;
        crate::db::tbl_set(&pool, "g1", &user_perm_key(7), "4")
            .await
            .unwrap();
        crate::db::tbl_set(&pool, "g1", &user_perm_key(9), "2")
            .await
            .unwrap();
        assert_eq!(
            load_all_user_perms(&pool, "g1").await,
            vec![("7".to_string(), 4), ("9".to_string(), 2)]
        );
    }

    #[test]
    fn perm_command_action_values_are_ts_exact() {
        assert_eq!(PermCommandAction::Change.as_str(), "change");
        assert_eq!(PermCommandAction::Delete.as_str(), "delete");
        assert_eq!(PermCommandAction::DeleteAll.as_str(), "delete-all");
        assert_eq!(PermCommandAction::List.as_str(), "list");
    }
}

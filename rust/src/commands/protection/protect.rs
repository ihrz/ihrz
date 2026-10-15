use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

/// Rule values from authorization.ts (`rules` array order, minus the
/// `cls`/`all` pseudo-commands which are handled as special cases, never
/// stored). Order matters: `rule_display("all")` joins this array like TS
/// `allRules.join(",")`, so keep it in sync with authorization.ts.
pub const RULES: [&str; 13] = [
    "webhook",
    "updateguild",
    "createchannel",
    "updatechannel",
    "deletechannel",
    "createrole",
    "deleterole",
    "updaterole",
    "updatemember",
    "banmembers",
    "kickmember",
    "unbanmembers",
    "add_admin_roles",
];

pub fn valid_rule(rule: &str) -> bool {
    RULES.contains(&rule) || rule == "all" || rule == "cls"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleState {
    /// TS `{mode}` vocabulary (`allowlist` | `member` | `nobody`).
    /// Empty on legacy `{allow: bool}` rows (see `effective_mode`).
    #[serde(default)]
    pub mode: String,
    /// Legacy Rust-port shape, kept readable, never written anymore.
    #[serde(default, skip_serializing)]
    pub allow: Option<bool>,
}

impl RuleState {
    /// Effective TS mode. Only the stored `mode` string counts: the TS
    /// event guards compare `data.<rule>.mode === "allowlist"` /
    /// `=== "nobody"`, so legacy `{allow: bool}` rows (no `mode`) never
    /// sanction — they read as `member` (open) and the guard no-ops.
    pub fn effective_mode(&self) -> &str {
        if !self.mode.is_empty() {
            &self.mode
        } else {
            "member"
        }
    }
}

/// Rule mode vocabulary from authorization.ts (`!actions.ts` choices).
pub const MODES: [&str; 3] = ["allowlist", "member", "nobody"];

pub fn valid_mode(mode: &str) -> bool {
    MODES.contains(&mode.trim().to_ascii_lowercase().as_str())
}

/// Accept the TS mode values plus the previous on/off switch
/// (`on` -> `member`, `off` -> `nobody`). None on unknown input.
pub fn normalize_mode(raw: &str) -> Option<String> {
    match raw.trim().to_ascii_lowercase().as_str() {
        "allowlist" | "member" | "nobody" => Some(raw.trim().to_ascii_lowercase()),
        "on" | "allow" => Some("member".to_string()),
        "off" | "deny" => Some("nobody".to_string()),
        _ => None,
    }
}

/// Human label for a rule mode, mirroring the `!actions.ts` reply mapping.
pub fn mode_display(lang_code: &str, mode: &str) -> String {
    let (key, fallback) = match mode {
        "member" => ("authorization_actions_everyone", "everyone"),
        "allowlist" => ("authorization_actions_allowlist", "allowlist"),
        _ => ("authorization_actions_nobody", "nobody"),
    };
    crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string())
}

/// Sanction vocabulary from authorization.ts (`!sanction.ts` choices).
/// Mirrors `punish()` in src/core/functions/method.ts.
pub const SANCTIONS: [&str; 3] = ["simply", "simply+derank", "simply+ban"];

pub fn valid_sanction(sanction: &str) -> bool {
    SANCTIONS.contains(&sanction.trim())
}

/// Human label for a sanction, mirroring the `!sanction.ts` reply mapping.
pub fn sanction_display(lang_code: &str, sanction: &str) -> String {
    let (key, fallback) = match sanction.trim() {
        "simply" => ("authorization_sanction_simply", "simply"),
        "simply+derank" => ("authorization_sanction_simply_unrank", "simply+derank"),
        _ => ("authorization_sanction_simply_ban", "simply+ban"),
    };
    crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string())
}

/// Allow-mode choice. Mirrors the `allow` option `choices` in
/// authorization.ts:152-184 (`actions`): slash shows the localized
/// display names, the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum ProtectAllow {
    #[name = "allowlist"]
    #[name_localized("en-US", "Only the allowlist")]
    #[name_localized("en-GB", "Only the allowlist")]
    #[name_localized("fr", "Seulement la liste d'autorisation")]
    #[name_localized("ja", "only_the_allowlist")]
    #[name_localized("ru", "only_the_allowlist")]
    #[name_localized("es-ES", "only_the_allowlist")]
    Allowlist,
    #[name = "member"]
    #[name_localized("en-US", "All of member")]
    #[name_localized("en-GB", "All of member")]
    #[name_localized("fr", "Tous les membres")]
    #[name_localized("ja", "all_of_member")]
    #[name_localized("ru", "all_of_member")]
    #[name_localized("es-ES", "all_of_member")]
    Member,
    #[name = "nobody"]
    #[name_localized("en-US", "Nobody (except guild owner)")]
    #[name_localized("en-GB", "Nobody (except guild owner)")]
    #[name_localized("fr", "Personne (sauf le propriétaire du serveur)")]
    #[name_localized("ja", "nobody_except_guild_owner")]
    #[name_localized("ru", "nobody_except_guild_owner")]
    #[name_localized("es-ES", "nobody_except_guild_owner")]
    Nobody,
}

impl ProtectAllow {
    /// TS `value` (`allowlist` / `member` / `nobody`), fed into
    /// [`normalize_mode`] like the raw TS option.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Allowlist => "allowlist",
            Self::Member => "member",
            Self::Nobody => "nobody",
        }
    }
}

/// Sanction choice. Mirrors the `choose` option `choices` in
/// authorization.ts:217-251 (`sanction`): slash shows the localized
/// display names, the handler maps each variant back to the TS `value`
/// (French labels kept byte-exact, including the TS wording).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum ProtectSanction {
    #[name = "simply"]
    #[name_localized("en-US", "Simply Cancel Actions")]
    #[name_localized("en-GB", "Simply Cancel Actions")]
    #[name_localized("fr", "Simplemente annuler les actions")]
    #[name_localized("ja", "simply_cancel_actions")]
    #[name_localized("ru", "simply_cancel_actions")]
    #[name_localized("es-ES", "simply_cancel_actions")]
    Simply,
    #[name = "simply+derank"]
    #[name_localized("en-US", "Simply Cancel Actions + Derank")]
    #[name_localized("en-GB", "Simply Cancel Actions + Derank")]
    #[name_localized("fr", "Simplemente annuler les actions + déséléver")]
    #[name_localized("ja", "simply_cancel_actions_derank")]
    #[name_localized("ru", "simply_cancel_actions_derank")]
    #[name_localized("es-ES", "simply_cancel_actions_derank")]
    SimplyDerank,
    #[name = "simply+ban"]
    #[name_localized("en-US", "Simply Cancel Actions + Ban")]
    #[name_localized("en-GB", "Simply Cancel Actions + Ban")]
    #[name_localized("fr", "Simplemente annuler les actions + bannir")]
    #[name_localized("ja", "simply_cancel_actions_ban")]
    #[name_localized("ru", "simply_cancel_actions_ban")]
    #[name_localized("es-ES", "simply_cancel_actions_ban")]
    SimplyBan,
}

impl ProtectSanction {
    /// TS `value` (`simply` / `simply+derank` / `simply+ban`), stored
    /// verbatim in `PROTECTION.SANCTION` like `!sanction.ts`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Simply => "simply",
            Self::SimplyDerank => "simply+derank",
            Self::SimplyBan => "simply+ban",
        }
    }
}

/// Guild-owner gate. Mirrors the `interaction.user.id !== guild.ownerId`
/// checks in `!actions.ts:45`, `!show.ts:45`, `!sanction.ts:44`,
/// `allowlist/!add.ts:50` and `allowlist/!remove.ts:50` (all five are
/// owner-only in TS; the second add/remove guard is dead code since the
/// owner check above it always returns first).
pub fn is_guild_owner(author_id: u64, owner_id: u64) -> bool {
    author_id == owner_id
}

/// Resolve the guild owner id: cached guild first, partial-guild fetch
/// as fallback (covers uncached guilds in slash commands).
pub async fn guild_owner_id(ctx: &Ctx<'_>) -> Option<u64> {
    if let Some(g) = ctx.guild() {
        return Some(g.owner_id.get());
    }
    let gid = ctx.guild_id()?;
    gid.to_partial_guild(ctx.http())
        .await
        .ok()
        .map(|g| g.owner_id.get())
}

/// Deny unless the invoker owns the guild, replying with the TS lang key.
/// Returns true when the command must stop (denied or guild unknown).
/// The denial is an ephemeral interaction reply, mirroring the TS
/// `interaction.editReply` chain in `!actions.ts`/`!sanction.ts`/`!show.ts`
/// (poise degrades to a plain message on prefix invocations, where there
/// is no interaction reply chain).
pub async fn deny_unless_owner(ctx: &Ctx<'_>, key: &str, fallback: &str) -> bool {
    let author = ctx.author().id.get();
    let owner = guild_owner_id(ctx).await.unwrap_or(0);
    if is_guild_owner(author, owner) {
        return false;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string());
    let _ = ctx
        .send(poise::CreateReply::default().content(msg).ephemeral(true))
        .await;
    true
}

/// Display value for the `${rule.toUpperCase()}` slot of
/// `authorization_actions_rule_set`. TS `!actions.ts:77` replaces it with
/// `allRules.join(",")` for `rule == "all"` (raw values, comma-joined);
/// single rules render uppercased.
pub fn rule_display(rule: &str) -> String {
    if rule == "all" {
        RULES.join(",")
    } else {
        rule.to_uppercase()
    }
}

/// Rule rows for the show panel. Mirrors `!show.ts:79-84`: every
/// PROTECTION.* row except SANCTION as `**RULE** -> `mode`` lines.
pub fn protection_rules_text(rows: &[(String, String)]) -> String {
    let mut text = String::new();
    for (k, v) in rows {
        let Some(name) = k.strip_prefix("PROTECTION.") else {
            continue;
        };
        if name == "SANCTION" {
            continue;
        }
        let mode = serde_json::from_str::<RuleState>(v)
            .map(|r| r.effective_mode().to_string())
            .unwrap_or_else(|_| v.clone());
        text.push_str(&format!("**{}** -> `{mode}`\n", name.to_uppercase()));
    }
    text
}

/// Sanction label for the show panel. Mirrors `!show.ts:87-93`: three
/// plain `if`s with no default, so an unset or unknown SANCTION renders
/// an empty label (never a fallback).
pub fn show_sanction_label(lang_code: &str, sanction: Option<&str>) -> String {
    let (key, fallback) = match sanction.unwrap_or("").trim() {
        "simply+ban" => (
            "authorization_configshow_simply_ban",
            "Simply Cancel Action & Ban",
        ),
        "simply+derank" => (
            "authorization_configshow_simply_unrank",
            "Simply Cancel Action & Unrank",
        ),
        "simply" => ("authorization_configshow_simply", "Simply Cancel Action"),
        _ => return String::new(),
    };
    crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string())
}

/// True when the allowlist key rows contain the user. Rows look like
/// `ALLOWLIST.list.<uid>`. Exact-match on purpose (audit P14 kept):
/// TS `allowlist/!show.ts` gates with `!text.includes(user.id)`, where
/// id "12" substring-matches "<@123>"; the exact key comparison here
/// is the intended hardening, not a divergence.
pub fn allowlist_contains(rows: &[String], user_id: u64) -> bool {
    rows.iter()
        .any(|k| k == &format!("ALLOWLIST.list.{user_id}"))
}

/// Mention list for the allowlist panels. Mirrors `!show.ts:61-63` and
/// `allowlist/!show.ts:61-63` (`<@uid>` per line).
pub fn allowlist_mentions(rows: &[String]) -> String {
    let mut ids: Vec<&str> = rows
        .iter()
        .filter_map(|k| k.strip_prefix("ALLOWLIST.list."))
        .collect();
    ids.sort();
    ids.iter().map(|id| format!("<@{id}>\n")).collect()
}

/// Run-less group root for the protection category.
// TS: `SlashCommands/protection/` (`authorization.ts`, `allowlist/`).
// Subcommand basis: `actions`/`sanction`/`show` mirror
// `authorization.ts` (3 flat Subcommands); `allow-add`/`allow-remove`/
// `allow-show` mirror `allowlist/allowlist.ts` (add/remove/show under
// the separate TS `allowlist` command), merged under this parent with
// the `allow-` prefix because `commands/mod.rs` (frozen) pins their
// names and option shapes (`allow-add`/`allow-remove` + `member`).
// Splitting them back under a top-level `/allowlist` needs a
// `commands/mod.rs::all()` edit, owned outside this file.
// Gate parity (deliberate, do not loosen): TS gates
// per-leg through the custom executor (`commandExecutor.ts` checks each
// option target's `permission`: Administrator on the mutating
// `authorization` legs, `null` elsewhere) plus an in-code `ownerId`
// check in `!show.ts:45`. The Rust side enforces server-owner-only in
// code on every mutating leaf (`deny_unless_owner`) with an
// `ADMINISTRATOR` Discord-layer default on `sanction`/`show` — strictly
// narrower than TS on the allowlist legs, which is the safe direction.
// A bare invocation raises SubcommandRequired (mapped to help in
// `bot.rs`) before this body runs, on both paths.
// Verdict (prefix extension, kept): TS protection is slash-only
// (`ApplicationCommandType.ChatInput`, no prefix path), while every leaf
// below also registers `prefix_command`. The extension is safe on
// purpose: the in-code `deny_unless_owner` gates cover both entry paths,
// so prefix adds reach, never privilege.
#[poise::command(
    slash_command,
    prefix_command,
    category = "protection",
    rename = "protect",
    subcommands("protect_actions", "protect_sanction", "protect_show"),
    subcommand_required,
    description_localized("fr", "Commande sous-groupé pour la catégorie de protection"),
    description_localized("ja", "保護カテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории защиты!"),
    description_localized("es-ES", "Subcomando para la categoría de protección!")
)]
pub async fn protect(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Rule choice. Mirrors the `rule` option `choices` in
/// authorization.ts:131-136 (static `rules` array: slash shows the
/// placeholder, the handler receives the `value`). All locales share
/// the placeholder as the display name, exactly like TS
/// (`name_localizations` = placeholder everywhere).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum ProtectRule {
    #[name = "cls"]
    #[name_localized("en-US", "Delete All Settings")]
    #[name_localized("en-GB", "Delete All Settings")]
    #[name_localized("fr", "Delete All Settings")]
    #[name_localized("ja", "Delete All Settings")]
    #[name_localized("ru", "Delete All Settings")]
    #[name_localized("es-ES", "Delete All Settings")]
    Cls,
    #[name = "all"]
    #[name_localized("en-US", "Select All Rules")]
    #[name_localized("en-GB", "Select All Rules")]
    #[name_localized("fr", "Select All Rules")]
    #[name_localized("ja", "Select All Rules")]
    #[name_localized("ru", "Select All Rules")]
    #[name_localized("es-ES", "Select All Rules")]
    All,
    #[name = "webhook"]
    #[name_localized("en-US", "Create Webhook")]
    #[name_localized("en-GB", "Create Webhook")]
    #[name_localized("fr", "Create Webhook")]
    #[name_localized("ja", "Create Webhook")]
    #[name_localized("ru", "Create Webhook")]
    #[name_localized("es-ES", "Create Webhook")]
    Webhook,
    #[name = "updateguild"]
    #[name_localized("en-US", "Edit Guild")]
    #[name_localized("en-GB", "Edit Guild")]
    #[name_localized("fr", "Edit Guild")]
    #[name_localized("ja", "Edit Guild")]
    #[name_localized("ru", "Edit Guild")]
    #[name_localized("es-ES", "Edit Guild")]
    UpdateGuild,
    #[name = "createchannel"]
    #[name_localized("en-US", "Create Channel")]
    #[name_localized("en-GB", "Create Channel")]
    #[name_localized("fr", "Create Channel")]
    #[name_localized("ja", "Create Channel")]
    #[name_localized("ru", "Create Channel")]
    #[name_localized("es-ES", "Create Channel")]
    CreateChannel,
    #[name = "updatechannel"]
    #[name_localized("en-US", "Update Channel")]
    #[name_localized("en-GB", "Update Channel")]
    #[name_localized("fr", "Update Channel")]
    #[name_localized("ja", "Update Channel")]
    #[name_localized("ru", "Update Channel")]
    #[name_localized("es-ES", "Update Channel")]
    UpdateChannel,
    #[name = "deletechannel"]
    #[name_localized("en-US", "Delete Channel")]
    #[name_localized("en-GB", "Delete Channel")]
    #[name_localized("fr", "Delete Channel")]
    #[name_localized("ja", "Delete Channel")]
    #[name_localized("ru", "Delete Channel")]
    #[name_localized("es-ES", "Delete Channel")]
    DeleteChannel,
    #[name = "createrole"]
    #[name_localized("en-US", "Create Role")]
    #[name_localized("en-GB", "Create Role")]
    #[name_localized("fr", "Create Role")]
    #[name_localized("ja", "Create Role")]
    #[name_localized("ru", "Create Role")]
    #[name_localized("es-ES", "Create Role")]
    CreateRole,
    #[name = "deleterole"]
    #[name_localized("en-US", "Delete Role")]
    #[name_localized("en-GB", "Delete Role")]
    #[name_localized("fr", "Delete Role")]
    #[name_localized("ja", "Delete Role")]
    #[name_localized("ru", "Delete Role")]
    #[name_localized("es-ES", "Delete Role")]
    DeleteRole,
    #[name = "updaterole"]
    #[name_localized("en-US", "Update Role")]
    #[name_localized("en-GB", "Update Role")]
    #[name_localized("fr", "Update Role")]
    #[name_localized("ja", "Update Role")]
    #[name_localized("ru", "Update Role")]
    #[name_localized("es-ES", "Update Role")]
    UpdateRole,
    #[name = "updatemember"]
    #[name_localized("en-US", "Add/Remove Member Role(s)")]
    #[name_localized("en-GB", "Add/Remove Member Role(s)")]
    #[name_localized("fr", "Add/Remove Member Role(s)")]
    #[name_localized("ja", "Add/Remove Member Role(s)")]
    #[name_localized("ru", "Add/Remove Member Role(s)")]
    #[name_localized("es-ES", "Add/Remove Member Role(s)")]
    UpdateMember,
    #[name = "banmembers"]
    #[name_localized("en-US", "Ban Members")]
    #[name_localized("en-GB", "Ban Members")]
    #[name_localized("fr", "Ban Members")]
    #[name_localized("ja", "Ban Members")]
    #[name_localized("ru", "Ban Members")]
    #[name_localized("es-ES", "Ban Members")]
    BanMembers,
    #[name = "kickmember"]
    #[name_localized("en-US", "Kick Members")]
    #[name_localized("en-GB", "Kick Members")]
    #[name_localized("fr", "Kick Members")]
    #[name_localized("ja", "Kick Members")]
    #[name_localized("ru", "Kick Members")]
    #[name_localized("es-ES", "Kick Members")]
    KickMember,
    #[name = "unbanmembers"]
    #[name_localized("en-US", "Unban Members")]
    #[name_localized("en-GB", "Unban Members")]
    #[name_localized("fr", "Unban Members")]
    #[name_localized("ja", "Unban Members")]
    #[name_localized("ru", "Unban Members")]
    #[name_localized("es-ES", "Unban Members")]
    UnbanMembers,
    #[name = "add_admin_roles"]
    #[name_localized("en-US", "Add admin role")]
    #[name_localized("en-GB", "Add admin role")]
    #[name_localized("fr", "Add admin role")]
    #[name_localized("ja", "Add admin role")]
    #[name_localized("ru", "Add admin role")]
    #[name_localized("es-ES", "Add admin role")]
    AddAdminRoles,
}

impl ProtectRule {
    /// TS `value` (`cls` / `all` / `webhook` / …), fed into the
    /// existing `valid_rule` gate like the raw TS option.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Cls => "cls",
            Self::All => "all",
            Self::Webhook => "webhook",
            Self::UpdateGuild => "updateguild",
            Self::CreateChannel => "createchannel",
            Self::UpdateChannel => "updatechannel",
            Self::DeleteChannel => "deletechannel",
            Self::CreateRole => "createrole",
            Self::DeleteRole => "deleterole",
            Self::UpdateRole => "updaterole",
            Self::UpdateMember => "updatemember",
            Self::BanMembers => "banmembers",
            Self::KickMember => "kickmember",
            Self::UnbanMembers => "unbanmembers",
            Self::AddAdminRoles => "add_admin_roles",
        }
    }
}

/// Choose an actions to Deny/Allow for the user!
// TS name is `actions` (authorization.ts:106); `rule` is its option.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "actions",
    description_localized("fr", "Choisissez une action à refuser/autoriser pour l'utilisateur"),
    description_localized("ja", "ユーザーに対して拒否/許可するアクションを選択！"),
    description_localized("ru", "Выберите действия для запрета/разрешения пользователю!"),
    description_localized("es-ES", "Elegir acciones para Denegar/Permitir al usuario!")
)]
pub async fn protect_actions(
    ctx: Ctx<'_>,
    // Static `rules` array in authorization.ts (placeholder labels in
    // every locale) — a value-first `ProtectRule` choice, like `allow`.
    #[description = "Whats is the rule to configure?"]
    #[description_localized("fr", "Quelle est la règle à configurer ?")]
    #[description_localized("ja", "設定するルールは？")]
    #[description_localized("ru", "Какое правило настроить?")]
    #[description_localized("es-ES", "Cual es la regla a configurar?")]
    rule: ProtectRule,
    #[description_localized("fr", "Les règles sont contournables pour qui ?")]
    #[description_localized("ja", "ルールをバイパスできるのは誰？")]
    #[description_localized("ru", "Для кого правила обходятся?")]
    #[description_localized("es-ES", "Las reglas son evitables para quién?")]
    #[description = "The rule are bypassable for who?"]
    allow: Option<ProtectAllow>,
) -> Result<(), anyhow::Error> {
    if deny_unless_owner(
        &ctx,
        "authorization_actions_not_permited",
        "Only the Owner of the server can edit the authorization rule about the protection module!",
    )
    .await
    {
        return Ok(());
    }
    let rule = rule.as_str().trim().to_ascii_lowercase();
    if !valid_rule(&rule) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(crate::lang::get(&code, "msg_bad_rule").unwrap_or_else(|| "Bad rule.".to_string()))
            .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS `allow` is optional (`required: false` in authorization.ts) and
    // `cls` never needs it: only the set legs require a mode, otherwise
    // the TS fallthrough replies `close_error_command`.
    if rule == "cls" {
        // Table-routed clear: legacy prefix rows plus the guild-table subtree.
        crate::commands::owner::main::legacy_del_prefix(&ctx.data().pool, &gid, "PROTECTION.")
            .await?;
        let _ = crate::commands::owner::main::tbl_del(&ctx.data().pool, &gid, "PROTECTION").await;
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
        ctx.say(crate::lang::get(&code, "authorization_actions_rule_clear")
                .map(|s| {
                    s.replace(
                        "${interaction.user}",
                        &format!("<@{}>", ctx.author().id.get()),
                    )
                    .replace("${interaction.guild.name}", &guild_name)
                })
                .unwrap_or_else(|| "${interaction.user}, all of the rules for `${interaction.guild.name}` have been deleted. Protection module is now disabled!".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Set legs (`all` / single rule) require a mode; without `allow` the
    // TS fallthrough replies `close_error_command`. Verdict (strict on
    // purpose): TS `!actions.ts` stores any truthy `allow` string verbatim
    // as `{mode}`, while the guards only ever match `allowlist`/`nobody`
    // — so a junk mode never sanctions there either. Rejecting it here
    // keeps the same no-sanction outcome without persisting junk rows.
    let Some(mode) = allow.map(ProtectAllow::as_str).and_then(normalize_mode) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "close_error_command")
                .unwrap_or_else(|| "An error occurred, please try again!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let targets: Vec<String> = if rule == "all" {
        RULES.iter().map(|r| r.to_string()).collect()
    } else {
        vec![rule.clone()]
    };
    for r in targets {
        crate::commands::owner::main::routed_set(
            &ctx.data().pool,
            &gid,
            &gid,
            &format!("PROTECTION.{r}"),
            &serde_json::to_string(&RuleState {
                mode: mode.clone(),
                allow: None,
            })?,
        )
        .await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "authorization_actions_rule_set")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
                .replace("${rule.toUpperCase()}", &rule_display(&rule))
                .replace("${allow}", &mode_display(&code, &mode))
            })
            .unwrap_or_else(|| format!("Rule {rule} set.")),
    )
    .await?;
    Ok(())
}

/// Choose the sanction to applied for the flagged user!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "sanction",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Choisissez la sanction à appliquer pour l'utilisateur signalé?"),
    description_localized("ja", "フラグされたユーザーに適用する制裁を選択！"),
    description_localized("ru", "Выберите санкцию для отмеченного пользователя!"),
    description_localized("es-ES", "Elegir la sanción a aplicar para el usuario marcado!")
)]
pub async fn protect_sanction(
    ctx: Ctx<'_>,
    // TS SlashCommands/protection/!sanction.ts reads getString("choose").
    #[description_localized("fr", "Quelle est donc la sanction ?")]
    #[description_localized("ja", "どの制裁ですか？")]
    #[description_localized("ru", "Какая санкция?")]
    #[description_localized("es-ES", "Cual es la sanción entonces?")]
    #[description = "Whats is the sanction then?"]
    #[rename = "choose"]
    sanction: ProtectSanction,
) -> Result<(), anyhow::Error> {
    if deny_unless_owner(
        &ctx,
        "authorization_sanction_not_permited",
        "Only the owner of the server can edit the authorization rule about the protection module!",
    )
    .await
    {
        return Ok(());
    }
    let sanction = sanction.as_str().to_string();
    if !valid_sanction(&sanction) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(crate::lang::get(&code, "msg_bad_rule").unwrap_or_else(|| "Bad rule.".to_string()))
            .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "PROTECTION.SANCTION",
        &sanction,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(crate::lang::get(&code, "authorization_sanction_command_work")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
                .replace("${choose}", &sanction_display(&code, &sanction))
            })
            .unwrap_or_else(|| "${interaction.user}, rule sanction has been set. When the user breaks the rule, it's **${choose}**, and the bot cancels its action.".to_string()),
    )
    .await?;
    Ok(())
}

/// Strip a member of all removable roles. Mirrors `derank()` in
/// src/core/functions/method.ts: a managed app-role keeps its slot
/// with ViewChannel-only permissions; every other role below the
/// bot's highest role (minus @everyone) is removed, per-role
/// failures ignored like the TS `.catch(() => {})`.
pub async fn derank_member(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
    reason: &str,
) -> anyhow::Result<()> {
    let roles = guild_id.roles(http).await?;
    // Fail-closed on unknown bot top role (audit P4): TS reads
    // `me.roles.highest.position`, which throws when the bot member is
    // unresolvable (nothing is removed then). Mirrored here by removing
    // nothing instead of falling back to u16::MAX (fail-open, which
    // would strip every role).
    let bot_id = http.get_current_user().await.map(|u| u.id).ok();
    let Some(bot_id) = bot_id else {
        return Ok(());
    };
    let Ok(bot_member) = guild_id.member(http, bot_id).await else {
        return Ok(());
    };
    // A role-less bot sits at @everyone (position 0) like the TS
    // `highest` fallback; only a truly unknown member (above) aborts.
    let bot_top: u16 = roles
        .values()
        .filter(|r| bot_member.roles.contains(&r.id))
        .map(|r| r.position)
        .max()
        .unwrap_or(0);
    let Ok(member) = guild_id.member(http, user_id).await else {
        return Ok(());
    };
    // Victim's own managed (integration/bot) role only — mirrors TS
    // `user_roles.find((x) => x.managed)`. Never the guild-first managed
    // role: that would strip permissions from an unrelated integration.
    if let Some(app_id) = member
        .roles
        .iter()
        .find(|id| roles.get(id).is_some_and(|r| r.managed))
    {
        let _ = guild_id
            .edit_role(
                http,
                *app_id,
                serenity::EditRole::new()
                    .permissions(serenity::Permissions::VIEW_CHANNEL)
                    .audit_log_reason(reason),
            )
            .await;
    }
    // Audit reason mirrors the TS derank `remove(role.id, reason ||
    // "Protection")` call; Member::remove_role carries no reason, so the
    // HTTP call is made directly.
    let audit_reason = if reason.trim().is_empty() {
        "Protection"
    } else {
        reason
    };
    let everyone = serenity::RoleId::new(guild_id.get());
    for role_id in &member.roles {
        if *role_id == everyone {
            continue;
        }
        let Some(role) = roles.get(role_id) else {
            continue;
        };
        if role.managed || role.position >= bot_top {
            continue;
        }
        let _ = http
            .remove_member_role(guild_id, member.user.id, *role_id, Some(audit_reason))
            .await;
    }
    Ok(())
}

/// Apply a PROTECTION.SANCTION value. Mirrors `punish()` in
/// src/core/functions/method.ts: `simply` only cancels the action
/// (done by the caller's restore leg), `simply+derank` deranks,
/// `simply+ban` bans with a derank fallback when the ban fails.
/// Unknown values no-op like the TS `default` branch.
/// Audit reasons mirror TS exactly (audit P5/P6): the derank legs log
/// "Protection" (`remove(role.id, reason || "Protection")` with the
/// avoid*.ts flows passing no reason); the ban leg logs
/// `reason || "Protect!"`.
pub async fn apply_sanction(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
    sanction: &str,
    reason: &str,
) {
    match sanction.trim() {
        "simply+derank" => {
            let _ = derank_member(http, guild_id, user_id, "Protection").await;
        }
        "simply+ban" => {
            let ban_reason = if reason.trim().is_empty() {
                "Protect!"
            } else {
                reason
            };
            if guild_id
                .ban_with_reason(http, user_id, 0, ban_reason)
                .await
                .is_err()
            {
                let _ = derank_member(http, guild_id, user_id, "Protection").await;
            }
        }
        _ => {}
    }
}

/// All PROTECTION.* rows: guild-table subtree first, legacy kv rows
/// filling gaps (table wins). Mirrors the sticky load_all_stickies
/// union scan; keys unchanged.
pub async fn load_protection_rows(pool: &crate::db::Pool, gid: &str) -> Vec<(String, String)> {
    use crate::commands::owner::main as routed;
    let mut map = std::collections::HashMap::new();
    if let Some(root) = routed::tbl_get_value(pool, gid, "PROTECTION").await {
        if let Some(obj) = root.as_object() {
            for (k, v) in obj {
                let val = match v {
                    serde_json::Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
                map.insert(format!("PROTECTION.{k}"), val);
            }
        }
    }
    for (k, v) in routed::legacy_scan(pool, gid, "PROTECTION.").await {
        map.entry(k).or_insert(v);
    }
    let mut rows: Vec<(String, String)> = map.into_iter().collect();
    rows.sort_by(|a, b| a.0.cmp(&b.0));
    rows
}

/// All ALLOWLIST.list.* key names: guild-table subtree first, legacy
/// kv rows filling gaps. Mirrors the ticket TICKET_ALL prefix scan.
/// Verdict (kept, nested on purpose): the `ALLOWLIST.list.<uid>` nesting
/// mirrors the TS `${gid}.ALLOWLIST.list.${uid}` rows verbatim — keep it
/// nested and deliberate, never flattened to a bare uid set.
pub async fn load_allowlist(pool: &crate::db::Pool, gid: &str) -> Vec<String> {
    use crate::commands::owner::main as routed;
    let mut ids = std::collections::HashSet::new();
    if let Some(root) = routed::tbl_get_value(pool, gid, "ALLOWLIST").await {
        if let Some(list) = routed::walk_path(&root, &["list"]).and_then(|v| v.as_object()) {
            for k in list.keys() {
                ids.insert(format!("ALLOWLIST.list.{k}"));
            }
        }
    }
    for (k, _) in routed::legacy_scan(pool, gid, "ALLOWLIST.list.").await {
        ids.insert(k);
    }
    let mut rows: Vec<String> = ids.into_iter().collect();
    rows.sort();
    rows
}

/// Show the current configuration about protection authorization/rule & allow list!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Afficher la configuration des autorisations/règles de protection pour la liste d'autorisation"),
    description_localized("ja", "保護認証/ルールと許可リストの現在の設定を表示！"),
    description_localized("ru", "Показать текущую конфигурацию авторизации/правил и белого списка!"),
    description_localized("es-ES", "Mostrar la configuración actual sobre autorización/reglas de protección y lista de permitidos!"),
)]
pub async fn protect_show(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if deny_unless_owner(
        &ctx,
        "authorization_configshow_not_permited",
        "Only the owner of the server can edit the authorization rule about the protection module!",
    )
    .await
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let rows = load_protection_rows(&ctx.data().pool, &gid).await;
    let allow = load_allowlist(&ctx.data().pool, &gid).await;
    // TS !show.ts:63-73 guards on the raw stores (`Object.keys(list).length
    // === 0 || Object.keys(protection).length === 0`): a SANCTION-only row
    // still counts as "something set up", so it renders a
    // punishment-line-only first embed. Never gate on the filtered
    // `protection_rules_text` (which skips SANCTION) — that would wrongly
    // answer `not_anything_setup` where TS shows the punishment line.
    if rows.is_empty() || allow.is_empty() {
        let msg = crate::lang::get(&code, "authorization_configshow_not_anything_setup")
            .unwrap_or_else(|| {
                "You have not set up anything in the Protection Module!".to_string()
            });
        ctx.say(msg).await?;
        return Ok(());
    }
    let mut rules_text = protection_rules_text(&rows);
    let sanction = rows
        .iter()
        .find(|(k, _)| k == "PROTECTION.SANCTION")
        .map(|(_, v)| v.trim().trim_matches('"').to_string());
    let okay = show_sanction_label(&code, sanction.as_deref());
    let punish = crate::lang::get(&code, "authorization_configshow_punishement")
        .map(|s| s.replace("${okay}", &okay))
        .unwrap_or_else(|| format!("```Punishment: {okay}```"));
    rules_text.push_str(&punish);
    let author1 = crate::lang::get(&code, "authorization_configshow_embed1_author")
        .unwrap_or_else(|| "Rule List".to_string());
    let author2 = crate::lang::get(&code, "authorization_configshow_embed2_author")
        .unwrap_or_else(|| "Allowlist".to_string());
    let embed1 = serenity::CreateEmbed::default()
        .colour(0x010101)
        .author(serenity::CreateEmbedAuthor::new(author1))
        .description(rules_text)
        .timestamp(serenity::Timestamp::now());
    let embed2 = serenity::CreateEmbed::default()
        .colour(0x010101)
        .author(serenity::CreateEmbedAuthor::new(author2))
        .description(allowlist_mentions(&allow))
        .timestamp(serenity::Timestamp::now());
    // Shared footer + icon attachment, mirroring `footerBuilder` /
    // `footerAttachmentBuilder` (+ `setTimestamp`) in `!show.ts:99-128`
    // (same `send_blinfo_embed` pattern as `owner/main.rs`).
    let (footer_name, footer_bytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let with_icon = footer_bytes.is_some();
    let embed1 = crate::commands::shared::embed_with_footer(embed1, &footer_name, with_icon);
    let embed2 = crate::commands::shared::embed_with_footer(embed2, &footer_name, with_icon);
    let mut reply = poise::CreateReply::default();
    reply.embeds.push(embed1);
    reply.embeds.push(embed2);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use poise::ChoiceParameter as _;

    #[test]
    fn protect_allow_choices_mirror_ts_names_values_and_locales() {
        let names: Vec<_> = ProtectAllow::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["allowlist", "member", "nobody"]);
        assert_eq!(ProtectAllow::Allowlist.as_str(), "allowlist");
        assert_eq!(ProtectAllow::Member.as_str(), "member");
        assert_eq!(ProtectAllow::Nobody.as_str(), "nobody");
        assert_eq!(
            ProtectAllow::from_name("allowlist"),
            Some(ProtectAllow::Allowlist)
        );
        assert_eq!(
            ProtectAllow::from_name("member"),
            Some(ProtectAllow::Member)
        );
        assert_eq!(ProtectAllow::from_name("bogus"), None);
        assert_eq!(ProtectAllow::from_index(2), Some(ProtectAllow::Nobody));
        let list = ProtectAllow::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Seulement la liste d'autorisation")
        );
        assert_eq!(
            list[2].localizations.get("fr").map(String::as_str),
            Some("Personne (sauf le propriétaire du serveur)")
        );
        // Choice values stay inside the mode vocabulary + normalizer.
        for m in [
            ProtectAllow::Allowlist,
            ProtectAllow::Member,
            ProtectAllow::Nobody,
        ] {
            assert!(valid_mode(m.as_str()));
            assert_eq!(normalize_mode(m.as_str()).as_deref(), Some(m.as_str()));
        }
    }

    #[test]
    fn protect_sanction_choices_mirror_ts_names_values_and_locales() {
        let names: Vec<_> = ProtectSanction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["simply", "simply+derank", "simply+ban"]);
        assert_eq!(ProtectSanction::Simply.as_str(), "simply");
        assert_eq!(ProtectSanction::SimplyDerank.as_str(), "simply+derank");
        assert_eq!(ProtectSanction::SimplyBan.as_str(), "simply+ban");
        assert_eq!(
            ProtectSanction::from_name("simply"),
            Some(ProtectSanction::Simply)
        );
        assert_eq!(
            ProtectSanction::from_name("SIMPLY+DERANK"),
            Some(ProtectSanction::SimplyDerank)
        );
        assert_eq!(ProtectSanction::from_name("bogus"), None);
        assert_eq!(
            ProtectSanction::from_index(2),
            Some(ProtectSanction::SimplyBan)
        );
        let list = ProtectSanction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Simplemente annuler les actions")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Simplemente annuler les actions + déséléver")
        );
        assert_eq!(
            list[2].localizations.get("fr").map(String::as_str),
            Some("Simplemente annuler les actions + bannir")
        );
        // Choice values stay inside the stored sanction vocabulary.
        for s in [
            ProtectSanction::Simply,
            ProtectSanction::SimplyDerank,
            ProtectSanction::SimplyBan,
        ] {
            assert!(valid_sanction(s.as_str()));
        }
    }

    #[test]
    fn mode_vocab_matches_ts_actions() {
        assert_eq!(MODES.len(), 3);
        assert!(valid_mode("allowlist") && valid_mode("member") && valid_mode("nobody"));
        assert!(!valid_mode("bogus"));
        assert_eq!(normalize_mode("allowlist").as_deref(), Some("allowlist"));
        assert_eq!(normalize_mode("member").as_deref(), Some("member"));
        assert_eq!(normalize_mode("nobody").as_deref(), Some("nobody"));
        assert_eq!(normalize_mode("on").as_deref(), Some("member"));
        assert_eq!(normalize_mode("off").as_deref(), Some("nobody"));
        assert!(normalize_mode("ban").is_none());
    }

    #[test]
    fn legacy_allow_rows_stay_readable() {
        // Legacy `{allow: bool}` rows carry no TS `mode`, so the event
        // gate (`=== "allowlist"` / `=== "nobody"`) never fires: both
        // read as `member` (open, no sanction).
        let open: RuleState = serde_json::from_str(r#"{"allow":true}"#).unwrap();
        assert_eq!(open.effective_mode(), "member");
        let deny: RuleState = serde_json::from_str(r#"{"allow":false}"#).unwrap();
        assert_eq!(deny.effective_mode(), "member");
        let mode: RuleState = serde_json::from_str(r#"{"mode":"allowlist"}"#).unwrap();
        assert_eq!(mode.effective_mode(), "allowlist");
        let stored = serde_json::to_string(&RuleState {
            mode: "nobody".to_string(),
            allow: None,
        })
        .unwrap();
        assert_eq!(stored, r#"{"mode":"nobody"}"#);
    }

    #[test]
    fn sanction_vocab_matches_ts_punish() {
        assert_eq!(SANCTIONS.len(), 3);
        assert!(valid_sanction("simply"));
        assert!(valid_sanction("simply+derank"));
        assert!(valid_sanction("simply+ban"));
        assert!(!valid_sanction("ban"));
        assert!(!valid_sanction("kick"));
        assert!(!valid_sanction("timeout"));
    }

    #[test]
    fn show_sanction_label_empty_without_known_value() {
        // `!show.ts:87-93` has three plain `if`s and no default: unset or
        // unknown SANCTION renders empty, never a fallback label.
        assert_eq!(show_sanction_label("en-US", None), "");
        assert_eq!(show_sanction_label("en-US", Some("bogus")), "");
        assert!(!show_sanction_label("en-US", Some("simply")).is_empty());
        assert!(!show_sanction_label("en-US", Some("simply+ban")).is_empty());
        assert!(!show_sanction_label("en-US", Some("simply+derank")).is_empty());
    }

    #[test]
    fn owner_gate_matches_ts_checks() {
        assert!(is_guild_owner(7, 7));
        assert!(!is_guild_owner(7, 8));
    }

    #[test]
    fn rule_all_reply_joins_every_rule() {
        let all = rule_display("all");
        for r in RULES {
            assert!(all.contains(r), "missing {r} in {all}");
        }
        assert!(!all.contains("cls"));
        assert_eq!(rule_display("webhook"), "WEBHOOK");
    }

    #[test]
    fn protect_rule_choice_values_match_ts_rules() {
        // Every TS `rules` value (authorization.ts) has a choice
        // variant, and every variant passes the `valid_rule` gate.
        let all = [
            ProtectRule::Cls,
            ProtectRule::All,
            ProtectRule::Webhook,
            ProtectRule::UpdateGuild,
            ProtectRule::CreateChannel,
            ProtectRule::UpdateChannel,
            ProtectRule::DeleteChannel,
            ProtectRule::CreateRole,
            ProtectRule::DeleteRole,
            ProtectRule::UpdateRole,
            ProtectRule::UpdateMember,
            ProtectRule::BanMembers,
            ProtectRule::KickMember,
            ProtectRule::UnbanMembers,
            ProtectRule::AddAdminRoles,
        ];
        assert_eq!(all.len(), 15);
        for v in all {
            assert!(valid_rule(v.as_str()), "choice {} rejected", v.as_str());
        }
        for r in RULES {
            assert!(all.iter().any(|v| v.as_str() == r), "missing {r}");
        }
    }

    #[test]
    fn show_panel_text_matches_ts_show() {
        let rows = vec![
            (
                "PROTECTION.webhook".to_string(),
                r#"{"mode":"allowlist"}"#.to_string(),
            ),
            ("PROTECTION.SANCTION".to_string(), "simply".to_string()),
        ];
        let text = protection_rules_text(&rows);
        assert!(text.contains("**WEBHOOK** -> `allowlist`"));
        assert!(!text.contains("SANCTION"));
        // Legacy rows render through the effective mode (open, no sanction).
        let legacy = vec![(
            "PROTECTION.banmembers".to_string(),
            r#"{"allow":false}"#.to_string(),
        )];
        assert!(protection_rules_text(&legacy).contains("**BANMEMBERS** -> `member`"));
        assert!(protection_rules_text(&[]).is_empty());
    }

    #[test]
    fn allowlist_helpers_match_ts_guards() {
        let rows = vec![
            "ALLOWLIST.list.7".to_string(),
            "ALLOWLIST.list.9".to_string(),
        ];
        assert!(allowlist_contains(&rows, 7));
        assert!(!allowlist_contains(&rows, 8));
        assert!(!allowlist_contains(&[], 7));
        let mentions = allowlist_mentions(&rows);
        assert!(mentions.contains("<@7>"));
        assert!(mentions.contains("<@9>"));
    }

    #[test]
    fn rule_state_serializes_ts_shape_without_allow() {
        // Writes must stay `{"mode":"..."}` like TS `{ mode: allow }`:
        // the legacy `allow` field is read-only (`skip_serializing`), so a
        // fresh write never stores a JSON bool alongside the mode.
        let s = serde_json::to_string(&RuleState {
            mode: "allowlist".to_string(),
            allow: None,
        })
        .unwrap();
        assert_eq!(s, r#"{"mode":"allowlist"}"#);
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert!(v.get("allow").is_none());
        assert!(v.get("mode").and_then(|m| m.as_str()) == Some("allowlist"));
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        use crate::commands::owner::main as routed;
        let pool = memory_pool().await;
        // Routed write dual-writes: table handle primary, legacy kv mirror.
        routed::routed_set(&pool, "g", "g", "PROTECTION.webhook", r#"{"allow":true}"#)
            .await
            .unwrap();
        assert_eq!(
            routed::routed_get(&pool, "g", "g", "PROTECTION.webhook")
                .await
                .as_deref(),
            Some(r#"{"allow":true}"#)
        );
        // Legacy-only row still reads (and promotes into the table).
        crate::db::kv_set(&pool, "g", "PROTECTION.banmembers", r#"{"allow":false}"#)
            .await
            .unwrap();
        let rows = load_protection_rows(&pool, "g").await;
        assert_eq!(rows.len(), 2);
        assert!(rows.iter().any(|(k, _)| k == "PROTECTION.webhook"));
        assert!(rows.iter().any(|(k, _)| k == "PROTECTION.banmembers"));
        // Table wins over a stale legacy row for the same key.
        crate::db::kv_set(&pool, "g", "PROTECTION.webhook", r#"{"allow":false}"#)
            .await
            .unwrap();
        let rows = load_protection_rows(&pool, "g").await;
        let webhook = rows
            .iter()
            .find(|(k, _)| k == "PROTECTION.webhook")
            .map(|(_, v)| v.clone())
            .unwrap();
        assert_eq!(webhook, r#"{"allow":true}"#);
        // Allowlist union scan merges both stores.
        routed::routed_set(&pool, "g", "g", "ALLOWLIST.list.7", r#"{"allowed":true}"#)
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "ALLOWLIST.list.9", r#"{"allowed":true}"#)
            .await
            .unwrap();
        let allow = load_allowlist(&pool, "g").await;
        assert!(allow.contains(&"ALLOWLIST.list.7".to_string()));
        assert!(allow.contains(&"ALLOWLIST.list.9".to_string()));
    }
    #[test]
    fn protect_sanction_registers_description_localizations() {
        let cmd = super::protect_sanction();
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Choisissez la sanction à appliquer pour l'utilisateur signalé?")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("フラグされたユーザーに適用する制裁を選択！")
        );
        assert_eq!(
            cmd.description_localizations.get("ru").map(String::as_str),
            Some("Выберите санкцию для отмеченного пользователя!")
        );
        assert_eq!(
            cmd.description_localizations
                .get("es-ES")
                .map(String::as_str),
            Some("Elegir la sanción a aplicar para el usuario marcado!")
        );
    }
}

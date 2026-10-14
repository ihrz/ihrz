use super::*;

// Massiverole action choice. Mirrors the `action` option `choices` in
// utils.ts:746-765: slash shows the localized display names, the
// handler maps each variant back to the TS `value` (`add` / `sub`)
// read by `mass_action`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum MassiveroleAction {
    #[name = "add"]
    #[name_localized("en-US", "Add")]
    #[name_localized("en-GB", "Add")]
    #[name_localized("fr", "Ajouter")]
    #[name_localized("ja", "add")]
    #[name_localized("ru", "add")]
    #[name_localized("es-ES", "add")]
    Add,
    #[name = "sub"]
    #[name_localized("en-US", "Remove")]
    #[name_localized("en-GB", "Remove")]
    #[name_localized("fr", "Supprimer")]
    #[name_localized("ja", "remove")]
    #[name_localized("ru", "remove")]
    #[name_localized("es-ES", "remove")]
    Remove,
}

impl MassiveroleAction {
    /// TS `value` read by `mass_action`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Add => "add",
            Self::Remove => "sub",
        }
    }
}

/// Add/remove a role for every member. Mirrors !massiverole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "massiverole",
    aliases("massrole", "massroles"),
    default_member_permissions = "ADMINISTRATOR",
    user_cooldown = 300,
    description_localized("fr", "Ajouter/Supprimer des rôles pour tout le monde sur le serveur"),
    description_localized("ja", "サーバー内の全員にロールを追加/削除"),
    description_localized("ru", "Добавить/удалить роли всем на сервере"),
    description_localized("es-ES", "Añadir/Quitar roles a todos en el servidor")
)]
pub async fn massiverole(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Que veux-tu faire?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    #[description = "add or sub"]
    action: MassiveroleAction,
    #[description_localized("fr", "Le rôle spécifié que vous souhaitez ajouter")]
    #[description_localized("ja", "追加したい指定ロール")]
    #[description_localized("ru", "Указанная роль для добавления")]
    #[description_localized("es-ES", "El rol especificado que quieres añadir")]
    #[description = "Role"]
    role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Rate-limit guard. Mirrors the memberCount >= 10000 check.
    let member_count = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.member_count)
        .unwrap_or(0);
    if member_count >= 10000 {
        ctx.say(t("massiverole_too_much_member")).await?;
        return Ok(());
    }
    // TS parity (!massiverole.ts:73,181): only `add` / `sub` run a branch.
    // Any other action leaves just the loading ack in TS, so here it is
    // a silent return with no members touched.
    let add = match mass_action(action.as_str()) {
        Some(add) => add,
        None => return Ok(()),
    };
    let members = fetch_all_members(ctx.http(), guild_id).await;
    let total = members.len();
    let targets: Vec<serenity::UserId> = members
        .iter()
        .filter(|m| m.roles.contains(&role.id) != add)
        .map(|m| m.user.id)
        .collect();
    // Skipped = already-had (add) / no-longer-had (sub).
    let skipped = total.saturating_sub(targets.len());
    // Immediate progress reply, edited with the final embed.
    // Mirrors ogInteraction + processBatchAsync (10/150ms).
    let progress_tpl = if add {
        t("batch_massiverole_process")
    } else {
        t("batch_unmassiverole_process")
    };
    let progress = ctx.say(fill_progress(&progress_tpl, targets.len())).await?;
    let http = ctx.http();
    let role_id = role.id;
    // Audit reasons verbatim from !massiverole.ts (`member.roles.add(role,
    // "[Massrole] Module")` / `.remove(role, "[MassiveRole] Command")`).
    let reason = mass_audit_reason(add);
    let result =
        crate::funcs::process_batch_full(&targets, 10, 150, None::<fn(usize, usize)>, |uid| {
            async move {
                // Http role endpoints carry the audit reason (like
                // rolepanel.rs); the Member add/remove helpers take none.
                let out = if add {
                    http.add_member_role(guild_id, uid, role_id, Some(reason))
                        .await
                } else {
                    http.remove_member_role(guild_id, uid, role_id, Some(reason))
                        .await
                };
                out.is_ok()
            }
        })
        .await;
    let desc = fill_work(
        &t(if add {
            "massiverole_add_command_work"
        } else {
            "massiverole_sub_command_work"
        }),
        &ctx.author().to_string(),
        result.success,
        skipped,
        result.failed,
        &role.to_string(),
    );
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(0, 127, 255))
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    if let Some(thumb) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.icon_url())
    {
        embed = embed.thumbnail(thumb);
    }
    let mut reply = poise::CreateReply::default().content("").embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    progress.edit(ctx, reply).await?;
    Ok(())
}

/// Fetch every guild member over the paged REST endpoint (1000/page).
/// Mirrors TS guild.members.fetch() with no options, which returns the
/// whole member list: a single page would cap mass processing at 1000.
async fn fetch_all_members(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
) -> Vec<serenity::Member> {
    let mut all = Vec::new();
    let mut after: Option<serenity::UserId> = None;
    loop {
        let page = guild_id
            .members(http, Some(1000), after)
            .await
            .unwrap_or_default();
        if page.is_empty() {
            break;
        }
        after = page.last().map(|m| m.user.id);
        let done = page.len() < 1000;
        all.extend(page);
        if done {
            break;
        }
    }
    all
}

/// Parse the action option. Mirrors the `action === "add"` / `action ===
/// "sub"` branches in !massiverole.ts: exact match, no case fold.
/// `Some(true)` adds, `Some(false)` removes, and any other input is
/// `None` — the caller returns silently with no members touched, like
/// TS leaving just the loading ack.
pub fn mass_action(action: &str) -> Option<bool> {
    match action {
        "add" => Some(true),
        "sub" => Some(false),
        _ => None,
    }
}

/// Audit reason per branch, verbatim from !massiverole.ts.
pub fn mass_audit_reason(add: bool) -> &'static str {
    if add {
        "[Massrole] Module"
    } else {
        "[MassiveRole] Command"
    }
}

/// Fill the `${membersToProcess.length}` progress template.
pub fn fill_progress(template: &str, n: usize) -> String {
    template.replace("${membersToProcess.length}", &n.to_string())
}

/// Fill the `${interaction.user}` / `${a}` / `${s}` / `${e}` / `${role}` work template.
pub fn fill_work(
    template: &str,
    invoker: &str,
    added: usize,
    skipped: usize,
    errors: usize,
    role: &str,
) -> String {
    template
        .replace("${interaction.user}", invoker)
        .replace("${a}", &added.to_string())
        .replace("${s}", &skipped.to_string())
        .replace("${e}", &errors.to_string())
        .replace("${role}", role)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn massiverole_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = MassiveroleAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["add".to_string(), "sub".to_string()]);
        assert_eq!(MassiveroleAction::Add.as_str(), "add");
        assert_eq!(MassiveroleAction::Remove.as_str(), "sub");
        assert_eq!(
            MassiveroleAction::from_name("add"),
            Some(MassiveroleAction::Add)
        );
        assert_eq!(
            MassiveroleAction::from_name("SUB"),
            Some(MassiveroleAction::Remove)
        );
        assert_eq!(
            MassiveroleAction::from_name("sub"),
            Some(MassiveroleAction::Remove)
        );
        assert_eq!(MassiveroleAction::from_name("bogus"), None);
        assert_eq!(
            MassiveroleAction::from_index(0),
            Some(MassiveroleAction::Add)
        );
        assert_eq!(
            MassiveroleAction::from_index(1),
            Some(MassiveroleAction::Remove)
        );
        assert_eq!(mass_action(MassiveroleAction::Add.as_str()), Some(true));
        assert_eq!(mass_action(MassiveroleAction::Remove.as_str()), Some(false));
        let list = MassiveroleAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Ajouter")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Supprimer")
        );
        assert_eq!(
            MassiveroleAction::Remove.localized_name("ja"),
            Some("remove")
        );
    }

    #[test]
    fn action_parses_like_ts() {
        assert_eq!(mass_action("add"), Some(true));
        assert_eq!(mass_action("sub"), Some(false));
        // TS compares `===` with no case fold (!massiverole.ts:78,181):
        // `ADD` falls through both branches (silent return, no members
        // touched). Unknown actions run no branch in TS (loading ack
        // only): silent return, no members touched (a typo must never
        // mass-add).
        assert_eq!(mass_action("ADD"), None);
        assert_eq!(mass_action("SUB"), None);
        assert_eq!(mass_action("whatever"), None);
        assert_eq!(mass_action("remove"), None);
        assert_eq!(mass_action("del"), None);
        assert_eq!(mass_action("off"), None);
        assert_eq!(mass_action(""), None);
    }

    #[test]
    fn audit_reasons_match_ts_verbatim() {
        assert_eq!(mass_audit_reason(true), "[Massrole] Module");
        assert_eq!(mass_audit_reason(false), "[MassiveRole] Command");
    }

    #[test]
    fn templates_fill() {
        assert_eq!(
            fill_progress("Adding to ${membersToProcess.length} members...", 7),
            "Adding to 7 members..."
        );
        assert_eq!(
            fill_work(
                "${interaction.user} ${a}/${s}/${e} ${role}",
                "<@1>",
                2,
                3,
                4,
                "<@&9>"
            ),
            "<@1> 2/3/4 <@&9>"
        );
    }
}

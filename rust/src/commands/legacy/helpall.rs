use super::*;

/// List perm-gated commands you may use.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "helpall",
    aliases("help-all")
)]
pub async fn helpall(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let prefix =
        crate::db::guild_prefix(pool, Some(guild_id.get()), &ctx.data().config.prefix).await;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let entries = crate::commands::guildconfig::load_all_cmd_perms(pool, &gid).await;
    let gated: Vec<(String, crate::executor::CmdPerms)> = entries
        .into_iter()
        .filter(|(_, p)| crate::commands::guildconfig::has_perm_requirements(p))
        .collect();
    if gated.is_empty() {
        ctx.say(t("helpall_no_perms_defined").replace("${botPrefix}", &prefix))
            .await?;
        return Ok(());
    }
    let uid = ctx.author().id.get();
    let member_roles: Vec<u64> = ctx
        .author_member()
        .await
        .map(|m| m.roles.iter().map(|r| r.get()).collect())
        .unwrap_or_default();
    let user_level: u8 = crate::db::kv_get(pool, &gid, &format!("UTILS.USER_PERMS.{uid}"))
        .await
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let roles_map: std::collections::HashMap<String, String> =
        crate::db::kv_get(pool, &gid, "UTILS.roles")
            .await
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
    let user_level = user_level.max(crate::executor::role_level(&member_roles, &roles_map));
    let is_owner = crate::db::kv_get(pool, &gid, &format!("GUILD.OWNER.{uid}"))
        .await
        .is_some();
    // Role names for the gate suffix.
    let role_names: std::collections::HashMap<String, String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.roles
                .iter()
                .map(|(id, r)| (id.get().to_string(), r.name.clone()))
                .collect()
        })
        .unwrap_or_default();
    let registry = crate::commands::all();
    // (category, name, desc, gate)
    let mut allowed: Vec<HelpallItem> = Vec::new();
    for (cmd_name, perms) in &gated {
        let ok =
            is_owner || crate::executor::check_cmd_access(uid, &member_roles, user_level, perms);
        if !ok {
            continue;
        }
        let (cat, desc) = registry
            .iter()
            .find(|c| &c.name == cmd_name)
            .map(|c| {
                (
                    c.category.clone().unwrap_or_else(|| "other".to_string()),
                    c.description.clone().unwrap_or_default(),
                )
            })
            .unwrap_or_else(|| ("other".to_string(), String::new()));
        let gate = perm_gate_suffix(perms, &role_names, "🔐", "👑");
        allowed.push((cat, cmd_name.clone(), desc, gate));
    }
    if allowed.is_empty() {
        ctx.say(t("helpall_no_access")).await?;
        return Ok(());
    }
    allowed.sort();
    let year = chrono_year();
    let footer = format!("© iHorizon {year}");
    let desc_tpl = t("hybridcommands_embed_footer_text").replace("${botPrefix}", &prefix);
    // Group by category, 25 fields per embed page.
    let mut cats: Vec<(String, Vec<HelpallItem>)> = Vec::new();
    for item in allowed {
        match cats.last_mut() {
            Some((name, list)) if *name == item.0 => list.push(item),
            _ => cats.push((item.0.clone(), vec![item])),
        }
    }
    cats.sort_by(|a, b| a.0.cmp(&b.0));
    let mut first_embeds = Vec::new();
    let mut first_key = String::new();
    let mut options = Vec::new();
    for (cat, items) in &cats {
        let key = cat.to_lowercase().replace(char::is_whitespace, "_");
        if first_key.is_empty() {
            first_key = key.clone();
        }
        options.push(
            serenity::CreateSelectMenuOption::new(cat.clone(), key.clone())
                .description(super::help::help_option_desc(&code, items.len())),
        );
        if first_embeds.is_empty() {
            first_embeds = helpall_pages(cat, items, &prefix, &desc_tpl, &footer);
        }
    }
    let select = serenity::CreateSelectMenu::new(
        HELPALL_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("help_select_menu"));
    let mut reply = poise::CreateReply::default()
        .components(vec![serenity::CreateActionRow::SelectMenu(select)]);
    reply.embeds = first_embeds;
    let reply = ctx.send(reply).await?;
    let mid = reply.message().await?.id.get();
    let _ = crate::db::kv_set(pool, &gid, &helpall_key(mid), &uid.to_string()).await;
    Ok(())
}

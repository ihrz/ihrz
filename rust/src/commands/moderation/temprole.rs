use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "temprole",
    aliases("addtemprole", "temporaryrole", "temproles"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_temprole(
    ctx: Ctx<'_>,
    #[description = "Member"] member: serenity::User,
    #[description = "Role"] role: serenity::Role,
    #[description = "Duration (e.g. 10m, 1h, 7d)"] time: String,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Display mirrors TS `to_beautiful_string(roleTime, lang)`: localized
    // units formatted from the pre-clamp input, even on overflow.
    let units = [
        t("var_year"),
        t("var_mo"),
        t("var_w"),
        t("var_d"),
        t("var_h"),
        t("var_m"),
        t("var_s"),
    ];
    let pretty = beautiful_ms_lang(crate::funcs::time_ms(&time), &units);
    let mut ms = crate::funcs::time_ms(&time) as i64;
    if ms <= 0 {
        ctx.say(t("too_new_account_invalid_time_on_enable")).await?;
        return Ok(());
    }
    // 1-year clamp with the TS overflow note.
    let mut overflow = false;
    if ms > YEAR_MAX_MS {
        ms = YEAR_MAX_MS;
        overflow = true;
    }
    let reason_s = reason.clone().unwrap_or_else(|| t("var_no_set"));
    let no = emoji(&ctx, "No", "❌").await;
    let vc = emoji(&ctx, "VC_OpenChat", "💬").await;
    let guards = guard_data(&ctx, guild_id).await;
    if let Some(g) = &guards {
        if !g.bot_perms.manage_roles() {
            ctx.say(
                t("temprole_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    // TS `if (!roleTime || !memberToAdd || !roleToAdd) return;`
    // (!temprole.ts:72-74): an unresolvable member is a silent return,
    // no additive reply.
    if guild_id.member(ctx.http(), member.id).await.is_err() {
        return Ok(());
    };
    let author_id = ctx.author().id.get();
    let (bot_top, owner) = guards
        .as_ref()
        .map(|g| (g.bot_top, g.owner_id))
        .unwrap_or((u16::MAX, author_id));
    if let Some(target_pos) = target_top(&ctx, guild_id, member.id).await {
        if target_pos >= bot_top && owner != author_id {
            ctx.say(
                t("temprole_tomute_highest_role_or_same")
                    .replace("${client.iHorizon_Emojis.No}", &no)
                    .replace("${tomute.toString()}", &member.to_string()),
            )
            .await?;
            return Ok(());
        }
    }
    // The role itself must sit below the bot's top role.
    if role.position >= bot_top && owner != author_id {
        ctx.say(t("temprole_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let gid = guild_id.get().to_string();
    // Mirrors temproleManager.isAlreadyWithThisRole: temp rows only, not
    // whether the member currently holds the role.
    let already = crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        &gid,
        &gid,
        &temprole_key(member.id.get(), role.id.get()),
    )
    .await
    .is_some();
    if already {
        ctx.say(t("temprole_already_has_role")).await?;
        return Ok(());
    }
    // Audit reason mirrors tempRoleManager.addrole: the raw reason.
    ctx.http()
        .add_member_role(guild_id, member.id, role.id, reason.as_deref())
        .await?;
    let exp = crate::commands::shared::now_ms() + ms;
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &temprole_key(member.id.get(), role.id.get()),
        &serde_json::json!({"expires_at_ms": exp}).to_string(),
    )
    .await?;
    let mut content = t("temprole_command_work")
        .replace("${tomute.id}", &member.id.get().to_string())
        .replace("${ms(ms(mutetime))}", &pretty)
        .replace("${reason}", &reason_s);
    if overflow {
        content += &t("temprole_tomute_max_time_passed")
            .replace("${client.iHorizon_Emojis.VC_OpenChat}", &vc);
    }
    ctx.say(content).await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("temprole_logs_embed_title"),
        t("temprole_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${tomute.id}", &member.id.get().to_string())
            .replace("${ms(ms(mutetime))}", &pretty)
            .replace("${reason}", &reason_s),
    )
    .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slash_option_names_match_ts() {
        // TS mod.ts temprole options: member, role, time, reason.
        let cmd = mod_temprole();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["member", "role", "time", "reason"]);
    }
}

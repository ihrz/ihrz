use super::*;
use poise::serenity_prelude as serenity;

/// Clear one user's warns. Mirrors !clearwarn.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "clearwarn",
    aliases("clearwarn", "clearwarns", "clearsanctions", "clearsanction"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_clearwarn(
    ctx: Ctx<'_>,
    #[description = "Member"] member: serenity::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let warns = load_warns(&ctx.data().pool, &gid, member.id.get()).await;
    // TS (!clearwarn.ts): no warns -> warnlist_no_data reply, no delete.
    if warns.is_empty() {
        let no = emoji(&ctx, "No", "❌").await;
        ctx.say(
            crate::lang::get(&code, "warnlist_no_data")
                .map(|s| render_no_warns(&s, &no, &member.to_string()))
                .unwrap_or_else(|| "No warns.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let warn_count = warns.len();
    let _ = crate::commands::owner::main::routed_del(
        &ctx.data().pool,
        &gid,
        &gid,
        &warns_key(member.id.get()),
    )
    .await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "clearwarn_command_ok")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${member?.toString()}", &format!("<@{}>", member.id.get()))
                    .replace("${allWarns.length}", &warn_count.to_string())
                    .replace(
                        "${interaction.member.toString()}",
                        &format!("<@{}>", ctx.author().id.get()),
                    )
            })
            .unwrap_or_else(|| "Warns cleared.".to_string()),
    )
    .await?;
    Ok(())
}

/// Render the `warnlist_no_data` empty-case reply. Pure for tests.
fn render_no_warns(template: &str, no_emoji: &str, mention: &str) -> String {
    template
        .replace("${client.iHorizon_Emojis.No}", no_emoji)
        .replace("${member?.toString()}", mention)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_empty_case_placeholders() {
        let out = render_no_warns(
            "${client.iHorizon_Emojis.No} ${member?.toString()} seems to not have any warns!",
            "❌",
            "<@123>",
        );
        assert_eq!(out, "❌ <@123> seems to not have any warns!");
    }

    #[test]
    fn en_us_warnlist_no_data_key_exists() {
        let s = crate::lang::get("en-US", "warnlist_no_data").unwrap_or_default();
        assert!(
            s.contains("${member?.toString()}"),
            "key must keep member placeholder"
        );
    }

    #[test]
    fn slash_option_names_match_ts() {
        // TS mod.ts clearwarn option: member.
        let cmd = mod_clearwarn();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["member"]);
    }
}

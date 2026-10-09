use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "schedule",
    category = "schedule",
    subcommands(
        "schedule_create",
        "schedule_delete",
        "schedule_delete_all",
        "schedule_list"
    )
)]
pub async fn schedule(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let msg = crate::commands::lang_for(
        &ctx,
        "schedule_menu_placeholder",
        "Use a subcommand: create, delete, delete-all, list.",
    )
    .await;
    ctx.say(msg).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "create")]
pub async fn schedule_create(
    ctx: Ctx<'_>,
    #[description = "Title (5-30 chars)"] title: String,
    #[description = "Description (10-400 chars)"] description: String,
    #[description = "When (e.g. 10s, 5m, 2h, 7d)"] when: String,
) -> Result<(), anyhow::Error> {
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !validate_title(&title) {
        ctx.say(
            crate::lang::get(&lang_code, "msg_title_must_be_5_30_characters")
                .unwrap_or_else(|| "Title must be 5-30 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if !validate_description(&description) {
        ctx.say(
            crate::lang::get(&lang_code, "msg_description_must_be_10_400_characters")
                .unwrap_or_else(|| "Description must be 10-400 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(delta_ms) = parse_duration_ms(&when) else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_create_not_number_time")
                .map(|s| s.replace("${interaction.user}", &ctx.author().to_string()))
                .unwrap_or_else(|| "Invalid duration. Use e.g. 10s, 5m, 2h, 7d.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let code = gen_code();
    let entry = ScheduleEntry {
        code: code.clone(),
        title,
        description,
        expires_at_ms: now_ms().saturating_add(delta_ms),
    };
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    save_entry(&ctx.data().pool, &gid, &entry, user_id).await?;
    ctx.say(
        crate::lang::get(&lang_code, "schedule_create_confirm_msg")
            .map(|s| {
                s.replace("${interaction.user}", &ctx.author().to_string())
                    .replace("${scheduleCode}", &code)
            })
            .unwrap_or_else(|| {
                format!(
                    "Scheduled `{code}` (expires <t:{}:F>).",
                    entry.expires_at_ms / 1000
                )
            }),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn schedule_delete(
    ctx: Ctx<'_>,
    #[description = "Schedule code"] code: String,
) -> Result<(), anyhow::Error> {
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if delete_entry(&ctx.data().pool, &gid, user_id, code.trim()).await? {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_delete_confirm")
                .unwrap_or_else(|| "Schedule deleted.".to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_delete_not_found")
                .map(|s| s.replace("${arg0}", code.trim()))
                .unwrap_or_else(|| "Schedule not found.".to_string()),
        )
        .await?;
    }
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "delete-all")]
pub async fn schedule_delete_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let n = delete_all_entries(&ctx.data().pool, &gid, user_id).await?;
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&lang_code, "schedule_deleteall_confirm")
            .unwrap_or_else(|| format!("Deleted {n} schedule(s).")),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn schedule_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let entries = list_entries(&ctx.data().pool, &gid, user_id).await;
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if entries.is_empty() {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_list_not_schedule")
                .unwrap_or_else(|| "No schedules.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let list_title = crate::lang::get(&lang_code, "schedule_list_title_embed")
        .unwrap_or_else(|| "Schedules".to_string());
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .title(list_title)
        .color(0x60BEE0);
    for e in entries.iter().take(25) {
        embed = embed.field(
            format!("#{}", e.code),
            format!(
                "{}\n{}\n<t:{}:F>",
                e.title,
                e.description,
                e.expires_at_ms / 1000
            ),
            false,
        );
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

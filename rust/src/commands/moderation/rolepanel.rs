use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    category = "moderation",
    rename = "rolepanel",
    default_member_permissions = "MANAGE_ROLES"
)]
pub async fn mod_rolepanel(
    ctx: Ctx<'_>,
    #[description = "Channel to post in"] channel: serenity::Channel,
    #[description = "Member the panel is for (default yourself)"] member: Option<serenity::User>,
    #[description = "Role 1"] role1: serenity::Role,
    #[description = "Role 2"] role2: Option<serenity::Role>,
    #[description = "Role 3"] role3: Option<serenity::Role>,
    #[description = "Role 4"] role4: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Member targeting: TS defaults the panel target to the author.
    let target = member.unwrap_or_else(|| ctx.author().clone());
    // Resolve the target channel before building any UI. Mirrors the
    // TS guard-typing block (`!interaction.channel` -> silent return):
    // a non-guild channel cannot host a button panel, and rolepanel.ts
    // has no key for that case (it always posts in-channel). A fetch
    // failure propagates to the crash reporter like a TS
    // interactionSend throw.
    let target_ch = match channel.id().to_channel(ctx.http()).await {
        Ok(ch) => match ch.guild() {
            Some(g) => g,
            None => return Ok(()),
        },
        Err(e) => {
            return Err(anyhow::anyhow!(
                "rolepanel: target channel fetch failed: {e}"
            ))
        }
    };
    let all: Vec<serenity::Role> = [Some(role1), role2, role3, role4]
        .into_iter()
        .flatten()
        .collect();
    // Role validation with a refused list. Mirrors getRefusedRoleReason.
    let guards = guard_data(&ctx, guild_id).await;
    let author_id = ctx.author().id.get();
    let (bot_top, author_top, owner) = guards
        .as_ref()
        .map(|g| (g.bot_top, g.author_top, g.owner_id))
        .unwrap_or((u16::MAX, u16::MAX, author_id));
    let mut valid: Vec<serenity::Role> = vec![];
    let mut refused: Vec<String> = vec![];
    for r in all {
        match rolepanel_refused_reason(&r, guild_id, bot_top, author_top, author_id, owner, &t) {
            Some(why) => refused.push(format!("<@&{}>: {why}", r.id.get())),
            None => valid.push(r),
        }
    }
    if valid.is_empty() {
        ctx.say(t("rolepanel_setup_no_roles")).await?;
        return Ok(());
    }
    let buttons: Vec<serenity::CreateButton> = valid
        .iter()
        .map(|r| {
            serenity::CreateButton::new(rolepanel_custom_id(r.id))
                .label(r.name.clone())
                .style(serenity::ButtonStyle::Secondary)
        })
        .collect();
    // Discord allows max 5 buttons per row.
    let rows: Vec<serenity::CreateActionRow> = buttons
        .chunks(5)
        .map(|c| serenity::CreateActionRow::Buttons(c.to_vec()))
        .collect();

    let posted = target_ch
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new()
                .content(format!("{}\n{}", t("rolepanel_panel_embed_desc"), target))
                .components(rows),
        )
        .await?;
    let mut confirm = t("rolepanel_setup_saved");
    if !refused.is_empty() {
        confirm += &format!(
            "\n{}",
            t("rolepanel_apply_refused").replace("${roles}", &refused.join(", "))
        );
    }
    ctx.say(confirm).await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("rolepanel_logs_embed_title_create"),
        t("rolepanel_logs_embed_desc_create")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${message.id}", &posted.id.get().to_string())
            .replace(
                "${roles}",
                &valid
                    .iter()
                    .map(|r| format!("<@&{}>", r.id.get()))
                    .collect::<Vec<_>>()
                    .join(", "),
            ),
    )
    .await;
    Ok(())
}

/// Component handler: toggle the role encoded in the button custom_id.
/// Called from events_handler.rs `interaction_create` when
/// `custom_id.starts_with("rolepanel:")`.
pub async fn handle_rolepanel_button(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let Some(role_id) = parse_rolepanel_custom_id(&comp.data.custom_id) else {
        return Ok(());
    };
    // Validate the role before toggling (managed/everyone + bot hierarchy).
    let roles = guild_id.roles(&ctx.http).await.unwrap_or_default();
    let Some(role) = roles.get(&role_id) else {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content("Role not found.")
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    };
    let bot_id = ctx.cache.current_user().id;
    let bot_top = guild_id
        .member(&ctx.http, bot_id)
        .await
        .ok()
        .map(|m| top_of(&roles, &m.roles))
        .unwrap_or(u16::MAX);
    if role.id.get() == guild_id.get() || role.managed || bot_top <= role.position {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(format!("<@&{}>: refused.", role.id.get()))
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
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
                .content(if has {
                    format!("Roles removed: <@&{}>", role_id.get())
                } else {
                    format!("Roles added: <@&{}>", role_id.get())
                })
                .ephemeral(true),
        ),
    )
    .await?;
    Ok(())
}

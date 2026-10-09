use super::*;

/// DM a member. Mirrors utils !dm.ts.
// On DM failure only the failure reply is sent (TS sends both).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "dm",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn dm(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Message"] message: String,
    #[description = "Private (yes to hide the author button)"] private: Option<String>,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    let is_private = private
        .as_deref()
        .map(|s| s.trim().eq_ignore_ascii_case("yes"))
        .unwrap_or(false);
    let guild_label = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_else(|| "0".to_string());
    let mut buttons = vec![serenity::CreateButton::new("forgot-my-name")
        .style(serenity::ButtonStyle::Secondary)
        .label(format!("Message from: {guild_label}"))
        .disabled(true)];
    if !is_private {
        buttons.push(
            serenity::CreateButton::new("forgot-my-name2")
                .style(serenity::ButtonStyle::Secondary)
                .label(format!("Message by: {}", ctx.author().id.get()))
                .disabled(true),
        );
    }
    let dm = poise::serenity_prelude::CreateMessage::new()
        .content(&message)
        .components(vec![serenity::CreateActionRow::Buttons(buttons)]);
    match user.direct_message(ctx.http(), dm).await {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "utils_dm")
                    .map(|s| {
                        s.replace("${client.iHorizon_Emojis.Yes}", &yes).replace(
                            "${targetMember.toString()}",
                            &format!("<@{}>", user.id.get()),
                        )
                    })
                    .unwrap_or_else(|| "${client.iHorizon_Emojis.Yes} The message was successfully sent to ${targetMember.toString()}.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "utils_dm_cant")
                    .map(|s| {
                        s.replace("${client.iHorizon_Emojis.No}", &no).replace(
                            "${targetMember.toString()}",
                            &format!("<@{}>", user.id.get()),
                        )
                    })
                    .unwrap_or_else(|| "${client.iHorizon_Emojis.No} I couldn't send a message to ${targetMember.toString()}. They may have blocked private messages, or they may have blocked me!".to_string()),
            )
            .await?
        }
    };
    Ok(())
}

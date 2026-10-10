use super::*;

/// DM a member. Mirrors utils !dm.ts (param order private, user, message).
// The `private` option is a Yes/No slash choice; "yes" hides the author.
// (Including the TS quirk where the success reply is sent before the
// failure reply when the DM fails.)
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "dm",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn dm(
    ctx: Ctx<'_>,
    #[description = "Private (yes to hide the author button)"] private: PrivateChoice,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Message"] message: String,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    let is_private = is_private_choice(private);
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
    let success_msg = crate::lang::get(&code, "utils_dm")
        .map(|s| {
            s.replace("${client.iHorizon_Emojis.Yes}", &yes).replace(
                "${targetMember.toString()}",
                &format!("<@{}>", user.id.get()),
            )
        })
        .unwrap_or_else(|| "${client.iHorizon_Emojis.Yes} The message was successfully sent to ${targetMember.toString()}."
            .to_string());
    let failure_msg = crate::lang::get(&code, "utils_dm_cant")
        .map(|s| {
            s.replace("${client.iHorizon_Emojis.No}", &no).replace(
                "${targetMember.toString()}",
                &format!("<@{}>", user.id.get()),
            )
        })
        .unwrap_or_else(|| "${client.iHorizon_Emojis.No} I couldn't send a message to ${targetMember.toString()}. They may have blocked private messages, or they may have blocked me!"
            .to_string());
    match user.direct_message(ctx.http(), dm).await {
        Ok(_) => {
            ctx.say(success_msg).await?;
        }
        // Mirrors the TS `.catch`: the success reply goes out first,
        // then the failure reply.
        Err(_) => {
            ctx.say(success_msg).await?;
            ctx.say(failure_msg).await?;
        }
    };
    Ok(())
}

/// Yes/No slash choice for the DM `private` option.
/// Mirrors the TS `private` option choices (`yes` / `no`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum PrivateChoice {
    #[name = "Yes"]
    Yes,
    #[name = "No"]
    No,
}

/// Is the `private` choice set to "yes"? Mirrors
/// `interaction.options.getString("private") === "yes"`
/// (required yes/no choice in utils.ts).
pub fn is_private_choice(private: PrivateChoice) -> bool {
    matches!(private, PrivateChoice::Yes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use poise::ChoiceParameter as _;

    #[test]
    fn private_choice_parsing() {
        assert!(is_private_choice(PrivateChoice::Yes));
        assert!(!is_private_choice(PrivateChoice::No));
        assert_eq!(PrivateChoice::from_name("Yes"), Some(PrivateChoice::Yes));
        assert_eq!(PrivateChoice::from_name("No"), Some(PrivateChoice::No));
    }
}

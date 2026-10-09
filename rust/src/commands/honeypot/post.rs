use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(slash_command, prefix_command, rename = "post")]
pub async fn honeypot_post(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let button = serenity::CreateButton::new(HONEYPOT_CUSTOM_ID)
        .label("Claim free nitro")
        .style(serenity::ButtonStyle::Danger);
    ctx.channel_id()
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new()
                .content("Limited offer, be quick!")
                .button(button),
        )
        .await?;
    Ok(())
}

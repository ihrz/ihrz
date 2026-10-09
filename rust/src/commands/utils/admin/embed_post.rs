use super::*;

/// Post an embed from title + description.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "embed-post",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn embed_post(
    ctx: Ctx<'_>,
    #[description = "Title"] title: String,
    #[description = "Description"] description: String,
) -> Result<(), anyhow::Error> {
    let mut draft = crate::embed_builder::EmbedDraft::default();
    draft
        .set_title(&title)
        .map_err(|_| anyhow::anyhow!("title too long"))?;
    draft
        .set_description(&description)
        .map_err(|_| anyhow::anyhow!("description too long"))?;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(draft.title.clone())
        .description(draft.description.clone());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

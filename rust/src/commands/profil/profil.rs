use super::*;
use super::{
    set_age::profil_age, set_birthday::profil_birthday, set_description::profil_description,
    set_gender::profil_gender, set_pronoun::profil_pronoun, show::profil_show,
};

/// Parent group. Mirrors the TS `profil` HybridCommand definition.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "profil",
    category = "profil",
    subcommands(
        "profil_show",
        "profil_age",
        "profil_description",
        "profil_gender",
        "profil_pronoun",
        "profil_birthday"
    )
)]
pub async fn profil(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.send(
        poise::CreateReply::default()
            .content("Use a subcommand: show, set-age, set-description, set-gender, set-pronoun, set-birthday.")
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

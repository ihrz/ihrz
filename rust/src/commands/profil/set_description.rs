use super::*;

/// Set your description. Mirrors `!set-description.ts`.
///
/// The TS stores the text verbatim (`profilTable.set(..., desc)`) with
/// the prefix path defaulting an empty arg list to `"None"`
/// (`args?.join(" ") || "None"`); an empty/blank value stores `"None"`
/// here on both paths so the show embed never renders an empty desc.
pub fn default_description(desc: Option<String>) -> String {
    match desc.map(|d| d.trim().to_string()).filter(|d| !d.is_empty()) {
        Some(d) => d,
        None => "None".to_string(),
    }
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-description",
    aliases("desc", "description"),
    category = "profil"
)]
pub async fn profil_description(
    ctx: Ctx<'_>,
    #[description = "Your description on the iHorizon profil"] description: Option<String>,
) -> Result<(), anyhow::Error> {
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.description = default_description(description);
    super::profil::save_profil_routed(&ctx.data().pool, user_id, &p).await?;
    let msg = crate::commands::lang_for(
        &ctx,
        "setprofildescriptions_command_work",
        "**Your description has been updated successfully.**",
    )
    .await;
    ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::default_description;

    #[test]
    fn empty_description_defaults_to_none_like_ts_prefix() {
        assert_eq!(default_description(None), "None");
        assert_eq!(default_description(Some("".to_string())), "None");
        assert_eq!(default_description(Some("   ".to_string())), "None");
        assert_eq!(default_description(Some("hi".to_string())), "hi");
        assert_eq!(
            default_description(Some("  padded  ".to_string())),
            "padded"
        );
    }
}

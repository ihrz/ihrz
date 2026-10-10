use super::*;

/// Set your description. Mirrors `!set-description.ts`.
///
/// The TS stores the text verbatim (`profilTable.set(..., desc)`): the
/// prefix path defaults a missing/empty arg list to `"None"`
/// (`args?.join(" ") || "None"`), and anything else — including
/// whitespace-only or padded input — stores exactly as given. Only a
/// missing (`None`) or empty value maps to `"None"` here on both paths.
pub fn default_description(desc: Option<String>) -> String {
    match desc {
        Some(d) if !d.is_empty() => d,
        _ => "None".to_string(),
    }
}

/// Set your description on the iHorizon's Profil!
// The `description` param is required on slash like the TS
// `getString("description")!`; on prefix it takes the rest of the line
// like the TS `args?.join(" ")`. An empty value still maps to `"None"`
// via `default_description` (the TS prefix `|| "None"` default, kept).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-description",
    aliases("desc", "description"),
    category = "profil"
)]
pub async fn profil_description(
    ctx: Ctx<'_>,
    #[description = "Your description on the iHorizon profil"]
    #[rest]
    description: String,
) -> Result<(), anyhow::Error> {
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.description = default_description(Some(description));
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
        // Verbatim store: padding and whitespace-only input are kept
        // as-is (TS `args?.join(" ") || "None"` only defaults falsy).
        assert_eq!(default_description(Some("hi".to_string())), "hi");
        assert_eq!(
            default_description(Some("  padded  ".to_string())),
            "  padded  "
        );
        assert_eq!(default_description(Some("   ".to_string())), "   ");
    }
}

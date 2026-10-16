use super::*;

/// Set your description. Mirrors `!set-description.ts`.
///
/// The TS stores the text verbatim (`profilTable.set(..., desc)`): past
/// the prefix count-check gate, anything reaching the handler — including
/// whitespace-only or padded input — stores exactly as given
/// (`args?.join(" ") || "None"` only defaults falsy). Only a missing
/// (`None`) or empty value maps to `"None"` here on both paths.
pub fn default_description(desc: Option<String>) -> String {
    match desc {
        Some(d) if !d.is_empty() => d,
        _ => "None".to_string(),
    }
}

/// Set your description on the iHorizon's Profil!
// The `description` option is required:true in
// HybridCommands/profil/profil.ts, so TS checkCommandArgs counts first
// (see commandExecutor.ts): a bare prefix call renders the caret usage
// embed (prod live: `+set-description [string]` caret 1emb), never the
// handler default. Slash always supplies the option; on prefix a
// residual None past the count gate maps to `"None"` via
// `default_description` (TS `args?.join(" ") || "None"`).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-description",
    aliases("desc", "description"),
    category = "profil",
    name_localized("fr", "définir-description"),
    name_localized("ja", "set-description"),
    name_localized("ru", "set-description"),
    name_localized("es-ES", "set-description"),
    description_localized("fr", "Définissez votre description sur le profil iHorizon"),
    description_localized("ja", "iHorizonプロフィールに説明を設定！"),
    description_localized("ru", "Установить описание в профиле iHorizon!"),
    description_localized("es-ES", "Establecer tu descripción en el perfil de iHorizon!")
)]
pub async fn profil_description(
    ctx: Ctx<'_>,
    #[description = "Your description on the iHorizon profil"]
    #[description_localized("fr", "La description sur votre profil")]
    #[description_localized("ja", "iHorizonプロフィールの説明")]
    #[description_localized("ru", "Ваше описание в профиле iHorizon")]
    #[description_localized("es-ES", "Tu descripción en el perfil de iHorizon")]
    #[rest]
    description: Option<String>,
) -> Result<(), anyhow::Error> {
    // TS checkCommandArgs counts first (`description` required:true):
    // a bare prefix invocation renders the caret usage embed, never a
    // stored `"None"` (slowmode.rs precedent; prod live 2026-10-17).
    if let poise::Context::Prefix(pctx) = ctx {
        if prefix_description_missing(pctx.args) {
            crate::bot::prefix_usage_denial(ctx, None).await;
            return Ok(());
        }
    }
    // Ack first: the load + dual-write save below can outlast the 3s
    // interaction window (see `ack_setter`).
    super::profil::ack_setter(&ctx).await;
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

/// Prefix count-check predicate: a bare (or whitespace-only) prefix
/// invocation must render the caret usage embed, mirroring TS
/// checkCommandArgs for the required `description` option.
pub fn prefix_description_missing(args: &str) -> bool {
    args.trim().is_empty()
}

#[cfg(test)]
mod tests {
    use super::default_description;
    use super::prefix_description_missing;

    #[test]
    fn bare_prefix_needs_usage_embed() {
        // TS checkCommandArgs counts first: empty prefix args render
        // the caret usage embed, any text reaches the handler.
        assert!(prefix_description_missing(""));
        assert!(prefix_description_missing("   "));
        assert!(!prefix_description_missing("hi"));
        assert!(!prefix_description_missing("  parity check  "));
    }

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

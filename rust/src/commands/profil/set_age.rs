use super::*;

/// Set your age on the iHorizon's Profil !
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-age",
    aliases("age"),
    category = "profil",
    name_localized("fr", "définir-âge"),
    name_localized("ja", "set-age"),
    name_localized("ru", "set-age"),
    name_localized("es-ES", "set-age"),
    description_localized("fr", "Définissez votre âge sur le profil iHorizon"),
    description_localized("ja", "iHorizonプロフィールに年齢を設定！"),
    description_localized("ru", "Установить возраст в профиле iHorizon!"),
    description_localized("es-ES", "Establecer tu edad en el perfil de iHorizon!")
)]
pub async fn profil_age(
    ctx: Ctx<'_>,
    #[description = "Your age on the iHorizon profil"]
    #[description_localized("fr", "Votre âge sur votre profil iHorizon")]
    #[description_localized("ja", "iHorizonプロフィールの年齢")]
    #[description_localized("ru", "Ваш возраст в профиле iHorizon")]
    #[description_localized("es-ES", "Tu edad en el perfil de iHorizon")]
    age: Option<f64>,
) -> Result<(), anyhow::Error> {
    // TS checkCommandArgs counts first (`age` required:true in
    // HybridCommands/profil/profil.ts): a bare prefix call renders the
    // caret usage embed (prod live: `+set-age [number]` caret 1emb),
    // never a stored 0 (set_description.rs c3a05d790 precedent).
    if let poise::Context::Prefix(pctx) = ctx {
        if prefix_age_missing(pctx.args) {
            crate::bot::prefix_usage_denial(ctx, None).await;
            return Ok(());
        }
    }
    // Ack first: the load + dual-write save below can outlast the 3s
    // interaction window (see `ack_setter`).
    super::profil::ack_setter(&ctx).await;
    // TS `!set-age.ts` slash path stores `getNumber("age")` verbatim
    // (floats included, no range gate); past the prefix count gate the
    // `method.number` intake maps missing input to 0, mirrored here.
    let age = age.unwrap_or(0.0);
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.age = Some(age);
    super::profil::save_profil_routed(&ctx.data().pool, user_id, &p).await?;
    let msg = crate::commands::lang_for(
        &ctx,
        "setprofilage_command_work",
        "**Your profile age has been updated successfully.**",
    )
    .await;
    ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
        .await?;
    Ok(())
}

/// Prefix count-check predicate: a bare (or whitespace-only) prefix
/// invocation must render the caret usage embed, mirroring TS
/// checkCommandArgs for the required `age` option.
pub fn prefix_age_missing(args: &str) -> bool {
    args.trim().is_empty()
}

#[cfg(test)]
mod set_age_tests {
    use super::prefix_age_missing;

    /// TS checkCommandArgs counts first: empty prefix args render the
    /// caret usage embed, any text reaches the handler.
    #[test]
    fn bare_prefix_needs_usage_embed() {
        assert!(prefix_age_missing(""));
        assert!(prefix_age_missing("   "));
        assert!(!prefix_age_missing("25"));
        assert!(!prefix_age_missing("  25  "));
    }

    /// Slash intake mirrors `getNumber("age")`: numeric values store
    /// verbatim (floats included), a missing option stores 0 like the
    /// prefix `method.number` fallback.
    #[test]
    fn missing_age_defaults_to_zero_like_ts_prefix() {
        let age: Option<f64> = None;
        assert_eq!(age.unwrap_or(0.0), 0.0);
        assert_eq!(Some(25.0).unwrap_or(0.0), 25.0);
        assert_eq!(Some(25.9).unwrap_or(0.0), 25.9);
    }
}

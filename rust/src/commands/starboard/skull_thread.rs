use super::*;

/// Skullboard thread action choice. Mirrors the `action` option
/// `choices` in skullboard.ts:211-231 (straight apostrophe in `Don't
/// create thread`): slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum SkullThreadAction {
    #[name = "yes"]
    #[name_localized("en-US", "Create thread")]
    #[name_localized("en-GB", "Create thread")]
    #[name_localized("fr", "Créer un fil")]
    #[name_localized("ja", "create_thread")]
    #[name_localized("ru", "create_thread")]
    #[name_localized("es-ES", "create_thread")]
    Yes,
    #[name = "no"]
    #[name_localized("en-US", "Don't create thread")]
    #[name_localized("en-GB", "Don't create thread")]
    #[name_localized("fr", "Ne pas créer un fil")]
    #[name_localized("ja", "don_t_create_thread")]
    #[name_localized("ru", "don_t_create_thread")]
    #[name_localized("es-ES", "don_t_create_thread")]
    No,
}

impl SkullThreadAction {
    /// TS `value` (`yes` / `no`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
        }
    }
}

/// Toggle thread creation. Mirrors skullboard !create-thread.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "create-thread",
    aliases("skullboardthread"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_thread(
    ctx: Ctx<'_>,
    #[description = "yes or no"] action: SkullThreadAction,
) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the Administrator leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::ADMINISTRATOR,
    )
    .await
    {
        return Ok(());
    }
    let create = matches!(action, SkullThreadAction::Yes);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    cfg.create_thread = create;
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    // TS skullboard create-thread reuses the starboard yes/no strings.
    let action_text = crate::commands::lang_for(
        &ctx,
        if create {
            "starboard_create_thread_yes"
        } else {
            "starboard_create_thread_no"
        },
        if create {
            "and a discussion thread will be created"
        } else {
            "and a discussion thread will not be created"
        },
    )
    .await;
    let text = crate::commands::lang_for(
        &ctx,
        "skullboard_create_thread_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '💀' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel **`${action}`**",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${action}", &action_text)
    .replace("${amount}", &cfg.threshold.to_string());
    ctx.say(text).await?;
    Ok(())
}

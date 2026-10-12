use super::*;

/// Role member cap. Mirrors !rolelimit.ts (GUILD.UTILS.ROLE_LIMIT.<role>).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "rolelimit",
    aliases("limitrole", "limitoles", "roleslimit"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Limiter le nombre de membres qui peuvent ce partager un rôle."),
    description_localized("ja", "同じロールのメンバー数を制限"),
    description_localized("ru", "Ограничить количество участников с одной ролью"),
    description_localized("es-ES", "Limitar el número de miembros en el mismo rol")
)]
pub async fn rolelimit(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le rôle que tu shouaite gérer.")]
    #[description_localized("ja", "管理したいロール")]
    #[description_localized("ru", "Роль, которой вы хотите управлять")]
    #[description_localized("es-ES", "El rol que quieres gestionar")]
    #[description = "Role"]
    role: poise::serenity_prelude::Role,
    #[description_localized("fr", "Le nombre maximum de membre qui auront le rôle en même temps.")]
    #[description_localized("ja", "同じロールに許可する最大メンバー数")]
    #[description_localized("ru", "Максимум участников с одинаковой ролью")]
    #[description_localized("es-ES", "El máximo de miembros que deseas en el mismo rol")]
    #[description = "Max members (0 to clear)"]
    #[rename = "members-limit"]
    limit: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = format!("GUILD.UTILS.ROLE_LIMIT.{}", role.id.get());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS (!rolelimit.ts:55): missing role or zero limit is a usage error.
    // (poise always supplies `role`; `limit` arrives as None when omitted.)
    let limit_count = limit.unwrap_or(0);
    if limit_count == 0 {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "util_rolelimit_bad_opt")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| {
                    "${client.iHorizon_Emojis.No} | The provided options are invalid. Please check your input.".to_string()
                }),
        )
        .await?;
        return Ok(());
    }
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &key,
        &limit_count.to_string(),
    )
    .await?;
    let crown = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Crown")
        .await
        .unwrap_or_default();
    ctx.say(
        crate::lang::get(&code, "util_rolelimit_good")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${role.toString()}", &role.to_string())
                    .replace("${limit_count}", &limit_count.to_string())
            })
            .unwrap_or_else(|| "Role limit set.".to_string()),
    )
    .await?;
    Ok(())
}

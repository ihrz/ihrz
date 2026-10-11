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
    match limit.unwrap_or(0) {
        0 => {
            let _ =
                crate::commands::owner::main::routed_del(&ctx.data().pool, &gid, &gid, &key).await;
            ctx.say(
                crate::lang::get(&code, "msg_role_limit_cleared")
                    .unwrap_or_else(|| "Role limit cleared.".to_string()),
            )
            .await?;
        }
        n => {
            crate::commands::owner::main::routed_set(
                &ctx.data().pool,
                &gid,
                &gid,
                &key,
                &n.max(1).to_string(),
            )
            .await?;
            ctx.say(
                crate::lang::get(&code, "msg_role_limit_set")
                    .unwrap_or_else(|| "Role limit set.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

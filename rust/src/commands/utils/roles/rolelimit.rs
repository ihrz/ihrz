use super::*;

/// Limit the number of member(s) in the same role
// Prefix null-flow: TS `method.role()` / `method.number()` can both miss
// and `if (!role || !limit_count)` answers bad_opt, so both params are
// `Option` (missing -> None) plus `discard_spare_arguments`
// (present-but-bad tokens are swallowed by the wildcard instead of
// hard-erroring as ArgumentParse before the body). `limit` is `f64` to
// match the TS `Number` option (fractions store verbatim); slash surface
// keeps the same `role` / `members-limit` names and option kinds.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "rolelimit",
    discard_spare_arguments,
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
    #[description = "The role you want to manage"]
    // TS slash `getRole("role", false)` is optional; prefix
    // `method.role()` can also return null.
    role: Option<poise::serenity_prelude::Role>,
    #[description_localized("fr", "Le nombre maximum de membre qui auront le rôle en même temps.")]
    #[description_localized("ja", "同じロールに許可する最大メンバー数")]
    #[description_localized("ru", "Максимум участников с одинаковой ролью")]
    #[description_localized("es-ES", "El máximo de miembros que deseas en el mismo rol")]
    #[description = "The maximum member you want on the sane role"]
    #[rename = "members-limit"]
    // TS `getNumber("members-limit", false)`: Number option, optional.
    limit: Option<f64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS (!rolelimit.ts): `limit_count = getNumber(...) || 0`, then
    // `if (!role || !limit_count)` is a usage error. (poise always runs
    // the body for `None` now instead of ArgumentParse-ing first.)
    // `|| 0` also coerces NaN to 0, so non-finite limits fall to
    // bad_opt the same way.
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Prefix counts-first gate (TS util.ts rolelimit decl: `role`
    // required, executor checkCommandArgs runs before run): a bare
    // `.util rolelimit` renders the caret usage embed (prod pair Q4),
    // never the bad_opt leg (backup/delete.rs precedent).
    if let poise::Context::Prefix(pctx) = ctx {
        if pctx.args.trim().is_empty() {
            crate::bot::prefix_usage_denial(ctx, None).await;
            return Ok(());
        }
    }
    let limit_count = sanitize_limit(limit);
    if role.is_none() || limit_count == 0.0 {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(crate::lang::get(&code, "util_rolelimit_bad_opt")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| {
                    "${client.iHorizon_Emojis.No} | The provided options are invalid. Please check your input.".to_string()
                }),
        )
        .await?;
        return Ok(());
    }
    let role = role.expect("role is some: checked just above");
    let key = format!("GUILD.UTILS.ROLE_LIMIT.{}", role.id.get());
    let stored = format_limit_count(limit_count);
    crate::commands::owner::main::routed_set(&ctx.data().pool, &gid, &gid, &key, &stored).await?;
    let crown = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Crown")
        .await
        .unwrap_or_default();
    ctx.say(
        crate::lang::get(&code, "util_rolelimit_good")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${role.toString()}", &role.to_string())
                    .replace("${limit_count}", &stored)
            })
            .unwrap_or_else(|| "Role limit set.".to_string()),
    )
    .await?;
    Ok(())
}

// Coerce the optional Number to the TS `getNumber(...) || 0` value:
// missing, NaN and infinities are all falsy and fall to 0 (bad_opt).
// Pure for unit tests.
pub fn sanitize_limit(limit: Option<f64>) -> f64 {
    limit.filter(|v| v.is_finite()).unwrap_or(0.0)
}

// Format a role-limit count like JS `String(limit_count)`: integral
// values print without a decimal point (`3`, not `3.0`), fractions print
// in full (`2.5`). Pure for unit tests.
pub fn format_limit_count(limit_count: f64) -> String {
    if limit_count.fract() == 0.0 && limit_count.abs() < 9e15 {
        format!("{}", limit_count as i64)
    } else {
        format!("{limit_count}")
    }
}

#[cfg(test)]
mod tests {
    use super::{format_limit_count, sanitize_limit};

    #[test]
    fn limit_formats_like_js_string_of_number() {
        assert_eq!(format_limit_count(3.0), "3");
        assert_eq!(format_limit_count(0.0), "0");
        assert_eq!(format_limit_count(2.5), "2.5");
        assert_eq!(format_limit_count(-4.0), "-4");
        // Whole floats never render with `.0` (JS String(3) === "3").
        assert!(!format_limit_count(10.0).contains('.'));
    }

    #[test]
    fn non_finite_limits_coerce_to_zero_like_ts_or_coercion() {
        // TS `getNumber(...) || 0`: NaN (and infinities) are falsy, so
        // they take the bad_opt path via 0.
        assert_eq!(sanitize_limit(None), 0.0);
        assert_eq!(sanitize_limit(Some(0.0)), 0.0);
        assert_eq!(sanitize_limit(Some(3.0)), 3.0);
        assert_eq!(sanitize_limit(Some(2.5)), 2.5);
        assert_eq!(sanitize_limit(Some(f64::NAN)), 0.0);
        assert_eq!(sanitize_limit(Some(f64::INFINITY)), 0.0);
        assert_eq!(sanitize_limit(Some(f64::NEG_INFINITY)), 0.0);
    }
}

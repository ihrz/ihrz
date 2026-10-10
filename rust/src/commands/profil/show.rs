use super::*;
use poise::serenity_prelude as serenity;

/// See the iHorizon profil of a member. Mirrors `!show.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    aliases("me", "prof"),
    category = "profil"
)]
pub async fn profil_show(
    ctx: Ctx<'_>,
    #[description = "The user you want to lookup"] user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let target = user.as_ref().unwrap_or_else(|| ctx.author());
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let p = super::profil::load_profil_routed(&ctx.data().pool, target.id.get()).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let money = crate::commands::economy::balance::load_econ_routed(
        &ctx.data().pool,
        &gid,
        target.id.get(),
    )
    .await;
    let rank =
        crate::commands::ranks::main::load_rank(&ctx.data().pool, &gid, target.id.get()).await;

    let birthday = match (p.bday_day, p.bday_month, p.bday_year) {
        (Some(d), Some(m), Some(y)) => format!("{d:02}/{m:02}/{y}"),
        (Some(d), Some(m), None) => format!("{d:02}/{m:02}"),
        _ => {
            crate::lang::get(&lang_code, "profil_unknown").unwrap_or_else(|| "Unknown".to_string())
        }
    };

    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let unknown = t("profil_unknown");
    let unknown = if unknown.is_empty() {
        "Unknown".to_string()
    } else {
        unknown
    };
    let no_desc = crate::lang::get(&lang_code, "profil_not_description_set")
        .unwrap_or_else(|| "No description set!".to_string());
    let pin = crate::emojis::app_emoji_markup(ctx.http(), "Pin")
        .await
        .unwrap_or_default();
    let title = crate::lang::get(&lang_code, "profil_embed_title")
        .map(|s| {
            s.replace("${member.tag}", &target.name)
                .replace("${client.iHorizon_Emojis.Pin}", &pin)
        })
        .unwrap_or_else(|| format!("{}'s profil", target.name));
    let age_val = p
        .age
        .map(|a| format!("{a}{}", t("profil_embed_fields_age_value")))
        .unwrap_or_else(|| unknown.clone());
    let age_val = if age_val.is_empty() {
        unknown.clone()
    } else {
        age_val
    };
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .description(if p.description.is_empty() {
            format!("`{no_desc}`")
        } else {
            format!("`{}`", p.description)
        })
        .field(
            {
                let v = t("profil_embed_fields_nickname");
                if v.is_empty() {
                    "Nickname".to_string()
                } else {
                    v
                }
            },
            target.name.clone(),
            false,
        )
        .field(
            {
                let v = t("profil_embed_fields_age");
                if v.is_empty() {
                    "Age".to_string()
                } else {
                    v
                }
            },
            age_val,
            false,
        )
        .field(
            {
                let v = t("profil_embed_fields_gender");
                if v.is_empty() {
                    "Gender".to_string()
                } else {
                    v
                }
            },
            p.gender.clone().unwrap_or_else(|| unknown.clone()),
            false,
        )
        .field(
            {
                let v = t("profil_embed_fields_pronouns");
                if v.is_empty() {
                    "Pronouns".to_string()
                } else {
                    v
                }
            },
            p.pronoun
                .as_deref()
                .map(super::set_pronoun::pronoun_display_value)
                .unwrap_or_else(|| unknown.clone()),
            false,
        )
        .field(
            {
                let v = t("profil_embed_fields_birthdate");
                if v.is_empty() {
                    "Birthdate".to_string()
                } else {
                    v
                }
            },
            birthday,
            false,
        )
        .field(
            {
                let v = t("profil_embed_fields_money");
                if v.is_empty() {
                    "Money".to_string()
                } else {
                    v
                }
            },
            format!("{}{}", money.money, t("profil_embed_fields_money_value")),
            true,
        )
        .field(
            {
                let v = t("profil_embed_fields_xplevels");
                if v.is_empty() {
                    "Level".to_string()
                } else {
                    v
                }
            },
            format!("{}{}", rank.level, t("profil_embed_fields_xplevels_value")),
            true,
        );
    // Snapshot the avatar like image64.ts so the thumbnail survives
    // avatar changes; fall back to the CDN URL when offline.
    let face_url = target.face();
    let face_bytes = crate::commands::botcat::download_bytes(&face_url).await;
    let embed = if face_bytes.is_some() {
        embed.thumbnail("attachment://avatar.png")
    } else {
        embed.thumbnail(face_url)
    }
    .colour(0xFFA550);

    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "avatar.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

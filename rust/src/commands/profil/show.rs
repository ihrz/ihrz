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
    let p = load_profil(&ctx.data().pool, target.id.get()).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let money =
        crate::commands::economy::main::load_econ(&ctx.data().pool, &gid, target.id.get()).await;
    let rank =
        crate::commands::ranks::main::load_rank(&ctx.data().pool, &gid, target.id.get()).await;

    let birthday = match (p.bday_day, p.bday_month, p.bday_year) {
        (Some(d), Some(m), Some(y)) => format!("{d:02}/{m:02}/{y}"),
        (Some(d), Some(m), None) => format!("{d:02}/{m:02}"),
        _ => "unknown".to_string(),
    };

    let embed = serenity::CreateEmbed::default()
        .title(format!("{}'s profil", target.name))
        .description(if p.description.is_empty() {
            "`No description set.`".to_string()
        } else {
            format!("`{}`", p.description)
        })
        .field("Nickname", target.name.clone(), false)
        .field(
            "Age",
            p.age
                .map(|a| a.to_string())
                .unwrap_or_else(|| "unknown".to_string()),
            false,
        )
        .field(
            "Gender",
            p.gender.clone().unwrap_or_else(|| "unknown".to_string()),
            false,
        )
        .field(
            "Pronouns",
            p.pronoun.clone().unwrap_or_else(|| "unknown".to_string()),
            false,
        )
        .field("Birthdate", birthday, false)
        .field("Money", money.money.to_string(), true)
        .field("Level", rank.level.to_string(), true);
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

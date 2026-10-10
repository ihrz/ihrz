use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "invites",
    aliases("i", "invsee")
)]
pub async fn inv_see(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let face_url;
    let target = match user.as_ref() {
        Some(u) => {
            face_url = u.face();
            u.id.get()
        }
        None => {
            face_url = ctx.author().face();
            ctx.author().id.get()
        }
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let s = load_invites(&ctx.data().pool, &gid, target).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let desc = crate::lang::get(&code, "invites_confirmation_embed_description")
        .unwrap_or_else(|| {
            "<@${member.user.id}> has `${inv || 0}` invites (`${Regular || 0}` regular, `${bonus || 0}` bonus, `${leaves || 0}` leaves)."
                .to_string()
        })
        .replace("${member.user.id}", &target.to_string())
        .replace("${inv || 0}", &s.invites.to_string())
        .replace("${Regular || 0}", &s.regular.to_string())
        .replace("${bonus || 0}", &s.bonus.to_string())
        .replace("${leaves || 0}", &s.leaves.to_string());
    let title = crate::lang::get(&code, "invites_confirmation_embed_title")
        .unwrap_or_else(|| "Inviter Stats".to_string());
    // Stats embed. Mirrors `!invites.ts` (#92A8D1 + title + timestamp +
    // member thumbnail, snapshotted so it survives avatar changes).
    let face_bytes = crate::image64::image64(&face_url).await;
    let mut embed = serenity::CreateEmbed::default()
        .title(title)
        .description(desc)
        .colour(0x92A8D1)
        .timestamp(serenity::Timestamp::now());
    if face_bytes.is_some() {
        embed = embed.thumbnail("attachment://avatar.png");
    } else {
        embed = embed.thumbnail(face_url);
    }
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "avatar.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

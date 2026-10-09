use super::*;

/// Member voice location. Mirrors utils !where.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "where",
    aliases("whereis"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn whereis(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let f = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let snapshot = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.members.get(&user.id).cloned().map(|m| {
            let vs = g.voice_states.get(&user.id).cloned();
            (m, vs)
        })
    });
    let Some((member, voice)) = snapshot else {
        ctx.say(
            crate::lang::get(&code, "ban_dont_found_member")
                .unwrap_or_else(|| "🔍 | Cannot find this member".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(vs) = voice.and_then(|v| v.channel_id.map(|c| (c, v))) else {
        ctx.say(
            crate::lang::get(&code, "util_not_in_vc")
                .unwrap_or_else(|| "The members are not in a voice channel".to_string()),
        )
        .await?;
        return Ok(());
    };
    let (channel_id, vs) = vs;
    let http = &ctx.serenity_context().http;
    let yes = f("var_yes");
    let no = f("var_no");
    let streaming = vs.self_stream.unwrap_or(false);
    let desc = format!(
        "> {} **{}:** <@{}>\n> {} **{}:** <#{}>\n> {} **{}:** {}\n> {} **{}:** {}\n> {} **{}:** {}",
        crate::emojis::app_emoji_markup(http, "VC_Limit")
            .await
            .unwrap_or_default(),
        f("var_member"),
        user.id.get(),
        crate::emojis::app_emoji_markup(http, "VC_Name")
            .await
            .unwrap_or_default(),
        f("var_voice_channel"),
        channel_id,
        crate::emojis::app_emoji_markup(http, "Streaming")
            .await
            .unwrap_or_default(),
        f("perm_stream_name"),
        if streaming { &yes } else { &no },
        crate::emojis::app_emoji_markup(http, "Camera")
            .await
            .unwrap_or_default(),
        f("var_video"),
        if vs.self_video { &yes } else { &no },
        crate::emojis::app_emoji_markup(http, "Mute")
            .await
            .unwrap_or_default(),
        f("util_where_mute"),
        if vs.self_mute { &yes } else { &no },
    );
    let deaf_line = format!(
        "> {} **{}:** {}",
        crate::emojis::app_emoji_markup(http, "Deaf")
            .await
            .unwrap_or_default(),
        f("util_where_deaf"),
        if vs.self_deaf { &yes } else { &no },
    );
    let embed = serenity::CreateEmbed::default()
        .title(format!("{}: {}", f("var_whereis"), member.display_name()))
        .colour(serenity::Colour::from_rgb(79, 219, 18))
        .description(format!("{desc}\n{deaf_line}"))
        .thumbnail(user.face());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

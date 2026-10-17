use super::*;
use poise::serenity_prelude as serenity;

/// Set the channel where user earn new xp level message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn pfps_channel(
    ctx: Ctx<'_>,
    #[description = "PFPS channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let user = ctx.author().to_string();
    // Mirrors `!channel.ts:61-65` (`if (!fetch && channel)`): the disable
    // flag gates the write. Rust writes "0"/"1" (config.rs) while legacy
    // TS rows hold booleans, so both encodings count as disabled.
    let disabled = matches!(
        load_pfps_string(&ctx.data().pool, &gid, "PFPS.disable")
            .await
            .as_deref(),
        Some("1") | Some("true")
    );
    // Operator decision (diverges from TS `!channel.ts:92-99`, which
    // errors when the module is disabled): setting a channel
    // auto-enables the module instead of forcing a prior
    // `/pfps config` round-trip. Clear the flag, then fall through
    // to the normal write below.
    if disabled {
        save_pfps_string(&ctx.data().pool, &gid, "PFPS.disable", "0").await?;
    }
    save_pfps_string(
        &ctx.data().pool,
        &gid,
        "PFPS.channel",
        &channel.id.get().to_string(),
    )
    .await?;
    // Mirrors `!channel.ts:71-80`: embed posted into the target channel
    // (TS `channelSend`, fire-and-forget here too).
    let embed = serenity::CreateEmbed::new()
        .color(0x333333_u32)
        .title(
            crate::lang::get(&code, "pfps_channel_embed_title")
                .unwrap_or_else(|| "PFPS Module set Here!".to_string()),
        )
        .description(
            crate::lang::get(&code, "pfps_channel_embed_desc")
                .map(|s| s.replace("${interaction.user}", &user))
                .unwrap_or_else(|| "PFPS module set here!".to_string()),
        )
        .timestamp(serenity::Timestamp::now());
    let _ = channel
        .id
        .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
        .await;
    let msg = crate::lang::get(&code, "pfps_channel_command_work")
        .map(|s| {
            s.replace("${interaction.user}", &user)
                .replace("${channel}", &format!("<#{}>", channel.id.get()))
        })
        .unwrap_or_else(|| "${interaction.user}, you have successfully set the PFPS module to the channel ${channel}!".to_string());
    ctx.say(msg).await?;
    Ok(())
}

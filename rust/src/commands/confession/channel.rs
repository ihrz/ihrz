use super::*;
use poise::serenity_prelude as serenity;

/// Panel button id. Mirrors the `new-confession-button` customId in
/// !channel.ts (routed by buttonHandler.ts).
pub const CONFESSION_PANEL_BUTTON_ID: &str = "new-confession-button";

/// Panel embed color. Mirrors `#ff05aa` in !channel.ts.
pub const CONFESSION_PANEL_COLOR: u32 = 0xff_05_aa;

/// Normalize the panel button label. Mirrors
/// `interaction.options.getString("button-title")?.substring(0, 32) || "+"`
/// (prefix: second arg, same fallback).
pub fn panel_button_label(input: Option<&str>) -> String {
    input
        .map(|t| t.chars().take(32).collect::<String>())
        .filter(|t| !t.is_empty())
        .unwrap_or_else(|| "+".to_string())
}

/// Panel store payload. Mirrors
/// `client.db.set(`${guildId}.GUILD.CONFESSION.panel`, {channelId, messageId})`.
pub fn panel_store_json(channel_id: u64, message_id: u64) -> String {
    serde_json::json!({
        "channelId": channel_id.to_string(),
        "messageId": message_id.to_string(),
    })
    .to_string()
}

/// Unique panel-post nonce. Mirrors `SnowflakeUtil.generate().toString()`
/// in !channel.ts (time-based, unique per post for `enforceNonce`).
pub fn panel_nonce(channel_id: u64, now_ms: u64) -> String {
    format!("{channel_id}-{now_ms}")
}

/// Audit entry for the panel post. Mirrors `client.func.ihorizon_logs`
/// (best-effort, silent when the `ihorizon-logs` channel is missing).
/// No new YAML: exact lang keys with a plain fallback.
pub async fn post_panel_log(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    lang_code: &str,
    author_id: u64,
    channel_id: u64,
) {
    let Ok(channels) = http.get_channels(guild_id).await else {
        return;
    };
    let Some(ch) = channels.iter().find(|c| c.name.contains("ihorizon-logs")) else {
        return;
    };
    let title = crate::lang::get(lang_code, "confession_channel_log_embed_title")
        .unwrap_or_else(|| "Confession".to_string());
    let desc = crate::lang::get(lang_code, "confession_channel_log_embed_desc")
        .map(|s| {
            s.replace("${interaction.user}", &format!("<@{author_id}>"))
                .replace("${channel}", &format!("<#{channel_id}>"))
        })
        .unwrap_or_else(|| format!("<@{author_id}> set the confession channel to <#{channel_id}>"));
    let embed = serenity::CreateEmbed::default()
        .colour(0xbf_0b_b9)
        .title(title)
        .description(desc);
    let _ = ch
        .id
        .send_message(http, serenity::CreateMessage::new().embed(embed))
        .await;
}
/// Exact en-US fallback for `confession_channel_panel_embed_desc` (no YAML touch).
fn panel_desc_fallback() -> String {
    "# **Anonymous Confessions**\n\nClick the button below to open the confession form. You can write what you need to confess. If you wish, you can choose to make your confession private.\nKeep in mind that confessions may not remain anonymous—server owners or anyone with access to confession logs can identify users if logging is enabled.\n\n## **Make a Confession**\n\n*Note: To make your confession private, write the corresponding option in the form.*".to_string()
}

/// Set the confession panel channel. Mirrors !channel.ts.
// Stores CONFESSION.channel, confirms, then posts the panel embed + button
// (honoring button-title) and binds GUILD.CONFESSION.panel.
//
// Both options are required like the TS schema (channel + button-title).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn confession_channel(
    ctx: Ctx<'_>,
    #[description = "The confession channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "The button title"]
    #[rename = "button-title"]
    button_title: String,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let target_id: u64 = channel.id.get();
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "CONFESSION.channel",
        &target_id.to_string(),
    )
    .await?;

    let button_label = panel_button_label(Some(&button_title));

    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "confession_channel_command_work")
        .map(|s| s.replace("${channel?.toString()}", &format!("<#{target_id}>")))
        .unwrap_or_else(|| {
            "The confession panel has been sent to ${channel?.toString()}".to_string()
        });
    ctx.say(msg).await?;

    // Panel post: footer + timestamp + desc with one Secondary button
    // carrying the requested title. No new YAML: exact en-US fallback.
    let (footer_name, footer_icon) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let desc = crate::lang::get(&code, "confession_channel_panel_embed_desc")
        .unwrap_or_else(panel_desc_fallback);
    let embed = crate::commands::shared::embed_with_footer(
        serenity::CreateEmbed::default()
            .colour(CONFESSION_PANEL_COLOR)
            .description(desc)
            .timestamp(serenity::Timestamp::now()),
        &footer_name,
        footer_icon.is_some(),
    );
    let row = serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(
        CONFESSION_PANEL_BUTTON_ID,
    )
    .label(&button_label)
    .style(serenity::ButtonStyle::Secondary)]);
    let mut message = serenity::CreateMessage::new()
        .embed(embed)
        .components(vec![row]);
    // Unique nonce per panel post, like `enforceNonce: true, nonce` in
    // !channel.ts (serenity Nonce has no snowflake generator, so the
    // channel id + millis plays that time-unique role).
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    message = message
        .nonce(serenity::model::channel::Nonce::String(panel_nonce(
            target_id, now_ms,
        )))
        .enforce_nonce(true);
    if let Some(bytes) = footer_icon {
        message = message.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let posted = serenity::ChannelId::new(target_id)
        .send_message(ctx.http(), message)
        .await?;
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "GUILD.CONFESSION.panel",
        &panel_store_json(target_id, posted.id.get()),
    )
    .await?;
    // Audit entry, like `client.func.ihorizon_logs` in !channel.ts.
    if let Some(guild_id) = ctx.guild_id() {
        post_panel_log(
            ctx.http(),
            guild_id,
            &code,
            ctx.author().id.get(),
            target_id,
        )
        .await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn button_label_honors_title() {
        assert_eq!(panel_button_label(None), "+");
        assert_eq!(panel_button_label(Some("")), "+");
        assert_eq!(panel_button_label(Some("Confess")), "Confess");
        let long = "x".repeat(64);
        assert_eq!(panel_button_label(Some(&long)).chars().count(), 32);
    }

    #[test]
    fn panel_ids_and_shape_mirror_ts() {
        assert_eq!(CONFESSION_PANEL_BUTTON_ID, "new-confession-button");
        assert_eq!(CONFESSION_PANEL_COLOR, 0xff_05_aa);
        let raw = panel_store_json(11, 22);
        // panel_target (mod.rs) reads the bound channel + message back.
        assert_eq!(
            super::super::panel_target(Some(&raw), None),
            (Some(11), Some(22))
        );
    }

    #[test]
    fn panel_nonce_is_unique_per_post() {
        let a = panel_nonce(11, 1000);
        assert!(a.contains("11"));
        assert_ne!(a, panel_nonce(11, 1001));
        assert_ne!(a, panel_nonce(22, 1000));
    }
}

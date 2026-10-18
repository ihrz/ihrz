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
///
/// Intentional cut difference (kept): TS `substring` cuts UTF-16 code
/// units and can split a surrogate pair; Rust cuts `char`s instead, so
/// astral-plane characters (emoji) stay whole. Same 32-unit budget for
/// BMP text, strictly safer outside it.
pub fn panel_button_label(input: Option<&str>) -> String {
    input
        .map(|t| t.chars().take(32).collect::<String>())
        .filter(|t| !t.is_empty())
        .unwrap_or_else(|| "+".to_string())
}

/// Prefix arg-count gate. Mirrors the TS framework `checkCommandArgs`
/// counts-first behavior prod enforces on `+confess-channel` (HZ93
/// live: bare AND single-token inputs both answer the caret usage
/// embed, caret on `channel` / `button-title` respectively). Without
/// it, poise `Option<GuildChannel>` backtracking feeds a lone channel
/// mention into `button_title` while `channel` falls back to the
/// invoking channel — posting a mislabeled panel in the wrong channel
/// (HZ93: button label `<#id>`, target = wave channel).
pub fn confession_prefix_complete(tokens: &[String]) -> bool {
    tokens.len() >= 2
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
        .unwrap_or_else(|| "SetChannel Confession Module".to_string());
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
///
/// Both slash options are `required: true` in the TS schema, and the
/// prefix caret framework enforces the same: a missing button title on
/// prefix answers the caret usage embed (observed live on prod:
/// `+confess-channel [channel] [string]`, caret on `string`), never the
/// `|| "+"` fallback. The fallback only exists inside the TS handler
/// for the slash-object path, which Discord's required-option gate
/// makes unreachable. So `button_title` is a required poise param:
/// slash registers it required (TS-exact) and a missing prefix title
/// fails arg-parse before this body, letting the central dispatcher
/// render the caret usage embed like every other required leaf
/// (set-cooldown, balance-add, ...). `channel` stays Option: TS prefix
/// falls back to the invoking channel (`|| interaction.channel`).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    aliases("confess-channel"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Définir le canal du module confession"),
    description_localized("ja", "告白モジュールのチャンネルを設定！"),
    description_localized("ru", "Установить канал модуля признаний!"),
    description_localized("es-ES", "Establecer el canal del módulo de confesiones!")
)]
pub async fn confession_channel(
    ctx: Ctx<'_>,
    #[description = "The confession channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
    #[description = "The button title"]
    #[rename = "button-title"]
    button_title: String,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    // Prefix checkCommandArgs head (see confession_prefix_complete):
    // fewer than 2 raw tokens answers the caret usage embed like prod,
    // before poise Option backtracking can misroute the mention into
    // `button_title` and post into the invoking channel.
    if let poise::Context::Prefix(pctx) = ctx {
        let tokens = crate::bot::prefix_args::split_caret_args(pctx.args);
        if !confession_prefix_complete(&tokens) {
            crate::bot::prefix_usage_denial(ctx, None).await;
            return Ok(());
        }
    }
    let pool = &ctx.data().pool;
    // TS `interaction.options.getChannel("channel")` (slash, required)
    // vs parsed-or-current channel (prefix). No new YAML: the slash
    // usage hints below are plain fallbacks.
    let is_prefix = matches!(ctx, poise::Context::Prefix(_));
    let target_id: u64 = match channel.map(|c| c.id.get()) {
        Some(id) => id,
        None if is_prefix => ctx.channel_id().get(),
        None => {
            ctx.say("Please provide a channel.").await?;
            return Ok(());
        }
    };
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "CONFESSION.channel",
        &target_id.to_string(),
    )
    .await?;

    let button_label = panel_button_label(Some(button_title.as_str()));

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
    // Unique nonce per panel post: discord.js `SnowflakeUtil.generate()`
    // (shared helper — Discord caps nonces at 25 chars).
    message = message
        .nonce(serenity::model::channel::Nonce::String(
            crate::commands::shared::snowflake_nonce(),
        ))
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
    fn button_title_is_required_like_ts_schema() {
        // TS confession.ts marks BOTH options `required: true`, and the
        // live prod caret framework enforces it on prefix too
        // (`+confess-channel [channel] [string]`, caret on `string`,
        // WAVE-20261014m pair 525). A missing prefix title must fail
        // arg-parse into the central caret usage embed, never fall back
        // to "+" and post a panel.
        let cmd = confession_channel();
        let title = cmd
            .parameters
            .iter()
            .find(|p| p.name == "button-title")
            .expect("button-title param");
        assert!(title.required);
        // `channel` stays optional: TS prefix falls back to the
        // invoking channel (`|| interaction.channel`).
        let channel = cmd
            .parameters
            .iter()
            .find(|p| p.name == "channel")
            .expect("channel param");
        assert!(!channel.required);
    }

    #[test]
    fn panel_nonce_is_unique_per_post() {
        use crate::commands::shared::snowflake_nonce;
        let a = snowflake_nonce();
        // Snowflake shape: numeric, ≤ 25 chars (Discord nonce cap).
        assert!(a.len() <= 25);
        assert!(a.chars().all(|c| c.is_ascii_digit()));
        // Sequence bits: back-to-back calls still differ.
        assert_ne!(a, snowflake_nonce());
        assert_ne!(a, snowflake_nonce());
    }

    #[test]
    fn prefix_gate_needs_both_args() {
        // HZ93: a lone channel mention must NOT run the handler (poise
        // backtracks it into `button_title` and posts into the invoking
        // channel) — prod answers the caret usage embed instead.
        assert!(!confession_prefix_complete(&[]));
        assert!(!confession_prefix_complete(&["<#11>".to_string()]));
        assert!(confession_prefix_complete(&[
            "<#11>".to_string(),
            "title".to_string()
        ]));
    }
}

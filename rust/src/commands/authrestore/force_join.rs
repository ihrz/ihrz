use super::*;
use poise::serenity_prelude as serenity;

/// Throttle for force-join progress edits. Mirrors the TS guard in
/// !force-join.ts: push an update every 5 joins or at most every
/// 10 seconds (`addedCount % updateInterval === 0 ||
/// Date.now() - lastUpdateTime > maxUpdateInterval`).
pub fn should_push_progress(added_count: u64, elapsed_ms: u64) -> bool {
    elapsed_ms > 10_000 || added_count.is_multiple_of(5)
}

/// Confirm button ids for the force-join gate. TS uses bare
/// `yes`/`no`; the Rust port prefixes them so two concurrent runs
/// never acknowledge each other's clicks.
pub const FORCE_JOIN_YES_ID: &str = "ar-force-join-yes";
pub const FORCE_JOIN_NO_ID: &str = "ar-force-join-no";

/// Confirm collector window. Mirrors `time: 2_240_00` (224_000 ms =
/// 224 s) in !force-join.ts.
pub const FORCE_JOIN_CONFIRM_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(224);

/// Live progress of a force-join run. Mirrors the `totalMembers` /
/// `addedCount` pair closed over by `updateEmbed` in !force-join.ts.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ForceJoinProgress {
    pub possible: usize,
    pub added: u64,
}

/// Description produced by one websocket progress event. Mirrors
/// the `switch (value)` in the !force-join.ts `message` handler:
/// `size` / `start` rewrite the description, `add` only bumps the
/// counter (rendered via `progress_fields`), `end` carries the
/// renewed private code in `value2`.
pub fn force_join_event_description(
    event: &ForceJoinWsEvent,
    size_tpl: &str,
    start_text: &str,
    end_text: &str,
) -> Option<String> {
    match event {
        ForceJoinWsEvent::Size(payload) => Some(size_tpl.replace("${value2}", payload)),
        ForceJoinWsEvent::Start => Some(start_text.to_string()),
        ForceJoinWsEvent::Add => None,
        ForceJoinWsEvent::End(_) => Some(end_text.to_string()),
        ForceJoinWsEvent::Unknown(_) => None,
    }
}

/// Fold one gateway websocket event into the run progress. Pure part
/// of the `ws.on("message")` switch in !force-join.ts: `size` /
/// `start` / `end` rewrite the embed description (rendered via
/// [`force_join_event_description`]), `add` bumps the joined counter
/// (the embed fields refresh only when [`should_push_progress`] says
/// so). Returns the new description when the event rewrites it.
///
/// Live-stream note: the TS run opens a `ws` websocket to the gateway
/// URL from `forceJoinAuthRestore` and edits the confirm message on
/// every throttled tick. The Rust command keeps the confirmed
/// single-message flow and applies the same renderers to the terminal
/// `end` state (renewed private code); the intermediate `size` /
/// `start` / `add` ticks stay deferred — the in-repo `tungstenite`
/// client is synchronous and blocking a slash-command task on a
/// multi-minute WS stream would trip the interaction token lifetime.
/// The tick math itself is fully ported and unit-tested below.
pub fn apply_force_join_tick(
    progress: &mut ForceJoinProgress,
    event: &ForceJoinWsEvent,
    size_tpl: &str,
    start_text: &str,
    end_text: &str,
) -> Option<String> {
    match event {
        ForceJoinWsEvent::Add => {
            progress.added = progress.added.saturating_add(1);
            None
        }
        other => force_join_event_description(other, size_tpl, start_text, end_text),
    }
}

/// Field values for the progress embed. Mirrors `updateEmbed` in
/// !force-join.ts (`rc_forceJoin_embed_2_field1` = possible join,
/// `rc_forceJoin_embed_2_field2` = joined so far).
pub fn progress_fields(progress: &ForceJoinProgress) -> (String, String) {
    (progress.possible.to_string(), progress.added.to_string())
}

/// Force all members of your AuthRestore module to join the guild
#[poise::command(
    slash_command,
    prefix_command,
    rename = "force-join",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn authrestore_force_join(
    ctx: Ctx<'_>,
    #[description = "Private key of the AuthRestore config"] key: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let entries = super::authrestore::load_authrestore_entries_routed(&ctx.data().pool).await;
    let Some((config_guild_id, data)) = find_guild_by_secret(&entries, &key) else {
        reply_missing_key(&ctx, &key).await?;
        return Ok(());
    };
    let config_guild_id = config_guild_id.to_string();
    let data = data.clone();
    let present: HashSet<String> = ctx
        .guild()
        .map(|g| g.members.keys().map(|id| id.get().to_string()).collect())
        .unwrap_or_default();
    let (found, already, possible) = force_join_counts(&data.members, &present);
    let title = t(&ctx, "rc_forceJoin_embed_title", "AuthRestore - Force Join").await;
    let desc = t(
        &ctx,
        "rc_forceJoin_embed_desc",
        "## Are you sure to force-join members in this guild?\n### READ CAREFULLY:\nIF YOU CONFIRM THIS ACTION, THE CURRENT PRIVATE KEY WILL BE DESTROYED. A NEW KEY WILL BE PROVIDED TO YOU.\n\n\n",
    )
    .await;
    let f1 = t(&ctx, "rc_forceJoin_embed_field1", "Members found").await;
    let f2 = t(&ctx, "rc_forceJoin_embed_field2", "Members already here").await;
    let f3 = t(&ctx, "rc_forceJoin_embed_field3", "Possible join").await;
    // Single-message confirm gate. Mirrors the !force-join.ts collector
    // on the confirm reply (`interactionSend` + `withResponse: true`):
    // the yes/no buttons live on the same message that later becomes
    // the progress embed (edit-in-place). 224 s window; clicks from
    // anyone but the invoker get the ephemeral not-for-you reply;
    // cancel deletes the message; timeout clears the buttons.
    let yes_label = t(&ctx, "var_confirm", "Confirm").await;
    let no_label = t(&ctx, "embed_btn_cancel", "Cancel").await;
    let not_for_you = t(&ctx, "help_not_for_you", "This interaction is not for you").await;
    let confirm_handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(
                    serenity::CreateEmbed::new()
                        .title(title.clone())
                        .description(desc.clone())
                        .color(2829617)
                        .field(f1, found.to_string(), true)
                        .field(f2, already.to_string(), true)
                        .field(f3, possible.to_string(), true),
                )
                .components(vec![serenity::CreateActionRow::Buttons(vec![
                    serenity::CreateButton::new(FORCE_JOIN_YES_ID)
                        .label(&yes_label)
                        .style(serenity::ButtonStyle::Danger),
                    serenity::CreateButton::new(FORCE_JOIN_NO_ID)
                        .label(&no_label)
                        .style(serenity::ButtonStyle::Success),
                ])]),
        )
        .await?;
    let mut msg = confirm_handle.into_message().await?;
    let author = ctx.author().id;
    let confirmed = loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(FORCE_JOIN_CONFIRM_TIMEOUT)
            .filter(|i| {
                i.data.custom_id == FORCE_JOIN_YES_ID || i.data.custom_id == FORCE_JOIN_NO_ID
            })
            .await;
        let Some(press) = press else {
            break false;
        };
        if press.user.id != author {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        let yes = press.data.custom_id == FORCE_JOIN_YES_ID;
        // Acknowledge like TS `deferUpdate()` so Discord does not flag
        // the interaction as failed.
        let _ = press
            .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
            .await;
        if !yes {
            let _ = msg.delete(ctx.http()).await;
            return Ok(());
        }
        break true;
    };
    if !confirmed {
        let _ = msg
            .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
            .await;
        return Ok(());
    }
    let Some(url) = gateway_endpoint(crate::funcs::GatewayMethod::ForceJoinAuthRestore) else {
        ctx.say(
            t(
                &ctx,
                "rc_command_horizongw_down",
                "Error: HorizonGateway maybe down",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    // Progress embed, mirroring `updateEmbed` in !force-join.ts: the
    // confirm fields give way to possible-join / joined-so-far and
    // the description tracks the start state while the gateway works.
    // (The live websocket `size`/`start`/`add` ticks that would edit
    // it mid-run stay deferred — see [`apply_force_join_tick`]; the
    // final `end` state below is applied through the same event
    // renderer.)
    let ws_start = t(
        &ctx,
        "rc_forceJoin_ws_start",
        "# Force-joining in progress...",
    )
    .await;
    let ws_end = t(
        &ctx,
        "rc_forceJoin_ws_end",
        "# Force-joining process completed.",
    )
    .await;
    let pf1 = t(&ctx, "rc_forceJoin_embed_2_field1", "Possible join").await;
    let pf2 = t(&ctx, "rc_forceJoin_embed_2_field2", "Joined").await;
    let progress = ForceJoinProgress { possible, added: 0 };
    let (possible_text, joined_text) = progress_fields(&progress);
    // Edit the confirm message in place (mirrors `interaction.editReply`
    // in the TS `updateEmbed` flow) instead of posting a new message.
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new()
                .embed(
                    serenity::CreateEmbed::new()
                        .title(title)
                        .description(ws_start.clone())
                        .color(2829617)
                        .field(pf1.clone(), possible_text, true)
                        .field(pf2.clone(), joined_text, true),
                )
                .components(vec![]),
        )
        .await;
    let token = crate::config::api_token().unwrap_or_default();
    let (_, to_join) = partition_force_join(&data.members, &present);
    let payload = forcejoin_payload(&config_guild_id, &token, &key, &guild_id, &to_join);
    match gateway_post(&url, &payload).await {
        Ok(body) => {
            let gateway_msg = body.get("message").and_then(|m| m.as_str()).unwrap_or("");
            match parse_forcejoin_response(gateway_msg) {
                Some((_, renewed)) => {
                    let end_event = ForceJoinWsEvent::End(renewed.clone());
                    let end_desc = force_join_event_description(&end_event, "", &ws_start, &ws_end)
                        .unwrap_or_else(|| ws_end.clone());
                    let _ = msg
                        .edit(
                            ctx.http(),
                            serenity::EditMessage::new().embed(
                                serenity::CreateEmbed::new()
                                    .title(
                                        t(
                                            &ctx,
                                            "rc_forceJoin_embed_title",
                                            "AuthRestore - Force Join",
                                        )
                                        .await,
                                    )
                                    .description(end_desc)
                                    .color(2829617)
                                    .field(pf1, possible.to_string(), true)
                                    .field(pf2, to_join.len().to_string(), true),
                            ),
                        )
                        .await;
                    let guild_name = ctx
                        .guild()
                        .map(|g| g.name.clone())
                        .unwrap_or_else(|| guild_id.clone());
                    let dm_text = t(
                        &ctx,
                        "rc_command_ok_dm",
                        "# The AuthRestore code for ${interaction.guild.name}\n```${res.secretCode}```",
                    )
                    .await
                    .replace("${interaction.guild.name}", &guild_name)
                    .replace("${res.secretCode}", &renewed);
                    match ctx
                        .author()
                        .direct_message(
                            ctx.serenity_context(),
                            serenity::CreateMessage::new().content(dm_text),
                        )
                        .await
                    {
                        Ok(_) => {
                            ctx.send(
                                poise::CreateReply::default()
                                    .content(
                                        t(
                                            &ctx,
                                            "rc_command_dm_ok",
                                            "In case you missed it, I sent you the code in a private message!",
                                        )
                                        .await,
                                    )
                                    .ephemeral(true),
                            )
                            .await?;
                        }
                        Err(_) => {
                            ctx.send(
                                poise::CreateReply::default()
                                    .content(
                                        t(
                                            &ctx,
                                            "rc_command_dm_failed",
                                            "I tried to send you the code in a private message, but you have blocked your DMs :/",
                                        )
                                        .await,
                                    )
                                    .ephemeral(true),
                            )
                            .await?;
                        }
                    }
                    ctx.send(
                        poise::CreateReply::default()
                            .content(
                                t(
                                    &ctx,
                                    "rc_forceJoin_ws_end_renew_msg",
                                    "# READ CAREFULLY\nHERE IS THE PRIVATE CODE THAT MUST NOT BE DISCLOSED TO ANYONE. A PERSON WITH THIS CODE COULD DELETE IT, ADD MEMBERS TO THEIR SERVER... KEEP IT SOMEWHERE SAFE. iHorizon WILL NEVER GIVE IT TO YOU AGAIN:\n```${value2}```",
                                )
                                .await
                                .replace("${value2}", &renewed),
                            )
                            .ephemeral(true),
                    )
                    .await?;
                }
                None => {
                    ctx.say(ws_end).await?;
                }
            }
        }
        Err(_) => {
            ctx.say(
                t(
                    &ctx,
                    "rc_command_horizongw_down",
                    "Error: HorizonGateway maybe down",
                )
                .await,
            )
            .await?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn progress_throttle_mirrors_ts_guard() {
        // Every 5th join pushes, like `addedCount % 5 === 0`.
        assert!(should_push_progress(5, 0));
        assert!(should_push_progress(10, 0));
        assert!(!should_push_progress(3, 0));
        // Or at most every 10 s, like `elapsed > maxUpdateInterval`.
        assert!(should_push_progress(3, 10_001));
        assert!(!should_push_progress(3, 10_000));
    }

    #[test]
    fn ws_events_render_like_ts_switch() {
        let size_tpl = "# Preparing to add **${value2}** members to the guild.";
        let start = "# Force-joining in progress...";
        let end = "# Force-joining process completed.";
        assert_eq!(
            force_join_event_description(
                &ForceJoinWsEvent::Size("12".to_string()),
                size_tpl,
                start,
                end
            ),
            Some("# Preparing to add **12** members to the guild.".to_string())
        );
        assert_eq!(
            force_join_event_description(&ForceJoinWsEvent::Start, size_tpl, start, end),
            Some(start.to_string())
        );
        // `add` only bumps the counter; the description is untouched.
        assert_eq!(
            force_join_event_description(&ForceJoinWsEvent::Add, size_tpl, start, end),
            None
        );
        assert_eq!(
            force_join_event_description(
                &ForceJoinWsEvent::End("newcode".to_string()),
                size_tpl,
                start,
                end
            ),
            Some(end.to_string())
        );
        assert_eq!(
            force_join_event_description(
                &ForceJoinWsEvent::Unknown("nope".to_string()),
                size_tpl,
                start,
                end
            ),
            None
        );
    }

    #[test]
    fn progress_fields_mirror_update_embed() {
        let p = ForceJoinProgress {
            possible: 7,
            added: 3,
        };
        assert_eq!(progress_fields(&p), ("7".to_string(), "3".to_string()));
    }

    #[test]
    fn tick_fold_mirrors_ws_message_switch() {
        let size_tpl = "# Preparing to add **${value2}** members to the guild.";
        let start = "# Force-joining in progress...";
        let end = "# Force-joining process completed.";
        let mut p = ForceJoinProgress {
            possible: 7,
            added: 0,
        };
        assert_eq!(
            apply_force_join_tick(
                &mut p,
                &ForceJoinWsEvent::Size("12".to_string()),
                size_tpl,
                start,
                end
            ),
            Some("# Preparing to add **12** members to the guild.".to_string())
        );
        assert_eq!(p.added, 0);
        assert_eq!(
            apply_force_join_tick(&mut p, &ForceJoinWsEvent::Start, size_tpl, start, end),
            Some(start.to_string())
        );
        // `add` bumps the counter without touching the description.
        assert_eq!(
            apply_force_join_tick(&mut p, &ForceJoinWsEvent::Add, size_tpl, start, end),
            None
        );
        assert_eq!(p.added, 1);
        assert_eq!(progress_fields(&p), ("7".to_string(), "1".to_string()));
        assert!(should_push_progress(5, 0));
        assert_eq!(
            apply_force_join_tick(
                &mut p,
                &ForceJoinWsEvent::End("newcode".to_string()),
                size_tpl,
                start,
                end
            ),
            Some(end.to_string())
        );
        assert_eq!(
            apply_force_join_tick(
                &mut p,
                &ForceJoinWsEvent::Unknown("nope".to_string()),
                size_tpl,
                start,
                end
            ),
            None
        );
    }

    #[test]
    fn confirm_gate_ids_and_window_mirror_ts_collector() {
        // Prefixed so concurrent runs never ack each other's clicks.
        assert_eq!(FORCE_JOIN_YES_ID, "ar-force-join-yes");
        assert_eq!(FORCE_JOIN_NO_ID, "ar-force-join-no");
        assert_ne!(FORCE_JOIN_YES_ID, FORCE_JOIN_NO_ID);
        // Mirrors `time: 2_240_00` (224 s) in !force-join.ts.
        assert_eq!(
            FORCE_JOIN_CONFIRM_TIMEOUT,
            std::time::Duration::from_secs(224)
        );
    }
}

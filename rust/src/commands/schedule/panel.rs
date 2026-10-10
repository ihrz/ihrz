use super::schedule::{
    guided_choice_of, guided_create, guided_delete, guided_delete_all, guided_list, guided_menu,
    GuidedChoice, GUIDED_MENU_ID, GUIDED_MENU_TIMEOUT_SECS,
};
use super::*;

/// Guided schedule panel (TS `schedule.ts` parity).
// This leaf holds the select-menu flow that used to live in the
// `schedule` parent body: the parent carries `subcommand_required`,
// so a bare `!schedule` raises SubcommandRequired (mapped to help in
// `bot.rs`) and the parent body never runs. Reach the panel via
// `/schedule panel` or `!schedule panel`.
#[poise::command(slash_command, prefix_command, rename = "panel")]
pub async fn schedule_panel(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let pool = ctx.data().pool.clone();
    let lang_code = crate::db::guild_lang(&pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&lang_code, k).unwrap_or_else(|| fb.to_string());
    let author = ctx.author().id;
    let author_mention = ctx.author().to_string();
    let labels = [
        t("schedule_menu_choice_0", "Create Schedule"),
        t("schedule_menu_choice_1", "Delete Schedule"),
        t("schedule_menu_choice_2", "Delete All Schedules"),
        t("schedule_menu_choice_3", "List All Schedules"),
    ];
    let menu = guided_menu(
        &t("schedule_menu_placeholder", "What do you want to do?"),
        [
            labels[0].as_str(),
            labels[1].as_str(),
            labels[2].as_str(),
            labels[3].as_str(),
        ],
    );
    let menu_row = || serenity::CreateActionRow::SelectMenu(menu.clone());
    let not_for_you = t(
        "embed_interaction_not_for_you",
        "This interaction is not for you",
    );
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .content(author_mention.clone())
                .components(vec![menu_row()]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    // Menu collector, author-gated like the TS filter
    // (`time: 420_000`).
    let deadline =
        std::time::Instant::now() + std::time::Duration::from_secs(GUIDED_MENU_TIMEOUT_SECS);
    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if press.data.custom_id != GUIDED_MENU_ID {
            continue;
        }
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
        let value = match &press.data.kind {
            serenity::ComponentInteractionDataKind::StringSelect { values } => {
                values.first().cloned().unwrap_or_default()
            }
            _ => continue,
        };
        match guided_choice_of(&value) {
            Some(GuidedChoice::Create) => {
                guided_create(&ctx, &press, &lang_code, &author_mention).await?;
            }
            Some(GuidedChoice::Delete) => {
                guided_delete(&ctx, &press, &lang_code).await?;
            }
            Some(GuidedChoice::DeleteAll) => {
                guided_delete_all(
                    &ctx,
                    &press,
                    &mut msg,
                    &lang_code,
                    &menu,
                    &menu_row(),
                    &author_mention,
                    &not_for_you,
                )
                .await?;
            }
            Some(GuidedChoice::List) => {
                guided_list(&ctx, &press, &lang_code, &menu, &menu_row()).await?;
            }
            None => continue,
        }
    }
    // Timeout-disable like the TS collector `end` handler.
    let dead = menu.clone().disabled(true);
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new()
                .components(vec![serenity::CreateActionRow::SelectMenu(dead)]),
        )
        .await;
    Ok(())
}

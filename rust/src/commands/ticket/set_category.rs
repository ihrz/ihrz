use super::*;
use poise::serenity_prelude as serenity;

/// Embed description for the set-category confirm: category + actor slots.
/// Mirrors !set-category.ts:84-107 (cyan embed + footer + footer
/// attachment file, no title).
pub fn setcategory_desc(template: &str, category_name: &str, author_id: u64) -> String {
    template
        .replace("${category.name}", category_name)
        .replace("${interaction.user.id}", &author_id.to_string())
}

/// Default ticket category (TS !set-category.ts).
//
// The slash option is the raw `category-name` channel picker (no
// picker-type filter, like TS `getChannel("category-name", true)`);
// the `not_a_category` branch rejects anything that is not a
// category channel. A missing/unresolvable prefix arg is `None` and
// hits the same branch (TS resolves `null`, which is not
// `instanceof CategoryChannel` either).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-category",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_set_category(
    ctx: Ctx<'_>,
    #[description = "Category"]
    #[rename = "category-name"]
    category: Option<serenity::Channel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors !set-category.ts: disable guard, then the picked channel
    // must be a category channel (prefix resolves id or <#mention>).
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    let not_category_msg = || {
        crate::lang::get(&code, "setticketcategory_not_a_category").unwrap_or_else(|| {
            "The channel specified is not a category, please try again.".to_string()
        })
    };
    let Some((cat_id, cat_name)) = (match category.as_ref() {
        Some(serenity::Channel::Guild(gc)) if gc.kind == serenity::ChannelType::Category => {
            Some((gc.id, gc.name.clone()))
        }
        _ => None,
    }) else {
        ctx.say(not_category_msg()).await?;
        return Ok(());
    };
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "GUILD.TICKET.category",
        &cat_id.get().to_string(),
    )
    .await?;
    let desc = setcategory_desc(
        &crate::lang::get(&code, "setticketcategory_command_work")
            .unwrap_or_else(|| "Ticket category set.".to_string()),
        &cat_name,
        ctx.author().id.get(),
    );
    let http = ctx.serenity_context().http.clone();
    let (footer_name, footer_icon) = ticket_footer(&http, pool, &gid).await;
    let embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(0x00FFFF_u32)
            .description(desc),
        &footer_name,
        footer_icon.is_some(),
    );
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(icon) = footer_icon {
        reply = reply.attachment(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn desc_fills_category_and_actor() {
        let out = setcategory_desc(
            "<@${interaction.user.id}> -> `${category.name}`!",
            "Help",
            7,
        );
        assert_eq!(out, "<@7> -> `Help`!");
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn category_flag_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::commands::owner::main::routed_set(&pool, "g", "g", "GUILD.TICKET.category", "123")
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.TICKET.category")
                .await
                .as_deref(),
            Some("123")
        );
        assert!(tbl_get_value(&pool, "g", "GUILD.TICKET.category")
            .await
            .is_some());
    }
}

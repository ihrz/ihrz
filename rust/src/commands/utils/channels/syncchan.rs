use super::*;

/// Sync a category's overwrites to its children. Mirrors !sync.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "sync",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn syncchan(
    ctx: Ctx<'_>,
    #[description = "Category"] category: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let Some(cat) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&category.id).cloned())
    else {
        return Ok(());
    };
    let overwrites = cat.permission_overwrites.clone();
    let children: Vec<poise::serenity_prelude::ChannelId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .filter(|c| c.parent_id == Some(category.id))
                .map(|c| c.id)
                .collect()
        })
        .unwrap_or_default();
    let mut n = 0;
    for child in children {
        let mut ok = true;
        for ow in &overwrites {
            if child
                .create_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwrite {
                        allow: ow.allow,
                        deny: ow.deny,
                        kind: ow.kind,
                    },
                )
                .await
                .is_err()
            {
                ok = false;
            }
        }
        if ok {
            n += 1;
        }
    }
    ctx.say(format!("Synced {n} channels.")).await?;
    Ok(())
}

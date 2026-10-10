use crate::bot::{Ctx, Data};
use crate::commands::shared::{
    build_awesome_embed, AwesomeHelpInput, HelpOptionDoc, HelpSubcommandDoc,
};
use crate::commands::utils::{embed_with_footer, footer_parts};

/// Fill the help_tip_embed template. Mirrors the TS replaceAll chain in
/// help.ts (username, Pin, category count, slash count, Crown, both
/// owners, VC_Region, Slash_Bot_Badge). Delta (documented): the TS
/// `${client.content.filter(...).length}` placeholder receives the full
/// command count (the TS code passes `client.content.length` there), so
/// `slash_total` is the total registered commands, like TS.
#[allow(clippy::too_many_arguments)]
pub fn render_help_tip(
    template: &str,
    username: &str,
    pin: &str,
    crown: &str,
    badge: &str,
    region: &str,
    owner1: &str,
    owner2: &str,
    categories: usize,
    slash_total: usize,
) -> String {
    template
        .replace("${client.user?.username}", username)
        .replace("${client.iHorizon_Emojis.Pin}", pin)
        .replace("${categories.length}", &categories.to_string())
        .replace("${client.iHorizon_Emojis.Slash_Bot_Badge}", badge)
        .replace(
            "${client.content.filter(c => c.messageCmd === false).length}",
            &slash_total.to_string(),
        )
        .replace("${client.iHorizon_Emojis.Crown}", crown)
        .replace("${config.owner.ownerid1}", owner1)
        .replace("${config.owner.ownerid2}", owner2)
        .replace("${client.iHorizon_Emojis.VC_Region}", region)
}

/// Category rollup for the overview counts. Mirrors the TS category
/// loop (commands grouped by category, categories sorted by name).
/// Poise has no localized category names, so sorting is by the raw
/// category key (TS sorts by the localized placeholder instead).
pub fn help_category_counts<'a>(
    categories: impl Iterator<Item = Option<&'a str>>,
) -> Vec<(String, usize)> {
    let mut counts: std::collections::BTreeMap<String, usize> = Default::default();
    for cat in categories {
        *counts.entry(cat.unwrap_or("misc").to_string()).or_default() += 1;
    }
    counts.into_iter().collect()
}

/// Searchable command node (name + aliases + nested subcommands).
/// Implemented for poise commands at the call site boundary so the
/// lookup stays unit-testable without constructing framework types.
pub trait HelpNode {
    fn node_name(&self) -> &str;
    fn node_aliases(&self) -> &[String];
    fn node_children(&self) -> &[Self]
    where
        Self: Sized;
}

impl<T, E> HelpNode for poise::Command<T, E> {
    fn node_name(&self) -> &str {
        &self.name
    }
    fn node_aliases(&self) -> &[String] {
        &self.aliases
    }
    fn node_children(&self) -> &[Self] {
        &self.subcommands
    }
}

/// Find a command by name or alias, searching top-level nodes then one
/// level of children. Mirrors the TS
/// `client.commands.get(target) || client.message_commands.get(target)`
/// lookup (exact match).
pub fn find_help_command<'a, N: HelpNode>(nodes: &'a [N], target: &str) -> Option<&'a N> {
    for node in nodes {
        if node.node_name() == target || node.node_aliases().iter().any(|a| a == target) {
            return Some(node);
        }
        for sub in node.node_children() {
            if sub.node_name() == target || sub.node_aliases().iter().any(|a| a == target) {
                return Some(sub);
            }
        }
    }
    None
}

fn help_options(cmd: &poise::Command<Data, anyhow::Error>) -> Vec<HelpOptionDoc> {
    cmd.parameters
        .iter()
        .map(|pm| HelpOptionDoc {
            name: pm.name.clone(),
            choices: pm.choices.iter().map(|c| c.name.clone()).collect(),
            required: pm.required,
        })
        .collect()
}

/// Static category page. Nearest viable to one TS select-menu page:
/// every command in the named category (case-insensitive) as
/// `name — description` lines in a single embed, footer attached.
/// Returns None when `target` matches no category. Capped at 25 rows
/// (embed field limit) with a "+N more" tail instead of buttons.
async fn render_help_category(
    ctx: &Ctx<'_>,
    target: &str,
    footer_name: &str,
    with_icon: bool,
) -> Option<poise::serenity_prelude::CreateEmbed> {
    let needle = target.trim().to_ascii_lowercase();
    let framework = ctx.framework();
    let commands = &framework.options().commands;
    let known = commands
        .iter()
        .filter_map(|c| c.category.as_deref())
        .any(|c| c.eq_ignore_ascii_case(&needle));
    if !known {
        return None;
    }
    let prefix = crate::db::guild_prefix(
        &ctx.data().pool,
        ctx.guild_id().map(|g| g.get()),
        &ctx.data().config.prefix,
    )
    .await;
    let mut rows: Vec<String> = commands
        .iter()
        .filter(|c| {
            c.category
                .as_deref()
                .is_some_and(|c| c.eq_ignore_ascii_case(&needle))
        })
        .map(|c| {
            let desc = c.description.clone().unwrap_or_default();
            let short = desc.chars().take(80).collect::<String>();
            format!("`{prefix}{}` — {short}", c.name)
        })
        .collect();
    rows.sort();
    let overflow = rows.len().saturating_sub(25);
    rows.truncate(25);
    let mut desc = rows.join("\n");
    if overflow > 0 {
        desc.push_str(&format!("\n... +{overflow} more"));
    }
    Some(embed_with_footer(
        poise::serenity_prelude::CreateEmbed::default()
            .colour(0x001EFF_u32)
            .title(needle)
            .description(desc),
        footer_name,
        with_icon,
    ))
}

/// Get a list of all the commands!
// Without a name renders the tip embed (category/slash counts, footer
// + icon attachment, search content line); with a command name renders
// the per-command awesomeEmbed or the unreachable notice; with a
// CATEGORY name renders that category's command list (nearest viable
// to the TS category select menu). Mirrors
// src/Interaction/HybridCommands/bot/help.ts (category `bot`,
// optional `command-name` option). Delta: the interactive category
// select menus + button pagination (840s collector, disable-on-end)
// have no component-dispatch hook in this port, so the overview and
// category views are static (no buttons, no collectors).
#[poise::command(slash_command, prefix_command, category = "bot", rename = "help")]
pub async fn help(
    ctx: Ctx<'_>,
    #[description = "The command name you want information"] command_name: Option<String>,
) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let gid = ctx.guild_id().map(|g| g.get());
    let gid_str = gid.map(|g| g.to_string()).unwrap_or_default();
    let code = crate::db::guild_lang(pool, gid).await;
    let t = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let (footer_name, icon) = footer_parts(&ctx, &gid_str).await;
    let with_icon = icon.is_some();
    let mut reply = poise::CreateReply::default();

    if let Some(target) = command_name.as_deref() {
        let framework = ctx.framework();
        if let Some(found) = find_help_command(&framework.options().commands, target) {
            // TS picks the `fr` description when the guild lang starts with `fr-`.
            let description = if code.starts_with("fr-") {
                found
                    .description_localizations
                    .get("fr")
                    .cloned()
                    .unwrap_or_else(|| found.description.clone().unwrap_or_default())
            } else {
                found.description.clone().unwrap_or_default()
            };
            let base_permission =
                crate::lang::permission_names(&code, found.default_member_permissions.bits())
                    .unwrap_or_default();
            let custom_perms =
                crate::commands::guildconfig::load_cmd_perms(pool, &gid_str, &found.name).await;
            let input = AwesomeHelpInput {
                command_name: found.name.clone(),
                prefix_name: None,
                description,
                aliases: found.aliases.clone(),
                base_permission,
                custom_perms: custom_perms.as_ref(),
                options: help_options(found),
                subcommands: found
                    .subcommands
                    .iter()
                    .map(|s| HelpSubcommandDoc {
                        name: s.name.clone(),
                        prefix_name: None,
                        aliases: s.aliases.clone(),
                        options: help_options(s),
                    })
                    .collect(),
                prefix: crate::db::guild_prefix(pool, gid, &ctx.data().config.prefix).await,
                title_template: t(
                    "hybridcommands_embed_help_title",
                    "${commandName} Help Embed",
                ),
                fields_value_template: t(
                    "hybridcommands_embed_help_fields_value",
                    "**Aliases:** ${aliases}\n**Use:** ${use}",
                ),
                usage_label: t("var_usage", "Usage"),
                permission_label: t("var_permission", "Permission"),
                aliases_label: t("var_aliases", "Aliases"),
                none_label: t("setjoinroles_var_none", "None"),
                footer_text: footer_name.clone(),
            };
            let embed = embed_with_footer(build_awesome_embed(&input), &footer_name, with_icon);
            reply = reply.embed(embed);
        } else if let Some(cat_embed) =
            render_help_category(&ctx, target, &footer_name, with_icon).await
        {
            // Category-name hit: static stand-in for the TS select-menu
            // category page (command rows, no pagination buttons).
            reply = reply.embed(cat_embed);
        } else {
            let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
                .await
                .unwrap_or_default();
            reply = reply.content(format!(
                "{no} | {}",
                t("var_unreachable_command", "Command not found")
            ));
        }
    } else {
        let framework = ctx.framework();
        let commands = &framework.options().commands;
        let cats = help_category_counts(commands.iter().map(|c| c.category.as_deref()));
        let username = ctx.serenity_context().cache.current_user().name.clone();
        let mut owners: Vec<u64> = framework.options().owners.iter().map(|o| o.get()).collect();
        owners.sort_unstable();
        let owner1 = owners.first().map(|o| o.to_string()).unwrap_or_default();
        let owner2 = owners.get(1).map(|o| o.to_string()).unwrap_or_default();
        let pin = crate::emojis::app_emoji_markup(ctx.http(), "Pin")
            .await
            .unwrap_or_default();
        let crown = crate::emojis::app_emoji_markup(ctx.http(), "Crown")
            .await
            .unwrap_or_default();
        let badge = crate::emojis::app_emoji_markup(ctx.http(), "Slash_Bot_Badge")
            .await
            .unwrap_or_default();
        let region = crate::emojis::app_emoji_markup(ctx.http(), "VC_Region")
            .await
            .unwrap_or_default();
        let search = crate::emojis::app_emoji_markup(ctx.http(), "Search")
            .await
            .unwrap_or_default();
        let desc = render_help_tip(
            &t("help_tip_embed", "Help"),
            &username,
            &pin,
            &crown,
            &badge,
            &region,
            &owner1,
            &owner2,
            cats.len(),
            commands.len(),
        );
        let embed = embed_with_footer(
            poise::serenity_prelude::CreateEmbed::default()
                .colour(0x001EFF_u32)
                .description(desc),
            &footer_name,
            with_icon,
        );
        reply = reply
            .embed(embed)
            .content(format!("> {search}  **https://www.ihorizon.org/search/**"));
    }

    if let Some(bytes) = icon {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tip_replaces_all_placeholders() {
        let out = render_help_tip(
            "${client.user?.username} ${categories.length} ${client.content.filter(c => c.messageCmd === false).length} ${config.owner.ownerid1}/${config.owner.ownerid2} ${client.iHorizon_Emojis.Pin}${client.iHorizon_Emojis.Crown}${client.iHorizon_Emojis.Slash_Bot_Badge}${client.iHorizon_Emojis.VC_Region}",
            "Bot",
            "P",
            "C",
            "B",
            "R",
            "1",
            "2",
            4,
            9,
        );
        assert_eq!(out, "Bot 4 9 1/2 PCBR");
    }

    #[test]
    fn counts_group_and_sort() {
        let cats = help_category_counts([Some("tts"), None, Some("bot"), Some("bot")].into_iter());
        assert_eq!(
            cats,
            vec![
                ("bot".to_string(), 2),
                ("misc".to_string(), 1),
                ("tts".to_string(), 1),
            ]
        );
    }

    struct Node {
        name: &'static str,
        aliases: Vec<String>,
        children: Vec<Node>,
    }

    impl HelpNode for Node {
        fn node_name(&self) -> &str {
            self.name
        }
        fn node_aliases(&self) -> &[String] {
            &self.aliases
        }
        fn node_children(&self) -> &[Self] {
            &self.children
        }
    }

    #[test]
    fn lookup_matches_name_alias_and_subcommand() {
        let nodes = vec![Node {
            name: "tts",
            aliases: vec!["t".to_string()],
            children: vec![Node {
                name: "ttsjoin",
                aliases: vec![],
                children: vec![],
            }],
        }];
        assert_eq!(find_help_command(&nodes, "tts").unwrap().name, "tts");
        assert_eq!(find_help_command(&nodes, "t").unwrap().name, "tts");
        assert_eq!(
            find_help_command(&nodes, "ttsjoin").unwrap().name,
            "ttsjoin"
        );
        assert!(find_help_command(&nodes, "nope").is_none());
    }
}

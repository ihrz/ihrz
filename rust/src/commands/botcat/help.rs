use crate::bot::{Ctx, Data};
use crate::commands::shared::{
    build_awesome_embed, prefix_name_for, AwesomeHelpInput, HelpOptionDoc, HelpSubcommandDoc,
};
use crate::commands::utils::{embed_with_footer, footer_parts};

/// Fill the help_tip_embed template. Mirrors the TS replaceAll chain in
/// `HybridCommands/bot/help.ts` (username, Pin, category count, slash
/// count, Crown, both owners, VC_Region, Slash_Bot_Badge).
/// Verdict (kept): the TS `${client.content.filter(...).length}`
/// placeholder receives the full content length there (the TS passes
/// `client.content.length`, help.ts:133-134), so `slash_total` is the
/// leaf count from `content_leaf_count`, like TS.
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
/// Verdict (kept): poise has no localized category names, so sorting
/// is by the raw category key (TS sorts by the localized placeholder
/// instead) — counts per category match regardless of order.
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

/// Find a command by name or alias, searching top-level nodes then
/// nested subcommands at any depth (case-insensitive). Mirrors the TS
/// `client.commands.get(target) || client.message_commands.get(target)`
/// lookup.
pub fn find_help_command<'a, N: HelpNode>(nodes: &'a [N], target: &str) -> Option<&'a N> {
    let target = target.trim();
    fn eq(a: &str, b: &str) -> bool {
        a.eq_ignore_ascii_case(b)
    }
    fn hit<N: HelpNode>(node: &N, target: &str) -> bool {
        eq(node.node_name(), target) || node.node_aliases().iter().any(|a| eq(a, target))
    }
    for node in nodes {
        if hit(node, target) {
            return Some(node);
        }
        let mut stack: Vec<&N> = node.node_children().iter().collect();
        while let Some(sub) = stack.pop() {
            if hit(sub, target) {
                return Some(sub);
            }
            stack.extend(sub.node_children().iter());
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

/// Static category page. Mirrors the TS select-menu category page
/// (`emoji・name` title, category description + color, one field per
/// command as `cmdPrefix` / `-# **┖ desc**`, footer + thumbnail +
/// timestamp). The field build reuses the `legacy::help` pure builders
/// with the same conventions as the overview-path renderer: perms looked
/// up by qualified leaf name, mention-prefix detection via the bot id.
/// Delta (kept): the per-category button pagination
/// (first/previous/next/last, 840s collector, disable-on-end) has no
/// stateless equivalent, so the page shows the first 25 fields with a
/// `+N more` tail instead of buttons.
async fn render_help_category(
    ctx: &Ctx<'_>,
    target: &str,
    code: &str,
    footer_name: &str,
    with_icon: bool,
) -> Option<poise::serenity_prelude::CreateEmbed> {
    use crate::commands::legacy::help as legacy_help;
    let needle = target.trim().to_ascii_lowercase();
    let table: Vec<(&str, &str, &str, &str, u32)> =
        crate::commands::legacy::HELP_CATEGORIES.to_vec();
    let (name, desc_key, placeholder_key, emoji_name, color) = table
        .iter()
        .find(|(n, _, _, _, _)| n.eq_ignore_ascii_case(&needle))
        .copied()?;
    let title_of = |k: &str| crate::lang::get(code, k).unwrap_or_default();
    let framework = ctx.framework();
    let cats = legacy_help::collect_help_leaves(&framework.options().commands, &table, &title_of);
    let show = cats.iter().find(|c| c.name == name)?;
    let pool = &ctx.data().pool;
    let gid = ctx.guild_id().map(|g| g.get());
    let gid_str = gid.map(|g| g.to_string()).unwrap_or_default();
    let prefix = crate::db::guild_prefix(pool, gid, &ctx.data().config.prefix).await;
    let bot_id = ctx
        .serenity_context()
        .cache
        .current_user()
        .id
        .get()
        .to_string();
    let is_mention = !bot_id.is_empty() && prefix.contains(&bot_id);
    let lock = crate::emojis::app_emoji_markup(ctx.http(), "Lock")
        .await
        .unwrap_or_default();
    let unlock = crate::emojis::app_emoji_markup(ctx.http(), "Unlock")
        .await
        .unwrap_or_default();
    let msg_emoji = crate::emojis::app_emoji_markup(ctx.http(), "Message_Commands")
        .await
        .unwrap_or_default();
    let slash_emoji = crate::emojis::app_emoji_markup(ctx.http(), "Slash_Bot_Badge")
        .await
        .unwrap_or_default();
    let mut fields = Vec::with_capacity(show.leaves.len());
    for leaf in &show.leaves {
        let perm = crate::commands::guildconfig::load_cmd_perms(pool, &gid_str, &leaf.qualified)
            .await
            .map(|p| legacy_help::HelpPermState {
                level: p.level.unwrap_or(0),
                roles: p.roles.len(),
                users: p.users.len(),
            });
        let states = legacy_help::help_cmd_states(perm.as_ref(), &lock, &unlock, code);
        let entry = legacy_help::HelpModuleCmd {
            cmd: &leaf.qualified,
            prefix_cmd: Some(&leaf.prefix_cleaned),
            desc: &leaf.desc,
            desc_fr: leaf.desc_fr.as_deref(),
            desc_ja: leaf.desc_ja.as_deref(),
            desc_ru: leaf.desc_ru.as_deref(),
            desc_es: leaf.desc_es.as_deref(),
            message_cmd: leaf.message_cmd,
            perm: None,
        };
        let (n, v, _) = legacy_help::help_module_field(
            leaf.message_cmd,
            &states,
            &entry,
            code,
            &prefix,
            is_mention,
            &msg_emoji,
            &slash_emoji,
        );
        fields.push((n, v));
    }
    let overflow = fields.len().saturating_sub(25);
    fields.truncate(25);
    let markup = crate::emojis::app_emoji_markup(ctx.http(), emoji_name)
        .await
        .unwrap_or_default();
    let mut description = title_of(desc_key);
    if overflow > 0 {
        description.push_str(&format!("\n... +{overflow} more"));
    }
    let mut embed = embed_with_footer(
        poise::serenity_prelude::CreateEmbed::default()
            .colour(color)
            .title(legacy_help::help_module_title(
                &markup,
                &title_of(placeholder_key),
            ))
            .description(description)
            .timestamp(poise::serenity_prelude::Timestamp::now()),
        footer_name,
        with_icon,
    );
    for (n, v) in fields {
        embed = embed.field(n, v, false);
    }
    let embed = if with_icon {
        embed.thumbnail("attachment://footer_icon.png")
    } else {
        embed
    };
    Some(embed)
}

/// Get a list of all the commands!
// Without a name renders the tip embed (category/slash counts, footer
// + icon attachment, search content line); with a command name renders
// the per-command awesomeEmbed or the unreachable notice; with a
// CATEGORY name renders that category's command list (nearest viable
// to the TS category select menu). Mirrors
// src/Interaction/HybridCommands/bot/help.ts (category `bot`,
// optional `command-name` option). Delta: the per-category button
// pagination (first/previous/next/last, 840s collector, disable-on-end)
// has no stateless component-dispatch equivalent, so category pages
// render the first 25 rows with a `+N more` tail instead of buttons.
// The overview selects (`help-menu-1` / `help-menu-2`, back + index
// values) route through `handle_help_component`.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "help",
    description_localized("fr", "Obtenir la liste de toute les commandes"),
    description_localized("ja", "全コマンドのリストを取得！"),
    description_localized("ru", "Получить список всех команд!"),
    description_localized("es-ES", "Obtener una lista de todos los comandos!")
)]
pub async fn help(
    ctx: Ctx<'_>,
    #[description = "The command name you want information"]
    #[description_localized("fr", "La commandes sur laquelle vous voulez des info")]
    #[description_localized("ja", "情報が欲しいコマンド名")]
    #[description_localized("ru", "Имя команды, о которой нужна информация")]
    #[description_localized("es-ES", "El nombre del comando del que quieres información")]
    // TS HybridCommands/bot/help.ts:380 registers "command-name".
    #[rename = "command-name"]
    command_name: Option<String>,
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
    let mut overview = false;
    // Disabled copy of the overview selects for the 840s collector-end
    // task (TS disables components on collector `end`).
    let mut disable_rows: Vec<poise::serenity_prelude::CreateActionRow> = vec![];

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
                prefix_name: prefix_name_for(&found.qualified_name).map(str::to_string),
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
                        prefix_name: prefix_name_for(&s.qualified_name).map(str::to_string),
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
            render_help_category(&ctx, target, &code, &footer_name, with_icon).await
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
            &t("help_tip_embed", "```${client.user?.username} ・ Help Menu```\n${client.iHorizon_Emojis.Pin} ・ **${categories.length}** available Command Categories\n${client.iHorizon_Emojis.Slash_Bot_Badge} ・ **${client.content.filter(c => c.messageCmd === false).length}** available Slash Commands\n${client.iHorizon_Emojis.Crown} ・ **Created by** <@${config.owner.ownerid1}>, <@${config.owner.ownerid2}>\n\n```Do you know ? ・ Tips```\n${client.iHorizon_Emojis.VC_Region} ・ ${client.user?.username} is **100% multilingual**\n${client.iHorizon_Emojis.Slash_Bot_Badge} ・ `/setlang language:Japanese`"),
            &username,
            &pin,
            &crown,
            &badge,
            &region,
            &owner1,
            &owner2,
            cats.len(),
            crate::commands::content_leaf_count(commands),
        );
        let embed = embed_with_footer(
            poise::serenity_prelude::CreateEmbed::default()
                .colour(0x001EFF_u32)
                .description(desc)
                .image(crate::funcs::guild_banner_url(pool, &gid_str).await)
                .timestamp(poise::serenity_prelude::Timestamp::now()),
            &footer_name,
            with_icon,
        );
        let embed = if with_icon {
            embed.thumbnail("attachment://footer_icon.png")
        } else {
            embed
        };
        reply = reply
            .embed(embed)
            .content(format!("> {search}  **https://www.ihorizon.org/search/**"));
        // TS-parity overview rows: name-sorted categories, verbatim
        // `help-menu-1` / `help-menu-2` ids, back first, per-category
        // index values + emoji + command counts. Routed by
        // `handle_help_component` on the overview path.
        let all = crate::commands::all();
        let table: Vec<(&str, &str, &str, &str, u32)> =
            crate::commands::legacy::HELP_CATEGORIES.to_vec();
        let mut cats = crate::commands::legacy::help::collect_help_leaves(&all, &table, &|k| {
            crate::lang::get(&code, k).unwrap_or_default()
        });
        crate::commands::legacy::help::sort_help_leaf_cats_by_name(&mut cats);
        if !cats.is_empty() {
            let rows = crate::commands::legacy::help_main::build_help_overview_rows(
                ctx.http(),
                &code,
                &cats,
            )
            .await;
            if !rows.is_empty() {
                use poise::serenity_prelude::CreateActionRow;
                disable_rows = rows
                    .iter()
                    .map(|r| match r {
                        CreateActionRow::SelectMenu(m) => {
                            CreateActionRow::SelectMenu(m.clone().disabled(true))
                        }
                        _ => r.clone(),
                    })
                    .collect();
                reply = reply.components(rows);
                overview = true;
            }
        }
    }

    if let Some(bytes) = icon {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    let sent = ctx.send(reply).await?;
    if overview {
        // Author gate for the select rows, like `help_main`
        // (DMs skipped: the router only handles guild interactions).
        if let Some(g) = gid {
            let gs = g.to_string();
            if let Ok(msg) = sent.message().await {
                let _ = crate::commands::owner::main::routed_set(
                    pool,
                    &gs,
                    &gs,
                    &crate::commands::legacy::helpmsg_key(msg.id.get()),
                    &ctx.author().id.get().to_string(),
                )
                .await;
                // TS collector `end` (840s): disable the selects so stale
                // menus visibly expire instead of silently dying on dead
                // interaction tokens.
                if !disable_rows.is_empty() {
                    let http = ctx.serenity_context().http.clone();
                    let channel_id = msg.channel_id;
                    let message_id = msg.id;
                    let comps = std::mem::take(&mut disable_rows);
                    tokio::spawn(async move {
                        tokio::time::sleep(std::time::Duration::from_secs(840)).await;
                        let _ = channel_id
                            .edit_message(
                                &http,
                                message_id,
                                poise::serenity_prelude::EditMessage::new().components(comps),
                            )
                            .await;
                    });
                }
            }
        }
    }
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

    #[test]
    fn main_menu_browser_protocol_routes_and_gates() {
        use crate::commands::legacy::help_main::{help_main_row_bounds, help_main_select_ids};
        use crate::commands::legacy::{help_cat_key, helpmsg_key, HELP_SELECT_PREFIX};
        // Rows cover all categories exactly once.
        for n in [0usize, 1, 2, 3, 25, 26, 27, 50] {
            let (a, b) = help_main_row_bounds(n);
            assert_eq!((a.start, a.end, b.start, b.end), (0, a.end, a.end, n));
            assert_eq!(a.len() + b.len(), n);
        }
        // Custom ids hit the routed browser prefix and stay unique.
        let (first, second) = help_main_select_ids();
        assert!(first.starts_with(HELP_SELECT_PREFIX));
        assert!(second.starts_with(HELP_SELECT_PREFIX));
        assert_ne!(first, second);
        // Option values are title-derived keys, like the router expects.
        assert_eq!(help_cat_key("Some Category"), "some_category");
        // Author gate key is per-message.
        assert_eq!(helpmsg_key(7), "HELPMSG.7");
        assert_ne!(helpmsg_key(7), helpmsg_key(8));
    }

    #[test]
    fn overview_matches_ts_parity() {
        use crate::commands::legacy::help::{
            help_overview_options, is_help_overview_select, parse_help_overview_pick,
            sort_help_cats_by_name, HelpOverviewPick,
        };
        use crate::commands::legacy::help_main::help_overview_select_ids;
        use crate::commands::legacy::HelpBrowserCat;
        // Verbatim TS custom ids, routed on the overview path.
        let (first, second) = help_overview_select_ids();
        assert_eq!(
            (first.as_str(), second.as_str()),
            ("help-menu-1", "help-menu-2")
        );
        assert!(is_help_overview_select(&first));
        assert!(is_help_overview_select(&second));
        // Name-sorted categories with back first and global index values.
        let mut cats = vec![
            HelpBrowserCat {
                name: "utils".to_string(),
                title: "Utils".to_string(),
                desc: String::new(),
                color: 0,
                emoji_name: "Utils".to_string(),
                fields: vec![("`a`".to_string(), "d".to_string())],
            },
            HelpBrowserCat {
                name: "bot".to_string(),
                title: "Bot".to_string(),
                desc: String::new(),
                color: 0,
                emoji_name: "ECBDD_Badge".to_string(),
                fields: vec![("`b`".to_string(), "d".to_string())],
            },
        ];
        sort_help_cats_by_name(&mut cats);
        assert_eq!(cats[0].title, "Bot");
        let opts = help_overview_options("en-US", &cats, 0..2);
        assert_eq!(opts[0].value, "back");
        assert_eq!(
            opts.iter().map(|o| o.value.clone()).collect::<Vec<_>>(),
            vec!["back".to_string(), "0".to_string(), "1".to_string()]
        );
        // Index values route to categories, back re-opens the overview.
        assert!(matches!(
            parse_help_overview_pick("0"),
            HelpOverviewPick::Category(0)
        ));
        assert!(matches!(
            parse_help_overview_pick("back"),
            HelpOverviewPick::Back
        ));
        assert!(matches!(
            parse_help_overview_pick("nope"),
            HelpOverviewPick::Unknown
        ));
        // Banner image derives from the guild lang (bannerGenerator).
        assert!(crate::funcs::banner_url("en-US").ends_with("ihrz_en-US.png"));
    }
}

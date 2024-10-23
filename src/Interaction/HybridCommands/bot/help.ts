/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    Client,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ComponentType,
    ChatInputCommandInteraction,
    StringSelectMenuInteraction,
    ApplicationCommandType,
    ColorResolvable,
    Message,
    CommandInteractionOptionResolver,
    ApplicationCommandOptionType,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData';
import { CategoryData } from '../../../../types/category';
import { Command } from '../../../../types/command';
import { DatabaseStructure } from '../../../../types/database_structure';

export const command: Command = {
    name: 'help',

    description: 'Get a list of all the commands!',
    description_localizations: {
        "fr": "Obtenir la liste de toute les commandes"
    },

    options: [
        {
            name: "command-name",

            description: "The command name you want information",
            description_localizations: {
                "fr": "La commandes sur laquelle vous voulez des info"
            },

            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],
    category: 'bot',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, runningCommand: any, execTimestamp?: number, args?: string[]) => {
        let permCheck = await client.method.permission.checkCommandPermission(interaction, command);
        if (!permCheck.allowed) return client.method.permission.sendErrorMessage(interaction, lang, permCheck.neededPerm || 0);

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        const categories: CategoryData[] = [];

        if (interaction instanceof ChatInputCommandInteraction) {
            var targetCommand = interaction.options.getString('command-name');
        } else {
            var _ = await client.method.checkCommandArgs(interaction, command, args!, lang); if (!_) return;
            var targetCommand = client.method.string(args!, 0);
        };

        if (!targetCommand) {
            for (const cat of client.category) {
                const color = cat.categoryColor;

                const descriptionKey = cat.options.description;
                const description = lang[descriptionKey as keyof LanguageData].toString();

                const placeholderKey = cat.options.placeholder;
                const placeholder = lang[placeholderKey as keyof LanguageData];

                const commands = client.content.filter(c => c.category === cat.categoryName);

                categories.push({
                    name: placeholder.toString(),
                    value: commands,
                    inline: false,
                    description: description,
                    color: color,
                    emoji: cat.options.emoji
                });
            };

            categories.sort((a, b) => a.name.localeCompare(b.name));

            const selectMenus = [];
            const categoriesPerMenu = Math.ceil(categories.length / 2);
            const Commands = await client.db.get(`${interaction.guildId}.UTILS.PERMS`) as DatabaseStructure.UtilsPermsData | undefined;
            let index = 0;

            for (let i = 0; i < 2; i++) {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`help-menu-${i + 1}`)
                    .setPlaceholder(lang.help_select_menu);

                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(lang.help_back_to_menu)
                        .setDescription(lang.help_back_to_menu_desc)
                        .setValue("back")
                        .setEmoji("⬅️")
                );

                const categoriesCalc = categories.slice(i * categoriesPerMenu, (i + 1) * categoriesPerMenu);
                categoriesCalc.forEach((category) => {
                    selectMenu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(category.name)
                            .setDescription(
                                lang.help_select_menu_fields_desc.replace(
                                    "${categories[index].value.length}",
                                    category.value.length.toString()
                                )
                            )
                            .setValue(index.toString())
                            .setEmoji(category.emoji)
                    );
                    index++;
                });

                selectMenus.push(selectMenu);
            }

            const rows = selectMenus.map((selectMenu, index) => {
                return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
            });

            let og_embed = new EmbedBuilder()
                .setColor('#001eff')
                .setDescription(lang.help_tip_embed
                    .replaceAll('${client.user?.username}', interaction.client.user.username)
                    .replaceAll('${client.iHorizon_Emojis.icon.Pin}', client.iHorizon_Emojis.icon.Pin)
                    .replaceAll('${categories.length}', categories.length.toString())
                    .replaceAll('${client.iHorizon_Emojis.badge.Slash_Bot}', client.iHorizon_Emojis.badge.Slash_Bot)
                    .replaceAll('${client.content.filter(c => c.messageCmd === false).length}', client.content.filter(c => c.messageCmd === 0 || 3).length.toString())
                    .replaceAll('${client.iHorizon_Emojis.icon.Crown_Logo}', client.iHorizon_Emojis.icon.Crown_Logo)
                    .replaceAll('${config.owner.ownerid1}', client.owners[0])
                    .replaceAll('${config.owner.ownerid2}', client.owners[1] ?? client.owners[0])
                    .replaceAll('${client.iHorizon_Emojis.vc.Region}', client.iHorizon_Emojis.vc.Region)
                    .replaceAll('${client.iHorizon_Emojis.badge.Slash_Bot}', client.iHorizon_Emojis.badge.Slash_Bot)
                )
                .setFooter(await client.method.bot.footerBuilder(interaction))
                .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
                .setThumbnail("attachment://footer_icon.png")
                .setTimestamp();

            let embed = new EmbedBuilder()
                .setFooter(await client.method.bot.footerBuilder(interaction))
                .setThumbnail("attachment://footer_icon.png");

            let response = await client.method.interactionSend(interaction, {
                embeds: [og_embed],
                components: rows,
                files: [await client.method.bot.footerAttachmentBuilder(interaction)]
            });

            let collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 840_000 });
            let guildLang = await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`);
            let bot_prefix = await client.func.prefix.guildPrefix(client, interaction.guild?.id!);

            collector.on('collect', async (i: StringSelectMenuInteraction) => {

                if (i.user.id !== interaction.member?.user.id) {
                    await i.reply({ content: lang.help_not_for_you, ephemeral: true });
                    return;
                };

                await i.deferUpdate();

                if (i.values[0] === "back") {
                    await response.edit({ embeds: [og_embed], components: rows });
                    return;
                }

                embed
                    .setTitle(`${categories[i.values[0] as unknown as number].emoji}・${categories[i.values[0] as unknown as number].name}`)
                    .setDescription(categories[i.values[0] as unknown as number].description)
                    .setColor(categories[i.values[0] as unknown as number].color as ColorResolvable);

                embed.setFields({ name: ' ', value: ' ' });

                let categoryColor = categories[i.values[0] as unknown as number].color;
                let commandGroups: { name: string, value: string, inline: boolean }[][] = [];
                let embeds: EmbedBuilder[] = [];
                let currentGroup: { name: string, value: string, inline: boolean }[] = [];

                categories[i.values[0] as unknown as number].value.forEach(async (element, index) => {
                    var states = "";
                    var cmdPrefix: string;
                    var commandStates = Commands?.[element.cmd.split(" ").pop()!];
                    if (!commandStates) {
                        states += `${client.iHorizon_Emojis.icon.iHorizon_Unlock}`
                    } else {
                        states += `${client.iHorizon_Emojis.icon.iHorizon_Lock} ${commandStates}`
                    }

                    switch (element.messageCmd) {
                        case 0:
                            cmdPrefix = `${states} ${client.iHorizon_Emojis.badge.Slash_Bot} **/${element.cmd}**`
                            break;
                        case 1:
                            cmdPrefix = bot_prefix.type === 'mention'
                                ? `${states} ${client.iHorizon_Emojis.icon.Prefix_Command} **@Ping-Me ${element.cmd}**`
                                : `${states} ${client.iHorizon_Emojis.icon.Prefix_Command} **${bot_prefix.string}${element.cmd}**`
                            break;
                        case 2:
                            cmdPrefix = bot_prefix.type === 'mention'
                                ? `${states} ${client.iHorizon_Emojis.icon.Prefix_Command} (@Ping-Me) ${client.iHorizon_Emojis.badge.Slash_Bot} **${element.cmd}**`
                                : `${states} ${client.iHorizon_Emojis.icon.Prefix_Command} (${bot_prefix.string}) ${client.iHorizon_Emojis.badge.Slash_Bot} **${element.cmd}**`
                            break;
                    }
                    let descValue = (guildLang === "fr-ME" || guildLang === "fr-FR") ? `\`${element.desc_localized["fr"]}\`` : `\`${element.desc}\``;
                    currentGroup.push({ name: cmdPrefix, value: descValue, inline: false });

                    if ((index + 1) % 20 === 0 || index === categories[i.values[0] as unknown as number].value.length - 1) {
                        commandGroups.push([...currentGroup]);
                        currentGroup = [];
                    }
                });

                for (const group of commandGroups) {
                    let newEmbed = new EmbedBuilder().setColor(categoryColor as ColorResolvable);

                    if (embeds.length === 0) {
                        newEmbed
                            .setTitle(`${categories[i.values[0] as unknown as number].emoji}・${categories[i.values[0] as unknown as number].name}`)
                            .setDescription(categories[i.values[0] as unknown as number].description)
                            .setFooter(await client.method.bot.footerBuilder(interaction))
                            .setThumbnail("attachment://footer_icon.png")
                            .setTimestamp();
                    }

                    group.forEach(field => {
                        newEmbed.addFields(field);
                    });

                    const remainingFields = group.length % 2;
                    if (remainingFields === 0) {
                        newEmbed.addFields({ name: '**  **', value: '**  **', inline: true });
                    }

                    embeds.push(newEmbed);
                }

                await response.edit({ embeds: embeds });
            });

            collector.on('end', async i => {
                rows.forEach((comp, i) => {
                    comp.components.forEach((component) => {
                        component.setDisabled(true);
                    });
                });

                await response.edit({ components: rows });
                return;
            });
        } else {
            let fetchCommand = client.commands.get(targetCommand);

            if (!fetchCommand) {
                await client.method.interactionSend(interaction, {
                    content: `${client.iHorizon_Emojis.icon.No_Logo}`
                })
                return;
            }

            await client.method.interactionSend(interaction, {
                embeds: [await client.method.createAwesomeEmbed(lang, fetchCommand, client, interaction)], ephemeral: true
            })
        }
    },
};
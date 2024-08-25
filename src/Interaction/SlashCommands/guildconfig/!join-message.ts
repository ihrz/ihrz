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
    ActionRowBuilder,
    BaseGuildTextChannel,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    PermissionsBitField,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputStyle
} from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { LanguageData } from '../../../../types/languageData';
import { generateJoinImage } from '../../../Events/guildconfig/joinMessage.js';
import logger from '../../../core/logger.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

function isValidColor(color: string): boolean {
    return /^#([0-9a-f]{3}){1,2}$/i.test(color);
}

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setjoinmessage_not_admin });
            return;
        }

        let joinMessage = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`);
        let ImageBannerOptions = await client.db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinbanner`) as DatabaseStructure.JoinBannerOptions | undefined;
        let ImageBannerStates = await client.db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinbannerStates`) as string | undefined;
        let guildLocal = await client.db.get(`${interaction.guild.id}.GUILD.LANG.lang`) || "en-US";

        var backgroundURL = ImageBannerOptions?.backgroundURL || "https://img.freepik.com/vecteurs-libre/fond-courbe-bleue_53876-113112.jpg";
        var profilePictureRound: any = ImageBannerOptions?.profilePictureRound || "status";
        var textColour = ImageBannerOptions?.textColour || "#000000"
        var message = ImageBannerOptions?.message || "Welcome {memberUsername} to {guildName}<br>We are now {memberCount} in the guild";

        message = client.method.generateCustomMessagePreview(message, {
            user: interaction.user,
            guild: interaction.guild,
            guildLocal: guildLocal
        })
        await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbanner`, { backgroundURL, profilePictureRound, textColour, message })

        joinMessage = joinMessage?.substring(0, 1010);

        let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL: backgroundURL, profilePictureRound, textColour, message }))!;
        let helpembed_fields = [
            {
                name: data.setjoinmessage_help_embed_fields_custom_name,
                value: joinMessage ? `\`\`\`${joinMessage}\`\`\`\n${client.method.generateCustomMessagePreview(joinMessage, {
                    user: interaction.user,
                    guild: interaction.guild!,
                    guildLocal: guildLocal,
                })}` : data.setjoinmessage_help_embed_fields_custom_name_empy
            },
            {
                name: data.setjoinmessage_help_embed_fields_default_name_empy,
                value: `\`\`\`${data.event_welcomer_inviter}\`\`\`\n${client.method.generateCustomMessagePreview(data.event_welcomer_inviter, {
                    user: interaction.user,
                    guild: interaction.guild!,
                    guildLocal: guildLocal,
                })}`
            }
        ];

        const helpEmbed = new EmbedBuilder()
            .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.all`) || "#0014a8")
            .setDescription(data.setjoinmessage_help_embed_desc)
            .setTitle(data.setjoinmessage_help_embed_title)
            .setFields(helpembed_fields);

        const helpEmbed2 = new EmbedBuilder()
            .setColor("#ffb3cc")
            .setTitle("Join Message Card")
            .setImage("attachment://image.png")

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("joinMessage-set-message")
                    .setLabel(data.setjoinmessage_button_set_name)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("joinMessage-default-message")
                    .setLabel(data.setjoinmessage_buttom_del_name)
                    .setStyle(ButtonStyle.Danger)
            );

        const buttons2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("joinMessage-set-image")
                    .setLabel("Change Image")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("joinMessage-default-image")
                    .setLabel("Default Image")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("joinMessage-delete-image")
                    .setLabel(ImageBannerStates !== "off" ? "Delete Image" : "Enable Image")
                    .setStyle(ImageBannerStates !== "off" ? ButtonStyle.Danger : ButtonStyle.Success),
            );

        var embeds = [helpEmbed];
        var files = [];

        if (ImageBannerStates !== "off") embeds.push(helpEmbed2) && files.push(attachment)

        const message2 = await interaction.editReply({
            embeds: embeds,
            components: [buttons, buttons2],
            files: files
        });

        const collector = message2.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 8_00_000
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({ content: data.help_not_for_you, ephemeral: true });
                return;
            };

            if (buttonInteraction.customId === "joinMessage-set-message") {
                let modalInteraction = await iHorizonModalResolve({
                    customId: 'joinMessage-modal',
                    title: data.setjoinmessage_awaiting_response,
                    deferUpdate: false,
                    fields: [
                        {
                            customId: 'joinMessage-input',
                            label: data.guildprofil_embed_fields_joinmessage,
                            style: TextInputStyle.Paragraph,
                            required: true,
                            maxLength: 1010,
                            minLength: 2
                        },
                    ]
                }, buttonInteraction);

                if (!modalInteraction) return;

                try {
                    const response = modalInteraction.fields.getTextInputValue('joinMessage-input');

                    helpEmbed.setFields(
                        {
                            name: data.setjoinmessage_help_embed_fields_custom_name,
                            value: response ? `\`\`\`${response}\`\`\`\n${client.method.generateCustomMessagePreview(response, {
                                user: interaction.user,
                                guild: interaction.guild!,
                                guildLocal: guildLocal,
                            })}` : data.setjoinmessage_help_embed_fields_custom_name_empy
                        },
                        helpembed_fields[1]
                    );

                    await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`, response);
                    await modalInteraction.reply({
                        content: data.setjoinmessage_command_work_on_enable
                            .replace("${client.iHorizon_Emojis.icon.Green_Tick_Logo}", client.iHorizon_Emojis.icon.Green_Tick_Logo),
                        ephemeral: true
                    });

                    let emb = [helpEmbed]
                    let files = [];

                    if (ImageBannerStates === "on") emb.push(helpEmbed2) && files.push((await generateJoinImage(interaction.member as GuildMember, { backgroundURL: backgroundURL, profilePictureRound, textColour, message }))!);

                    await message2.edit({ embeds: emb, files: files });

                    const logEmbed = new EmbedBuilder()
                        .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.ihrz-logs`) || "#bf0bb9")
                        .setTitle(data.setjoinmessage_logs_embed_title_on_enable)
                        .setDescription(data.setjoinmessage_logs_embed_description_on_enable
                            .replace("${interaction.user.id}", interaction.user.id)
                        );

                    const logchannel = interaction.guild?.channels.cache.find((channel) => channel.name === 'ihorizon-logs');

                    if (logchannel) {
                        (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
                    }
                } catch (e) {
                    logger.err(e as any);
                }
            } else if (buttonInteraction.customId === "joinMessage-default-message") {
                helpEmbed.setFields(
                    {
                        name: data.setjoinmessage_help_embed_fields_custom_name,
                        value: data.setjoinmessage_help_embed_fields_custom_name_empy
                    },
                    helpembed_fields[1]
                );

                await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`);

                await buttonInteraction.reply({
                    content: data.setjoinmessage_command_work_on_enable
                        .replace("${client.iHorizon_Emojis.icon.Green_Tick_Logo}", client.iHorizon_Emojis.icon.Green_Tick_Logo),
                    ephemeral: true
                });

                let emb = [helpEmbed]
                let files = [];

                if (ImageBannerStates === "on") emb.push(helpEmbed2) && files.push((await generateJoinImage(interaction.member as GuildMember, { backgroundURL: backgroundURL, profilePictureRound, textColour, message }))!);

                await message2.edit({ embeds: emb, files: files });

                const logEmbed = new EmbedBuilder()
                    .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.ihrz-logs`) || "#bf0bb9")
                    .setTitle(data.setjoinmessage_logs_embed_title_on_disable)
                    .setDescription(data.setjoinmessage_logs_embed_description_on_disable
                        .replace("${interaction.user.id}", interaction.user.id)
                    );

                const logchannel = interaction.guild?.channels.cache.find((channel: { name: string }) => channel.name === 'ihorizon-logs');
                if (logchannel) {
                    (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
                }
            } else if (buttonInteraction.customId === "joinMessage-set-image") {
                await buttonInteraction.deferUpdate();

                let stringSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId("test")
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Change Background")
                            .setValue("change_background"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Change Round Frame Color")
                            .setValue("change_frame"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Change Text Colour")
                            .setValue("change_text_colour"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Change Text Message")
                            .setValue("change_text_message"),
                    );

                let attachment = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(stringSelectMenu);

                let msg = await buttonInteraction.editReply({ components: [attachment] });

                let i1 = await msg.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    time: 1_250_000,
                    filter: (x) => x.user.id === interaction.user.id
                });

                if (i1.values[0] === "change_background") {
                    let res = await iHorizonModalResolve({
                        title: "Change Background",
                        customId: 'change_background',
                        deferUpdate: true,
                        fields: [
                            {
                                customId: 'url',
                                label: 'background image url',
                                style: TextInputStyle.Short,
                                required: true,
                                maxLength: 300,
                                minLength: 7
                            }
                        ]
                    }, i1);

                    backgroundURL = res?.fields.getTextInputValue("url")!;

                    let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message }))!;
                    await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment], components: [buttons, buttons2] })
                } else if (i1.values[0] === "change_frame") {
                    await i1.deferUpdate();

                    let stringSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId("test")
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel("Based on user profil color")
                                .setValue("hexProfileColor"),
                            new StringSelectMenuOptionBuilder()
                                .setLabel("Based on user status")
                                .setValue("status"),
                        );

                    let attachment = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(stringSelectMenu);

                    let msg = await buttonInteraction.editReply({ components: [attachment] });

                    let i = await msg.awaitMessageComponent({
                        componentType: ComponentType.StringSelect,
                        time: 1_250_000,
                        // filter: (x) => x.user.id !== interaction.user.id
                    });

                    i.deferUpdate()

                    profilePictureRound = i.values[0];

                    let attachment2 = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message }))!;
                    await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment2], components: [buttons, buttons2] })
                } else if (i1.values[0] === "change_text_colour") {
                    let res = await iHorizonModalResolve({
                        title: "Change Text Colour",
                        customId: 'change_text_colour',
                        deferUpdate: false,
                        fields: [
                            {
                                customId: 'colour',
                                label: 'colour www.color-hex.com',
                                style: TextInputStyle.Short,
                                required: true,
                                maxLength: 9,
                                minLength: 3
                            }
                        ]
                    }, i1);


                    textColour = res?.fields.getTextInputValue("colour")!;

                    if (!isValidColor(textColour)) {
                        res?.reply({ content: data.embed_choose_12_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo) })
                    }

                    await res?.deferUpdate();

                    let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL, profilePictureRound, textColour, message }))!;
                    await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment], components: [buttons, buttons2] })
                } else if (i1.values[0] === "change_text_message") {
                    let res = await iHorizonModalResolve({
                        title: "Change Text Message",
                        customId: 'change_text_message',
                        deferUpdate: true,
                        fields: [
                            {
                                customId: 'msg',
                                label: 'message you want',
                                style: TextInputStyle.Short,
                                required: true,
                                maxLength: 100,
                                minLength: 15
                            }
                        ],
                    }, i1);


                    message = client.method.generateCustomMessagePreview(res?.fields.getTextInputValue("msg")!, {
                        user: interaction.user,
                        guild: interaction.guild!,
                        guildLocal: guildLocal
                    });

                    let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL: backgroundURL, profilePictureRound, textColour, message }))!;
                    await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment], components: [buttons, buttons2] });
                };

                await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbanner`, { backgroundURL, profilePictureRound, textColour, message })
            } else if (buttonInteraction.customId === "joinMessage-default-image") {
                backgroundURL = "https://img.freepik.com/vecteurs-libre/fond-courbe-bleue_53876-113112.jpg";
                profilePictureRound = "status";
                textColour = "#000000"
                message = client.method.generateCustomMessagePreview("Welcome {memberUsername} to {guildName}<br>We are now {memberCount} in the guild", {
                    user: interaction.user,
                    guild: interaction.guild!,
                    guildLocal: guildLocal
                })

                await buttonInteraction.deferUpdate();

                let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL: backgroundURL, profilePictureRound, textColour, message }))!;
                await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], files: [attachment], components: [buttons, buttons2] });
                await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbanner`)
            } else if (buttonInteraction.customId === "joinMessage-delete-image") {
                await buttonInteraction.deferUpdate();

                if (ImageBannerStates === "off") {
                    let attachment = (await generateJoinImage(interaction.member as GuildMember, { backgroundURL: backgroundURL, profilePictureRound, textColour, message }))!;
                    await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbannerStates`, "on")
                    ImageBannerStates = "on";

                    buttons2.components[2].setStyle(ImageBannerStates !== "off" ? ButtonStyle.Danger : ButtonStyle.Success)
                    buttons2.components[2].setLabel(ImageBannerStates !== "off" ? "Delete Image" : "Enable Image")

                    await interaction.editReply({ embeds: [helpEmbed, helpEmbed2], components: [buttons, buttons2], files: [attachment] });
                } else {
                    await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbannerStates`, "off")
                    ImageBannerStates = "off"

                    buttons2.components[2].setStyle(ImageBannerStates !== "off" ? ButtonStyle.Danger : ButtonStyle.Success)
                    buttons2.components[2].setLabel(ImageBannerStates !== "off" ? "Delete Image" : "Enable Image")

                    await interaction.editReply({ embeds: [helpEmbed], components: [buttons, buttons2], files: [] });
                }
            }
        });

        collector.on('end', async () => {
            buttons.components.forEach(x => {
                x.setDisabled(true)
            })
            await message2.edit({ components: [buttons] });
        });
    },
};
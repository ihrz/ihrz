/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/
import { EmbedBuilder, PermissionsBitField, ChatInputCommandInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType, TextInputStyle } from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
export default {
    run: async (client, interaction, lang, command, neededPerm, args) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel)
            return;
        const permissionsArray = [PermissionsBitField.Flags.Administrator];
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);
        if (!permissions && neededPerm === 0) {
            await client.method.interactionSend(interaction, { content: lang.punishpub_not_admin });
            return;
        }
        ;
        let baseData = (await client.db.get(`${interaction.guild.id}.UTILS.NICK_KICKER`) || {
            enabled: true,
            words: []
        });
        let embed = new EmbedBuilder()
            .setTitle(lang.util_nick_kicker_embed_title)
            .setDescription(lang.util_nick_kicker_embed_desc)
            .setFooter(await client.method.bot.footerBuilder(interaction))
            .setFields({
            name: lang.var_enabled,
            value: baseData.enabled ? "✅" : "❌",
            inline: true
        }, {
            name: lang.util_nick_kicker_words,
            value: "```" + (baseData.words.length === 0 ? lang.var_none : baseData.words.join(", ")) + "```",
            inline: true
        });
        let selectMenu = new StringSelectMenuBuilder()
            .setCustomId("nick-kicker")
            .setPlaceholder(lang.ticket_panel_change_option_select_placeholder)
            .addOptions(new StringSelectMenuOptionBuilder()
            .setLabel(lang.rolesaver_embed_fields_1_name)
            .setValue("enable")
            .setDescription(lang.util_nick_kicker_enable_desc)
            .setEmoji("✅"), new StringSelectMenuOptionBuilder()
            .setLabel(lang.util_nick_kicker_disable)
            .setValue("disable")
            .setDescription(lang.util_nick_kicker_disable_desc)
            .setEmoji("❌"), new StringSelectMenuOptionBuilder()
            .setLabel(lang.util_nick_kicker_add_word)
            .setValue("add")
            .setDescription(lang.util_nick_kicker_add_desc)
            .setEmoji("🔧"), new StringSelectMenuOptionBuilder()
            .setLabel(lang.util_nick_kicker_remove_word2)
            .setValue("remove")
            .setDescription(lang.util_nick_kicker_remove_desc)
            .setEmoji("🔨"));
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const ogInteraction = await client.method.interactionSend(interaction, {
            embeds: [embed],
            components: [row],
            files: [await client.method.bot.footerAttachmentBuilder(interaction)]
        });
        const collector = ogInteraction.createMessageComponentCollector({
            time: 60000,
            componentType: ComponentType.StringSelect
        });
        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.member?.user.id)
                return;
            if (i.values[0] === "enable") {
                await i.deferUpdate();
                await EnableModule();
            }
            else if (i.values[0] === "disable") {
                await i.deferUpdate();
                await DisableModule();
            }
            else if (i.values[0] === "add") {
                await AddWord(i);
            }
            else if (i.values[0] === "remove") {
                await i.deferUpdate();
                await RemoveWord();
            }
            else if (i.values[0].startsWith("nick-kicker-remove")) {
                await i.deferUpdate();
                let word = i.values[0].split("-")[3];
                baseData.words = baseData.words.filter(w => w !== word);
                embed.data.fields[1].value = "```" + (baseData.words.length === 0 ? lang.var_none : baseData.words.join(", ")) + "```";
                await client.db.set(`${interaction.guild.id}.UTILS.NICK_KICKER`, baseData);
                await ogInteraction.edit({
                    content: null,
                    embeds: [embed],
                    components: [row],
                    files: [await client.method.bot.footerAttachmentBuilder(interaction)]
                });
            }
        });
        async function EnableModule() {
            baseData.enabled = true;
            embed.data.fields[0].value = "✅";
            await client.db.set(`${interaction.guild.id}.UTILS.NICK_KICKER`, baseData);
            await client.method.interactionSend(interaction, {
                embeds: [embed],
                components: [row],
                files: [await client.method.bot.footerAttachmentBuilder(interaction)]
            });
        }
        async function DisableModule() {
            baseData.enabled = false;
            embed.data.fields[0].value = "❌";
            await client.db.set(`${interaction.guild.id}.UTILS.NICK_KICKER`, baseData);
            await client.method.interactionSend(interaction, {
                embeds: [embed],
                components: [row],
                files: [await client.method.bot.footerAttachmentBuilder(interaction)]
            });
        }
        async function AddWord(i) {
            // if words are more than 15
            if (baseData.words.length >= 15) {
                await i.reply({
                    content: lang.util_nick_kicker_words_max_15,
                    ephemeral: true
                });
                return;
            }
            let modal = await iHorizonModalResolve({
                title: lang.util_nick_kicker_add_word,
                customId: 'nick-kicker-add',
                deferUpdate: true,
                fields: [
                    {
                        customId: "word",
                        label: capitalizeFirstLetter(lang.util_nick_kicker_words),
                        style: TextInputStyle.Short,
                        required: true,
                        maxLength: 20,
                        minLength: 1
                    }
                ]
            }, i);
            let word = modal?.fields.getTextInputValue("word") || lang.var_none;
            word = word.toLowerCase().substring(0, 20);
            baseData.words.push(word);
            embed.data.fields[1].value = "```" + (baseData.words.length === 0 ? lang.var_none : baseData.words.join(", ")) + "```";
            await client.db.set(`${interaction.guild.id}.UTILS.NICK_KICKER`, baseData);
            await ogInteraction.edit({
                embeds: [embed],
                components: [row],
                files: [await client.method.bot.footerAttachmentBuilder(interaction)]
            });
        }
        async function RemoveWord() {
            // if there is no word to remove
            if (baseData.words.length === 0) {
                await ogInteraction.edit({
                    content: lang.util_nick_kicker_no_word_to_remove,
                });
                return;
            }
            // make select menu for remove word
            let selectMenu = new StringSelectMenuBuilder()
                .setCustomId("nick-kicker-remove")
                .setPlaceholder(lang.util_nick_kicker_select_to_remove)
                .addOptions(baseData.words.map(word => {
                return new StringSelectMenuOptionBuilder()
                    .setLabel(word)
                    .setValue("nick-kicker-remove-" + word)
                    .setDescription(lang.util_nick_kicker_remove_word)
                    .setEmoji("🔨");
            }));
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await ogInteraction.edit({
                content: lang.util_nick_kicker_select_to_remove,
                components: [row],
                embeds: [],
                files: []
            });
        }
        collector.on('end', async (_, reason) => {
            if (reason === "legit")
                return;
            const row = new ActionRowBuilder().addComponents(selectMenu.setDisabled(true));
            await ogInteraction.edit({ components: [row] });
        });
    },
};

/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { ActionRowBuilder, BaseGuildTextChannel, ButtonInteraction, CacheType, Embed, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { DatabaseStructure } from '../../../core/database_structure';
import { generatePassword } from '../../../core/functions/random.js'
import { LanguageData } from '../../../../types/languageData';
import maskLink from '../../../core/functions/maskLink.js';

var modalIdRegistered: number[] = [];

export default async function (interaction: ButtonInteraction<CacheType>) {

    if (await interaction.client.db.get(
        `${interaction.guildId}.GUILD.CONFESSION.disable`
    )) return;

    let allDataConfession = await interaction.client.db.get(`${interaction.guildId}.GUILD.CONFESSION`) as DatabaseStructure.ConfessionSchema;
    let confessionTime = await interaction.client.db.table('TEMP').get(`CONFESSION_COOLDOWN.${interaction.user.id}`);
    let lang = await interaction.client.functions.getLanguageData(interaction.guildId) as LanguageData;

    let timeout = allDataConfession.cooldown!;
    let panel = allDataConfession.panel;

    if (confessionTime !== null && timeout - (Date.now() - confessionTime) > 0) {
        let time = interaction.client.timeCalculator.to_beautiful_string(timeout - (Date.now() - confessionTime));

        await interaction.reply({
            content: lang.monthly_cooldown_error.replace(/\${time}/g, time),
            ephemeral: true
        });
        return;
    };

    let channel = interaction.guild?.channels.cache.get(panel?.channelId!);

    if (panel?.channelId !== interaction.channelId || panel?.messageId !== interaction.message.id) {
        return;
    }

    let modal = new ModalBuilder()
        .setCustomId('selection_modal')
        .setTitle(lang.confession_module_modal_title);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId('case_name')
                    .setPlaceholder(lang.confession_module_modal_components1_placeholder)
                    .setLabel(lang.confession_module_modal_components1_label)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(200)
                    .setMinLength(2)
            ),
        new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId('case_private')
                    .setPlaceholder("Yes/No")
                    .setLabel(lang.confession_module_modal_components2_label)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(3)
            )
    );

    await interaction.showModal(modal);

    interaction.awaitModalSubmit({
        filter: (u) => u.user.id === interaction.user.id,
        time: 120_000
    }).then(async (submitInteraction) => {

        if (modalIdRegistered.includes(parseInt(submitInteraction.id))) return;
        modalIdRegistered.push(parseInt(submitInteraction.id));

        let name = maskLink(submitInteraction.fields.getTextInputValue("case_name"));
        let view: string | boolean = submitInteraction.fields.getTextInputValue("case_private");
        let code = generatePassword({ length: 6, numbers: true, lowercase: true });
        let files = [];

        await submitInteraction.deferUpdate();

        const embed = new EmbedBuilder()
            .setColor(2829617)
            .setDescription(`### Confession #${code}\n\n` + '`' + name + '`')
            .setTimestamp()
            ;

        if (view.toLowerCase().includes('no')) {
            view = false;

            files.push({
                attachment: await interaction.client.functions.image64(interaction.user.displayAvatarURL()),
                name: 'userIcon.png'
            });

            embed.setFooter({ text: interaction.user.username, iconURL: 'attachment://userIcon.png' });

        } else {
            view = true;
        }

        await interaction.client.db.push(`${interaction.guildId}.GUILD.CONFESSION.ALL_CONFESSIONS`, {
            code: code,
            userId: interaction.user.id,
            timestamp: Date.now(),
            private: view,
        });

        await interaction.client.db.table('TEMP').set(`CONFESSION_COOLDOWN.${interaction.user.id}`, Date.now());

        await (channel as BaseGuildTextChannel).send({
            embeds: [embed],
            files: files
        });
        return;
    }).catch(() => { });
};
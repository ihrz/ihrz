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

import { BaseGuildTextChannel, ButtonInteraction, CacheType, EmbedBuilder, TextInputStyle } from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { DatabaseStructure } from '../../../core/database_structure.js';
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

    let submitInteraction = await iHorizonModalResolve({
        customId: 'selection_modal',
        title: lang.confession_module_modal_title,
        fields: [
            {
                customId: 'case_name',
                label: lang.confession_module_modal_components1_label,
                placeHolder: lang.confession_module_modal_components1_placeholder,
                style: TextInputStyle.Paragraph,
                required: true,
                maxLength: 200,
                minLength: 2
            },
            {
                customId: 'case_private',
                label: lang.confession_module_modal_components2_label,
                placeHolder: `${lang.mybot_submit_utils_msg_yes} / ${lang.mybot_submit_utils_msg_no}`,
                style: TextInputStyle.Short,
                required: true,
                minLength: 2,
                maxLength: 8,
            },
        ]
    }, interaction);

    if (!submitInteraction) return;

    let name = maskLink(submitInteraction.fields.getTextInputValue("case_name"));
    let view: string | boolean = submitInteraction.fields.getTextInputValue("case_private");
    let code = generatePassword({ length: 6, numbers: true, lowercase: true });
    let files = [];

    const embed = new EmbedBuilder()
        .setColor(2829617)
        .setDescription(`### ${lang.help_confession_fields} #${code}\n\n` + '`' + name + '`')
        .setTimestamp()
        ;

    if (view.toLowerCase().includes('no') || view.toLowerCase().includes(lang.mybot_submit_utils_msg_no)) {
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
};
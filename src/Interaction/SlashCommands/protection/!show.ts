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

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {        


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (interaction.user.id !== interaction.guild.ownerId) {
            await interaction.editReply({ content: lang.authorization_configshow_not_permited });
            return;
        };

        var text = "";
        var text2 = "";

        let baseData = await client.db.get(`${interaction.guild.id}.ALLOWLIST`);

        let baseData4Protection = await client.db.get(`${interaction.guild.id}.PROTECTION`);

        if (!baseData || !baseData4Protection) {
            await interaction.editReply({ content: lang.authorization_configshow_not_anything_setup });
            return;
        };

        for (var i in baseData?.list) {
            text += `<@${i}>\n`
        };

        for (var i in baseData4Protection) {
            if (i !== 'SANCTION') {
                var a = baseData4Protection[i].mode;
                text2 += `**${i.toUpperCase()}** -> \`${a}\`\n`
            }
        };

        let okay = '';
        if (baseData4Protection.SANCTION === 'simply') okay = lang.authorization_configshow_simply;
        if (baseData4Protection.SANCTION === 'simply+ban') okay = lang.authorization_configshow_simply_ban;
        if (baseData4Protection.SANCTION === 'simply+derank') okay = lang.authorization_configshow_simply_unrank;

        text2 += lang.authorization_configshow_punishement.replace('${okay}', okay);

        let embed1 = new EmbedBuilder()
            .setColor('#000000')
            .setAuthor({ name: lang.authorization_configshow_embed1_author })
            .setDescription(text2)
            .setFooter(await client.method.bot.footerBuilder(interaction))
            .setTimestamp();

        let embed2 = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: lang.authorization_configshow_embed2_author })
            .setDescription(text)
            .setFooter(await client.method.bot.footerBuilder(interaction))
            .setTimestamp();

        await interaction.editReply({
            embeds: [embed1, embed2],
            files: [await client.method.bot.footerAttachmentBuilder(interaction)]
        });
        return;
    },
};
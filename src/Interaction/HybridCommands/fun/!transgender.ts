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
    AttachmentBuilder,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Message,
    User,
} from 'discord.js'

import { AxiosResponse, axios } from '../../../core/functions/axios.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        if (await client.db.get(`${interaction.guildId}.GUILD.FUN.states`) === "off") {
            await client.func.method.interactionSend(interaction, { content: lang.fun_category_disable });
            return;
        };
        if (interaction instanceof ChatInputCommandInteraction) {
            var member1 = interaction.options.getUser('user') as User || interaction.user;
        } else {
            
            var member1 = await client.func.method.user(interaction, args!, 0) || interaction.author;
        };

        let link = `https://some-random-api.com/canvas/misc/transgender?avatar=${encodeURIComponent(member1.displayAvatarURL({ extension: 'png', size: 1024 }))}`;

        let embed = new EmbedBuilder()
            .setColor('#000000')
            .setImage('attachment://transgender.png')
            .setTimestamp()
            .setFooter(await client.func.displayBotName.footerBuilder(interaction));

        let imgs: AttachmentBuilder | undefined;

        let response: AxiosResponse = await axios.get(link, { responseType: 'arrayBuffer' })
        imgs = new AttachmentBuilder(Buffer.from(response.data, 'base64'), { name: 'transgender.png' });
        embed.setImage(`attachment://transgender.png`);

        await client.func.method.interactionSend(interaction, {
            embeds: [embed],
            files: [imgs, await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
        });
        return;
    },
};
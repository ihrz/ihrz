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

import { sanitizing } from '../../../core/functions/sanitizer.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        if (await client.db.get(`${interaction.guildId}.GUILD.FUN.states`) === "off") {
            await client.method.interactionSend(interaction, { content: lang.fun_category_disable });
            return;
        };
        if (interaction instanceof ChatInputCommandInteraction) {
            var user: User = interaction.options.getUser('user') as User || interaction.user;
            var entry = interaction.options.getString('comment');
            var messageArgs = entry!.split(' ');
        } else {

            var user: User = await client.method.user(interaction, args!, 0) || interaction.author;
            var entry = client.method.longString(args!, 1);
            var messageArgs = entry!.split(' ');
        };

        if (messageArgs.length < 1) {
            await client.method.interactionSend(interaction, { content: lang.fun_var_good_sentence });
            return;
        };

        let username = user.username;
        let displayname = user.globalName;

        if (username.length > 15) {
            username = username.substring(0, 15);
        };

        if (displayname && displayname.length > 15) {
            displayname = displayname.substring(0, 15);
        };

        if (username.length > 15) {
            username = username.substring(0, 15);
        };

        let link = `https://some-random-api.com/canvas/misc/tweet?avatar=${encodeURIComponent((user.displayAvatarURL({ extension: 'png', size: 1024 })))}&username=${encodeURIComponent(sanitizing(username.toLowerCase()))}&comment=${encodeURIComponent(sanitizing(messageArgs.join(' ')))}&displayname=${encodeURIComponent(sanitizing(displayname || username))}`;

        let embed = new EmbedBuilder()
            .setColor('#000000')
            .setImage('attachment://tweet.png')
            .setTimestamp()
            .setFooter(await client.method.bot.footerBuilder(interaction));

        let imgs: AttachmentBuilder;

        await axios.get(link, { responseType: 'arrayBuffer' }).then((response: AxiosResponse) => {
            imgs = new AttachmentBuilder(Buffer.from(response.data, 'base64'), { name: 'tweet.png' });
            embed.setImage(`attachment://tweet.png`);
        });

        await client.method.interactionSend(interaction, { embeds: [embed], files: [imgs!, await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
        return;
    },
};
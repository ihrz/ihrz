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

/*
・ ElektraBots Discord Bot (https://github.com/belugafr/ElektraBots)

・ Mainly developed by NayaWeb (https://github.com/belugafr)

・ Copyright © 2021-2023 ElektraBots
*/

import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    Message,
    User,
} from 'pwss'

import { AxiosResponse, axios } from '../../../core/functions/axios.js';
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommandArgumentValue } from '../../../core/functions/arg.js';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, lang: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        if (interaction instanceof ChatInputCommandInteraction) {
            var user: GuildMember = interaction.options.getMember('user') as GuildMember || interaction.member;
            var entry = interaction.options.getString('comment');
            var messageArgs = entry!.split(' ');
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var user: GuildMember = client.args.member(interaction, args!, 0) || interaction.member;
            var entry = client.args.longString(args!, 1);
            var messageArgs = entry!.split(' ');
        };

        if (messageArgs.length < 1) {
            await client.args.interactionSend(interaction, { content: data.fun_var_good_sentence });
            return;
        };

        let username = user.user.globalName!;

        if (username && username.length > 15) {
            username = username.substring(0, 15);
        };

        let link = `https://some-random-api.com/canvas/misc/youtube-comment?avatar=${encodeURIComponent((user.displayAvatarURL({ extension: 'png', size: 1024 })))}&username=${encodeURIComponent((username))}&comment=${encodeURIComponent(messageArgs.join(' '))}`;

        let embed = new EmbedBuilder()
            .setColor('#000000')
            .setImage('attachment://all-human-have-rights-elektra.png')
            .setTimestamp()
            .setFooter(await client.args.bot.footerBuilder(interaction));

        let imgs: AttachmentBuilder;

        await axios.get(link, { responseType: 'arrayBuffer' }).then((response: AxiosResponse) => {
            imgs = new AttachmentBuilder(Buffer.from(response.data, 'base64'), { name: 'youtube-elektra.png' });
            embed.setImage(`attachment://youtube-elektra.png`);
        });

        await client.args.interactionSend(interaction, { embeds: [embed], files: [imgs!, await interaction.client.args.bot.footerAttachmentBuilder(interaction)] });
        return;
    },
};
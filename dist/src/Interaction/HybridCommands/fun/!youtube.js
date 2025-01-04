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
import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, } from 'discord.js';
import { axios } from '../../../core/functions/axios.js';
import { sanitizing } from '../../../core/functions/sanitizer.js';
export default {
    run: async (client, interaction, lang, command, neededPerm, args) => {
        if (await client.db.get(`${interaction.guildId}.GUILD.FUN.states`) === "off") {
            await client.method.interactionSend(interaction, { content: lang.fun_category_disable });
            return;
        }
        ;
        if (interaction instanceof ChatInputCommandInteraction) {
            var user = interaction.options.getUser('user') || interaction.user;
            var entry = interaction.options.getString('comment');
            var messageArgs = entry.split(' ');
        }
        else {
            var user = await client.method.user(interaction, args, 0) || interaction.author;
            var entry = client.method.longString(args, 1);
            var messageArgs = entry.split(' ');
        }
        ;
        if (messageArgs.length < 1) {
            await client.method.interactionSend(interaction, { content: lang.fun_var_good_sentence });
            return;
        }
        ;
        let username = user.globalName || user.username;
        if (username && username.length > 15) {
            username = username.substring(0, 15);
        }
        ;
        let link = `https://some-random-api.com/canvas/misc/youtube-comment?avatar=${encodeURIComponent((user.displayAvatarURL({ extension: 'png', size: 1024 })))}&username=${encodeURIComponent(sanitizing(username))}&comment=${encodeURIComponent(sanitizing(messageArgs.join(' ')))}`;
        let embed = new EmbedBuilder()
            .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.fun-cmd`) || "#000000")
            .setImage('attachment://youtube.png')
            .setTimestamp()
            .setFooter(await client.method.bot.footerBuilder(interaction));
        let imgs;
        await axios.get(link, { responseType: 'arrayBuffer' }).then((response) => {
            imgs = new AttachmentBuilder(Buffer.from(response.data, 'base64'), { name: 'youtube.png' });
            embed.setImage(`attachment://youtube.png`);
        });
        await client.method.interactionSend(interaction, { embeds: [embed], files: [imgs, await interaction.client.method.bot.footerAttachmentBuilder(interaction)] });
        return;
    },
};

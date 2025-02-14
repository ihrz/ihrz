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
    AttachmentBuilder
} from 'discord.js';
import { format } from '../../../core/functions/date_and_time.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { Custom_iHorizon } from '../../../../types/ownihrz.js';

async function generateBotHTML(
    client: Client,
    data: Custom_iHorizon,
    bot: any,
    lang: LanguageData
): Promise<string> {
    let htmlContent = client.htmlfiles['botProfileCard'];

    const PowerOff = data.PowerOff ? false : true;
    const accentColor = PowerOff ? '#23a559' : '#f23f43';
    const statusColor = PowerOff ? '#23a559' : '#f23f43';
    const statusText = PowerOff ? 'Online' : 'Offline';

    return htmlContent
        .replaceAll('AVATAR_URL', `https://cdn.discordapp.com/avatars/${data.Bot.Id}/${bot?.bot?.avatar}.png`)
        .replaceAll('ACCENT_COLOR', accentColor)
        .replaceAll('STATUS_COLOR', statusColor)
        .replaceAll('STATUS_TEXT', statusText)
        .replaceAll('BOT_NAME', bot?.bot?.username || data?.Bot?.Name)
        .replaceAll('BOT_USERNAME', bot?.bot?.username || data?.Bot?.Name)
        .replaceAll('BOT_ID', data.Bot.Id)
        .replaceAll('PUBLIC_STATUS', bot?.bot_public ? lang.mybot_list_utils_msg_yes : lang.mybot_list_utils_msg_no)
        .replaceAll('OWNER_TAG', `@${(await client.users.fetch(data.OwnerOne)).username}`)
        .replaceAll('EXPIRE_DATE', format(new Date(data.ExpireIn), 'ddd, MMM DD YYYY'))
        .replaceAll('BOT_CODE', data.Code || 'N/A');
}

async function buildEmbed(
    client: Client,
    data: any,
    lang: LanguageData,
    interaction: ChatInputCommandInteraction
): Promise<{ embed: EmbedBuilder; attachment: AttachmentBuilder }> {
    let bot = (await client.ownihrz.Get_Bot(data.Auth).catch(() => { }))?.data || 404;

    const htmlContent = await generateBotHTML(client, data, bot, lang);

    const image = await client.method.imageManipulation.html2Png(htmlContent, {
        elementSelector: '.card',
        omitBackground: true,
        selectElement: true,
    });
    const attachment = new AttachmentBuilder(image, { name: `bot-${data.Bot.Id}.png` });

    let expire = format(new Date(data.ExpireIn), 'ddd, MMM DD YYYY');
    const embed = new EmbedBuilder()
        .setColor('#ff7f50')
        .setDescription(lang.mybot_list_embed1_desc
            .replace("${client.iHorizon_Emojis.icon.Warning_Icon}", client.iHorizon_Emojis.icon.Warning_Icon)
            .replace('${data_2[i].code}', data.Code)
            .replace('${expire}', expire)
            .replace('${utils_msg}', ""))
        .setTitle(lang.mybot_list_embed1_title.replace('${data_2[i].bot.username}', bot?.bot?.username || data?.Bot?.Name))
        .setImage(`attachment://bot-${data.Bot.Id}.png`)
        .setFooter(await client.method.bot.footerBuilder(interaction))
        .setTimestamp();

    return { embed, attachment };
}

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let table_1 = client.db.table("OWNIHRZ");
        let data_2 = await table_1.get(`MAIN.${interaction.user.id}`);
        let allData = await table_1.get("CLUSTER");

        let embeds: EmbedBuilder[] = [
            new EmbedBuilder()
                .setTitle(lang.mybot_list_embed0_title)
                .setColor('#000000')
                .setFooter(await client.method.bot.footerBuilder(interaction))
                .setTimestamp()
        ];

        let attachments: AttachmentBuilder[] = [];

        for (let botId in data_2) {
            if (data_2[botId]) {
                const { embed, attachment } = await buildEmbed(
                    client,
                    data_2[botId],
                    lang,
                    interaction
                );
                embeds.push(embed);
                attachments.push(attachment);
            }
        }

        if (allData && allData[interaction.user.id]) {
            for (let botId in allData[interaction.user.id]) {
                const { embed, attachment } = await buildEmbed(
                    client,
                    allData[interaction.user.id][botId],
                    lang,
                    interaction
                );
                embeds.push(embed);
                attachments.push(attachment);
            }
        }

        await interaction.editReply({
            embeds: embeds,
            files: [...attachments, await client.method.bot.footerAttachmentBuilder(interaction)]
        });

        return;
    }
};
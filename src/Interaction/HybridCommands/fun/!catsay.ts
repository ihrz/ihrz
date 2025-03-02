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
} from 'discord.js';

import Jimp from 'jimp';

import { LanguageData } from '../../../../types/languageData.js';
import { axios } from '../../../core/functions/axios.js';
import { SubCommand } from '../../../../types/command.js';


export const subCommand: SubCommand = {
  run: async (
    client: Client,
    interaction: ChatInputCommandInteraction<"cached"> | Message,
    lang: LanguageData,
    args?: string[]
  ) => {

    let baseImg = (await axios.get('https://api.thecatapi.com/v1/images/search?mime_types=jpg,png')).data;

    if (await client.db.get(`${interaction.guildId}.GUILD.FUN.states`) === "off") {
      await client.func.method.interactionSend(interaction, { content: "You cannot use this command, the fun commands category is disable." });
      return;
    };

    if (interaction instanceof ChatInputCommandInteraction) {
      var text = interaction.options.getString('text')?.slice(0, 30);
    } else {
      var text = client.func.method.longString(args!, 0)?.slice(0, 30);
    }

    let font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

    const newImg = await Jimp.read(baseImg[0].url);
    const textWidth = Jimp.measureText(font, text);
    const textHeight = Jimp.measureTextHeight(font, text, newImg.bitmap.width);
    const textX = (newImg.bitmap.width - textWidth) / 2;
    const textY = newImg.bitmap.height - textHeight - 10;

    newImg.print(font, textX, textY, text);

    let embed = new EmbedBuilder()
      .setColor('#000000')
      .setImage('attachment://catsay.png')
      .setTimestamp()
      .setFooter(await client.func.displayBotName.footerBuilder(interaction));

    let imgs: AttachmentBuilder | undefined;

    try {
      imgs = new AttachmentBuilder(await newImg.getBufferAsync(Jimp.MIME_GIF), { name: 'catsay.png' });
      embed.setImage(`attachment://catsay.png`);

      if (imgs) {
        await client.func.method.interactionSend(interaction, {
          embeds: [embed],
          files: [imgs, await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
        });
      };

    } catch {
      await client.func.method.interactionSend(interaction, { content: lang.fun_var_down_api });
    }

    return;
  },
};

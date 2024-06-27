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
} from 'pwss'

import { AxiosResponse, axios } from '../../../core/functions/axios.js';

export default {
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {

    // Guard's Typing
    if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

    let user = interaction.options.getUser('user') || interaction.user;
    let link = `https://some-random-api.com/canvas/misc/transgender?avatar=${encodeURIComponent(user.displayAvatarURL({ extension: 'png', size: 1024 }))}`;

    let embed = new EmbedBuilder()
      .setColor('#000000')
      .setImage('attachment://all-human-have-rights-elektra.png')
      .setTimestamp()
      .setFooter({ text: 'iHorizon x ElektraBots', iconURL: "attachment://icon.png" });

    let imgs: AttachmentBuilder | undefined;

    let response: AxiosResponse = await axios.get(link, { responseType: 'arrayBuffer' })
    imgs = new AttachmentBuilder(Buffer.from(response.data, 'base64'), { name: 'all-humans-have-right-elektra.png' });
    embed.setImage(`attachment://all-humans-have-right-elektra.png`);

    await interaction.editReply({
      embeds: [embed],
      files: [
        imgs,
        {
          attachment: await client.func.image64(client.user.displayAvatarURL()), name: 'icon.png'
        }
      ]
    });
    return;
  },
};
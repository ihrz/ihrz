/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
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
} from 'discord.js'

import axios, { AxiosResponse } from 'axios';

export = {
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {

    let user = interaction.options.getUser('user') || interaction.user;
    let link = `https://some-random-api.com/canvas/misc/transgender?avatar=${encodeURIComponent(user.displayAvatarURL({ extension: 'png' }))}`;

    let embed = new EmbedBuilder()
      .setColor('#000000')
      .setImage('attachment://all-human-have-rights-elektra.png')
      .setTimestamp()
      .setFooter({ text: 'iHorizon x ElektraBots', iconURL: client.user?.displayAvatarURL() });

    let imgs: AttachmentBuilder;

    await axios.get(link, { responseType: 'arraybuffer' }).then((response: AxiosResponse) => {
      imgs = new AttachmentBuilder(Buffer.from(response.data, 'base64'), { name: 'all-humans-have-right-elektra.png' });
      embed.setImage(`attachment://all-humans-have-right-elektra.png`);
    });

    await interaction.editReply({ embeds: [embed], files: [imgs!] });
    return;
  },
};
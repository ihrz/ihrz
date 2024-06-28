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

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    User,
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';

async function interactionSend(interaction: ChatInputCommandInteraction | Message, options: string | MessagePayload | InteractionEditReplyOptions): Promise<Message> {
    if (interaction instanceof ChatInputCommandInteraction) {
        return await interaction.editReply(options);
    } else {
        return await interaction.reply((options as MessagePayload).options = { allowedMentions: { repliedUser: false } });
    }
};


export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getUser("member") || interaction.user;
        } else {
            var member = client.args.user(interaction, 0) || interaction.member.user;
        };

        let baseData = await client.db.get(`${interaction.guildId}.USER.${member.id}.INVITES`);

        let inv = baseData?.invites;
        let leaves = baseData?.leaves;
        let Regular = baseData?.regular;
        let bonus = baseData?.bonus;

        let embed = new EmbedBuilder()
            .setColor("#92A8D1")
            .setTitle(data.invites_confirmation_embed_title)
            .setTimestamp()
            .setThumbnail(member.displayAvatarURL())
            .setDescription(
                data.invites_confirmation_embed_description
                    .replace(/\${member\.user\.id}/g, member.id)
                    .replace(/\${bonus\s*\|\|\s*0}/g, bonus || 0)
                    .replace(/\${leaves\s*\|\|\s*0}/g, leaves || 0)
                    .replace(/\${Regular\s*\|\|\s*0}/g, Regular || 0)
                    .replace(/\${inv\s*\|\|\s*0}/g, inv || 0)
            );

        await interactionSend(interaction, { embeds: [embed] });
        return;
    },
};
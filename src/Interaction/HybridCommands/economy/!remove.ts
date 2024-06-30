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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Message,
    PermissionsBitField,
    User,
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/arg';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.args.interactionSend(interaction, { content: data.removemoney_not_admin });
            return;
        };

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await client.args.interactionSend(interaction,{
                content: data.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.member.user.id)
            });
            return;
        };

        if (interaction instanceof ChatInputCommandInteraction) {
            var amount = interaction.options.getNumber("amount") as number;
            var user = interaction.options.getUser("member") as User;
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!); if (!_) return;
            var amount = client.args.number(args!, 0) as number;
            var user = client.args.user(interaction, 0) as User;
        };

        await client.db.sub(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`, amount!);
        let bal = await client.db.get(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`);

        let embed = new EmbedBuilder()
            .setAuthor({ name: data.removemoney_embed_title, iconURL: (interaction.member.user as User).displayAvatarURL() })
            .addFields({ name: data.removemoney_embed_fields, value: `${amount}$` },
                { name: data.removemoney_embed_second_fields, value: `${bal}$` })
            .setColor("#bc0116")
            .setTimestamp()

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.removemoney_logs_embed_title)
                .setDescription(data.removemoney_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
                    .replace(/\${amount}/g, amount.toString())
                    .replace(/\${user\.user\.id}/g, user.id)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) };
        } catch (e) { return; };

        await client.args.interactionSend(interaction,{ embeds: [embed] });
        return;
    },
};
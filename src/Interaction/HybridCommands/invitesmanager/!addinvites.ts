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
    GuildMember,
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    MessageReplyOptions,
    PermissionsBitField,
    User,
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/arg';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var user = interaction.options.getMember("member") as GuildMember;
            var amount = interaction.options.getNumber("amount")!;
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var user = client.args.member(interaction, args!, 0)!;
            var amount = client.args.number(args!, 1);
        };

        let a = new EmbedBuilder().setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.all`) || "#FF0000").setDescription(data.addinvites_not_admin_embed_description);

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.args.interactionSend(interaction, { embeds: [a] });
            return;
        };

        let check = await client.db.get(`${interaction?.guild?.id}.USER.${user.id}.INVITES`);

        if (check) {
            await client.db.add(`${interaction.guildId}.USER.${user.id}.INVITES.invites`, amount!);
            await client.db.add(`${interaction.guildId}.USER.${user.id}.INVITES.bonus`, amount!);
        } else {

            await client.db.set(`${interaction?.guild?.id}.USER.${user.id}.INVITES`,
                {
                    regular: 0, bonus: 0, leaves: 0, invites: 0
                }
            );
            await client.db.add(`${interaction.guildId}.USER.${user.id}.INVITES.invites`, amount!);
            await client.db.add(`${interaction.guildId}.USER.${user.id}.INVITES.bonus`, amount!);
        };

        let finalEmbed = new EmbedBuilder()
            .setDescription(data.addinvites_confirmation_embed_description
                .replace(/\${amount}/g, amount!.toString())
                .replace(/\${user}/g, user.toString())
            )
            .setColor(await client.db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color.all`) || `#92A8D1`)
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL()! });

        await client.args.interactionSend(interaction, { embeds: [finalEmbed] });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.ihrz-logs`) || "#bf0bb9")
                .setTitle(data.addinvites_logs_embed_title)
                .setDescription(data.addinvites_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
                    .replace(/\${amount}/g, amount.toString())
                    .replace(/\${user\.id}/g, user.id)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
            };
        } catch {
            return;
        };
    },
};
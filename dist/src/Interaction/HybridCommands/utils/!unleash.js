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
import { PermissionsBitField, ChatInputCommandInteraction } from 'discord.js';
export default {
    run: async (client, interaction, lang, command, neededPerm, args) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel)
            return;
        if (interaction instanceof ChatInputCommandInteraction) {
            var user = interaction.options.getMember("member");
        }
        else {
            var user = client.method.member(interaction, args, 0);
        }
        const permissionsArray = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.MoveMembers];
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);
        if (!permissions && neededPerm === 0) {
            await client.method.interactionSend(interaction, { content: lang.punishpub_not_admin });
            return;
        }
        let fetchedData = await client.db.get(`${interaction.guildId}.UTILS.LEASH`);
        const pairingToRemove = fetchedData?.find(x => (x.dom === interaction.member?.user.id && x.sub === user.id));
        if (!pairingToRemove) {
            await client.method.interactionSend(interaction, {
                content: `${client.iHorizon_Emojis.icon.No_Logo} | This user is not on your leash!`
            });
            return;
        }
        const updatedData = fetchedData?.filter(x => !(x.dom === interaction.member?.user.id && x.sub === user.id));
        await client.db.set(`${interaction.guildId}.UTILS.LEASH`, Array.from(new Set(updatedData)));
        await client.method.interactionSend(interaction, {
            content: `${client.iHorizon_Emojis.icon.Yes_Logo} | You have successfully unleashed the user in this guild :)`
        });
    },
};

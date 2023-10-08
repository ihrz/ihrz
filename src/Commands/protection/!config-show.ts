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

import {
    Client,
    EmbedBuilder,
} from 'discord.js';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        if (interaction.user.id !== interaction.guild.ownerId) {
            await interaction.editReply({ content: 'Only the owner of the server can edit the authorization rule about the protection module!' });
            return;
        };

        var text = "";
        var text2 = "";

        let baseData = await client.db.get(`${interaction.guild.id}.ALLOWLIST`);

        let baseData4Protection = await client.db.get(`${interaction.guild.id}.PROTECTION`);

        if (!baseData || !baseData4Protection) {
            await interaction.editReply({ content: "You have not anything!" });
            return;
        };

        for (var i in baseData?.list) {
            text += `<@${i}>\n`
        };

        for (var i in baseData4Protection) {
            if (i !== 'SANCTION') {
                var a = baseData4Protection[i].mode;
                text2 += `**${i.toUpperCase()}** -> \`${a}\`\n`
            }
        };

        let okay = '';
        if (baseData4Protection.SANCTION === 'simply') okay = 'Simply Cancel Action'
        if (baseData4Protection.SANCTION === 'simply+ban') okay = 'Simply Cancel Action & Ban'
        if (baseData4Protection.SANCTION === 'simply+derank') okay = 'Simply Cancel Action & Unrank'

        text2 += `\`\`\`Punishement: ${okay}\`\`\``;

        let iconURL: any = client.user?.displayAvatarURL();

        let embed1 = new EmbedBuilder()
            .setColor('#000000')
            .setAuthor({ name: "Rule List" })
            .setDescription(text2)
            .setFooter({ text: 'iHorizon', iconURL: iconURL })
            .setTimestamp();

        let embed2 = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: "Allowlist" })
            .setDescription(text)
            .setFooter({ text: 'iHorizon', iconURL: iconURL })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed1, embed2] });
        return;
    },
};
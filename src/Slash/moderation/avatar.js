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

const {
    Client,
    Intents,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'See the user avatar !',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'The user',
            required: false
        }
    ],
    run: async (client, interaction) => {

        let msg = await interaction.channel.send(`Loading...`);

        let mentionedUser = interaction.options.getUser("user") || interaction.user;

        let embed = new EmbedBuilder()

            .setImage(mentionedUser.avatarURL({ format: 'png', dynamic: true, size: 512 }))
            .setColor("#add5ff")
            .setTitle("__**Avatar**__: \`" + mentionedUser.username + "\`")
            .setDescription("Look this avatar :D")
            .setTimestamp()

        msg.delete()
        return interaction.reply({ embeds: [embed] })
    }
}
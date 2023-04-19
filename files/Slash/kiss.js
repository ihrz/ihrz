
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
    name: 'kiss',
    description: 'kiss a user !',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'The user you want to kiss',
            required: true
        }
    ],

    run: async (client, interaction) => {

        const kiss2 = interaction.options.getUser("user")
        if (!kiss2) return interaction.reply({ content: `I couldn't find a user.` });

        var kiss = [
            'https://cdn.discordapp.com/attachments/600751265781252149/613486150002278630/tenor-4.gif',
            'https://cdn.discordapp.com/attachments/600751265781252149/613486548561952788/tenor-5.gif',
            'https://cdn.discordapp.com/attachments/717813904046293063/717818490601603072/kiss1.gif',
            'https://cdn.discordapp.com/attachments/717813904046293063/717818780910223410/kiss2.gif'

        ];

        const embed = new EmbedBuilder()
            .setColor("#ff0884")
            .setDescription("<@" + interaction.user.id + `> kiss <@${kiss2.id}> !`)
            .setImage(kiss[Math.floor(Math.random() * kiss.length)])
            .setTimestamp()

        return interaction.reply({ embeds: [embed] });
    }
}
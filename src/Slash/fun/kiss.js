
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

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);

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
        let fileContents = fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        const kiss = interaction.options.getUser("user")

        var kissGif = [
            'https://cdn.discordapp.com/attachments/600751265781252149/613486150002278630/tenor-4.gif',
            'https://cdn.discordapp.com/attachments/600751265781252149/613486548561952788/tenor-5.gif',
            'https://cdn.discordapp.com/attachments/717813904046293063/717818490601603072/kiss1.gif',
            'https://cdn.discordapp.com/attachments/717813904046293063/717818780910223410/kiss2.gif'

        ];

        const embed = new EmbedBuilder()
            .setColor("#ff0884")
            .setDescription(data.kiss_embed_description
                .replace(/\${kiss\.id}/g, kiss.id)
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
            )
            .setImage(kissGif[Math.floor(Math.random() * kissGif.length)])
            .setTimestamp()

        return interaction.reply({ embeds: [embed] });
    }
}
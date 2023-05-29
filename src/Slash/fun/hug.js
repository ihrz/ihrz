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
    name: 'hug',
    description: 'hug someone !',
    options: [
        {
            name: "user",
            type: ApplicationCommandOptionType.User,
            description: "The user you want to hug",
            required: true
        }
    ],

    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = await getLanguageData(interaction.guild.id);

        const hug = interaction.options.getUser("user");

        var hugGif = [
            'https://cdn.discordapp.com/attachments/975288553787494450/1053838033373368350/hug.gif',
            'https://cdn.discordapp.com/attachments/975288553787494450/1053838033675366461/hug2.gif',
            'https://cdn.discordapp.com/attachments/975288553787494450/1053838033994129448/hug3.jpg',
            "https://cdn.discordapp.com/attachments/975288553787494450/1053838034191257650/hug4.jpg",
            "https://cdn.discordapp.com/attachments/975288553787494450/1053838034375815339/hug5.jpg"
        ];

        const embed = new EmbedBuilder()
            .setColor("#FFB6C1")
            .setDescription(data.hug_embed_title
                .replace(/\${hug\.id}/g, hug.id)
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
            )
            .setImage(hugGif[Math.floor(Math.random() * hugGif.length)])
            .setTimestamp()
        return interaction.reply({ embeds: [embed] });

    }
};

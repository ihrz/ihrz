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
    name: 'slap',
    description: 'slape someone !',
    options: [
        {
            name: "user",
            type: ApplicationCommandOptionType.User,
            description: "The user you want to slap",
            required: true
        }
    ],

    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = getLanguageData(interaction.guild.id);
        
        var slapGif = [
            'https://cdn.discordapp.com/attachments/717813924203855882/717982041899139152/slap1.gif',
            'https://cdn.discordapp.com/attachments/717813924203855882/717982255661711381/slap2.gif',
            'https://cdn.discordapp.com/attachments/717813924203855882/717982464299106314/slap3.gif'

        ];
        const slap = interaction.options.getUser("user");

        const embed = new EmbedBuilder()
            .setColor("#42ff08")
            .setDescription(data.slap_embed_description
                .replace(/\${slap\.id}/g, slap.id)
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
            )
            .setImage(slapGif[Math.floor(Math.random() * slapGif.length)])
            .setTimestamp()
        return interaction.reply({ embeds: [embed] });
    }
}

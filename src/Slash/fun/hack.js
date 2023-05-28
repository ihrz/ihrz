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
    name: 'hack',
    description: 'hack someone !',
    options: [
        {
            name: "user",
            type: ApplicationCommandOptionType.User,
            description: "The user you want to hack",
            required: true
        }
    ],
    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = getLanguageData(interaction.guild.id);
        
        const victim = interaction.options.getUser("user")

        var ip = [
            '1',
            '100',
            '168',
            '254',
            '345'

        ];
        var Email = [
            'discordmoderator@gmail.com',
            'fbi.open.up@gmail.com',
            'fan.ofdream@gmail.com',
            'bruhmoment@gmail.com',
            'elhax0r1337@anonymail.ru'
        ];
        var Password = [
            'sxmfg22',
            'pifpaf44',
            'ursoxko332',
            'password223',
            'roblox556',
            '123'
        ];

        const embed = new EmbedBuilder()
            .setColor("#800000")
            .setDescription(data.hack_embed_description
                .replace(/\${victim\.id}/g, victim.id)
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                )
            .addFields({ name: data.hack_embed_fields_ip, value: `\`${ip[Math.floor(Math.random() * ip.length)]}.${ip[Math.floor(Math.random() * ip.length)]}.${ip[Math.floor(Math.random() * ip.length)]}.${ip[Math.floor(Math.random() * ip.length)]}\`` },
                { name: data.hack_embed_fields_email, value: `\`${Email[Math.floor(Math.random() * Email.length)]}\`` },
                { name: data.hack_embed_fields_password, value: `\`${Password[Math.floor(Math.random() * Password.length)]}\`` })
            .setTimestamp()

        return interaction.reply({ embeds: [embed] });
    }
};
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
        let data = await getLanguageData(interaction.guild.id);
        
        const victim = interaction.options.getUser("user")

        var ip = [
            '1',
            '100',
            '168',
            '254',
            '345',
            '128',
            '256',
            '255',
            '0',
            '144',
            '38',
            '67',
            '97',
            '32',
            '64'
        ];
        var Email = [
            'discordmoderator@gmail.com',
            'fbi.open.up@gmail.com',
            'fan.ofdream@gmail.com',
            'bruhmoment@gmail.com',
            'elhax0r1337@anonymail.ru',
            'vladimir@gmail.ru',
            'elonmusk@yahoo.com',
            'emanuel.macron@gov.skem.ru',
            'misterbeastcontact@gmail.com',
            'misterbeastpro@gmail.com',
            'fghjkgbnfvbjifvbjutgbnjiuhn@gmail.com',
            'contact@ovh.cloud',
            'jobs@discord.com',
            'poutin@yandex.ru',
        ];
        var Password = [
            'sxmfg22',
            'pifpaf44',
            'ursoxko332',
            'password223',
            'roblox556',
            '123',
            'password',
            'minecraft595',
            '0123456789',
            'Password!',
            '31012005'
        ];

        // make a fonction for generate random number with lengt of 8 digits
        function generateRandomNumber() {
            var text = "";
            var possible = "0123456789";
            for (var i = 0; i < 8; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
            return text;
        };

        var PhoneNumber = ["+33", "+34", "+35", "+36", "+37", "+38", "+39", "+40", "+41", "+42", "+43", "+44", "+45", "+46", "+47", "+48", "+49", "+50", "+51", "+52", "+53", "+54", "+55"];
        const embed = new EmbedBuilder()
            .setColor("#800000")
            .setDescription(data.hack_embed_description
                .replace(/\${victim\.id}/g, victim.id)
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                )
            .addFields({ name: data.hack_embed_fields_ip, value: `\`${ip[Math.floor(Math.random() * ip.length)]}.${ip[Math.floor(Math.random() * ip.length)]}.${ip[Math.floor(Math.random() * ip.length)]}.${ip[Math.floor(Math.random() * ip.length)]}\`` },
                { name: data.hack_embed_fields_email, value: `\`${Email[Math.floor(Math.random() * Email.length)]}\`` },
                { name: "☎", value: `\`${PhoneNumber[Math.floor(Math.random() * PhoneNumber.length)]}${generateRandomNumber()}\`` },
                { name: data.hack_embed_fields_password, value: `\`${Password[Math.floor(Math.random() * Password.length)]}\`` })
            .setTimestamp()

        return interaction.reply({ embeds: [embed] });
    }
};
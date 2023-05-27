const { QuickDB } = require("quick.db");
const db = new QuickDB();
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
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = {
    name: 'prevnames',
    description: 'Lookup an Discord User, and see this previous username !',
    options: [{
        name: 'user', type: ApplicationCommandOptionType.User,
        description: 'user you want to lookup', required: true
    }],
    run: async (client, interaction) => {
        let user = interaction.options.getUser("user");

        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: "" })

        let fetch = await db.get(`DB.PREVNAMES.${user.id}`) || data.prevnames_undetected;

        let prevEmbed = new EmbedBuilder().setColor("#000000");
        prevEmbed.setTitle(``);
        prevEmbed.setDescription(fetch.join('\n'));
        prevEmbed.setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) });

        return interaction.reply({ embeds: [prevEmbed] });
    }
};
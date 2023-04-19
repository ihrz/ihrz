const fs = require("fs");
const {
    Client,
    Intents,
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const config = require('../config.json')

module.exports = {
    name: 'owner',
    description: 'add user to owner list (can\'t be used by normal member)',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'The member you want to made operator',
            required: false
        }
    ],

    run: async (client, interaction) => {
        var text = ""
        const ownerList = await db.all()
        for (var i in ownerList[0].value.OWNER) {
            text += `<@${i}>\n`
        }

        let embed = new EmbedBuilder()
            .setColor('#2E2EFE')
            .setAuthor({ name: "Owners" })
            .setDescription(`${text}`)
            .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })

        let member = interaction.options.getMember('member')
        if (!member) return interaction.reply({ embeds: [embed] });
        if (await db.get(`GLOBAL.OWNER.${interaction.user.id}.owner`) !== true) return interaction.reply("You are not operator !")
        let checkAx = await db.get(`GLOBAL.OWNER.${member.id}.owner`)
        if (!checkAx != true) {
            return interaction.reply("This user is already owner !")
        }
        db.set(`GLOBAL.OWNER.${member.user.id}.owner`, true),
            interaction.reply(`${member.user.username} is now owner of the iHorizon Projects`);

        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}
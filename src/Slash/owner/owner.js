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
const yaml = require('js-yaml')
module.exports = {
    name: 'owner',
    description: 'add user to owner list (can\'t be used by normal member)',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'The member you want to made owner of the iHorizon Projects',
            required: false
        }
    ],

    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = getLanguageData(interaction.guild.id);

        var text = "";
        const ownerList = await db.all();
        const foundArray = ownerList.findIndex(ownerList => ownerList.id === "GLOBAL");
        const char = ownerList[foundArray].value.OWNER;
        for (var i in char) {
            text += `<@${i}>\n`
        }
        if (!text.includes(interaction.user.id)) {
            return interaction.reply({ content: data.owner_not_owner })
        };

        let embed = new EmbedBuilder()
            .setColor("#2E2EFE")
            .setAuthor({ name: "Owners" })
            .setDescription(`${text}`)
            .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })

        let member = interaction.options.getMember('member')
        if (!member) return interaction.reply({ embeds: [embed] });
        let checkAx = await db.get(`GLOBAL.OWNER.${member.id}.owner`)
        if (!checkAx != true) {
            return interaction.reply({ content: data.owner_already_owner })
        }

        db.set(`GLOBAL.OWNER.${member.user.id}.owner`, true),
            interaction.reply({ content: data.owner_is_now_owner.replace(/\${member\.user\.username}/g, member.user.username) });
    }
}
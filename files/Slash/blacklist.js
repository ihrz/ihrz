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

const yaml = require('js-yaml'), fs = require('fs');

module.exports = {
    name: 'blacklist',
    description: 'Blacklist a user on the bot (must be owner of the bot)',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'The user you want to blacklist...',
            required: false
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
        let data = yaml.load(fileContents)
        const { QuickDB } = require("quick.db");
        const db = new QuickDB();

        if (await db.get(`GLOBAL.OWNER.${interaction.user.id}.owner`) !== true) {
            return interaction.reply({ content: data.blacklist_not_owner });
        }

        var text = ""
        const ownerList = await db.all()
        for (var i in ownerList[0].value.BLACKLIST) {
            text += `<@${i}>\n`
        }

        let embed = new EmbedBuilder()
            .setColor('#2E2EFE')
            .setAuthor({ name: 'Blacklist' })
            .setDescription(text || "No blacklist")
            .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
        const member = interaction.options.getMember('member')
        if (!member) return interaction.reply({ embeds: [embed] });

        if (member.user.id === client.user.id) return interaction.reply({ content: data.blacklist_bot_lol })

        let fetched = await db.get(`GLOBAL.BLACKLIST.${member.user.id}`)

        if (!fetched) {
            await db.set(`GLOBAL.BLACKLIST.${member.user.id}`, { blacklisted: true })
            if (member.bannable) {
                member.ban({ reason: "blacklisted !" })
                return interaction.reply({ content: data.blacklist_command_work.replace(/\${member\.user\.username}/g, member.user.username) });
            } else {
                await db.set(`GLOBAL.BLACKLIST.${member.user.id}`, { blacklisted: true })
                return interaction.reply({ content: data.blacklist_blacklisted_but_can_ban_him })
            }
        } else {
            return interaction.reply({ content: data.blacklist_already_blacklisted.replace(/\${member\.user\.username}/g, member.user.username) });
        }
    }
}
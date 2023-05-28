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

const yaml = require('js-yaml')
const fs = require('fs');
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);

module.exports = {
    name: 'unblacklist',
    description: 'Unblacklist a typed member',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'The user you want to unblacklist (Only Owner of ihorizon)',
            required: true
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);
        const { QuickDB } = require("quick.db");
        const db = new QuickDB();

        if (await db.get(`GLOBAL.OWNER.${interaction.user.id}.owner`) !== true) {
            return interaction.reply({ content: data.unblacklist_not_owner });
        }

        const member = interaction.options.getUser('member')
        let fetched = await db.get(`GLOBAL.BLACKLIST.${member.id}`)

        if (!fetched) { return interaction.reply({ content: data.unblacklist_not_blacklisted.replace(/\${member\.id}/g, member.id) }) }

        try {
            let bannedMember = await client.users.fetch(member.user.id)
            if (!bannedMember) { return interaction.reply({ content: data.unblacklist_user_is_not_exist }) }
            interaction.guild.members.unban(bannedMember)
            db.delete(`GLOBAL.BLACKLIST.${member.id}`);

            return interaction.reply({ content: data.unblacklist_command_work.replace(/\${member\.id}/g, member.id) })
        } catch (e) {
            db.delete(`GLOBAL.BLACKLIST.${member.id}`);
            return interaction.reply({ content: data.unblacklist_unblacklisted_but_can_unban_him })
        }
    }
}
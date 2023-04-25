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
module.exports = {
    name: 'removemoney',
    description: 'remove money to the bank of the typed user',
    options: [
        {
            name: 'amount',
            type: ApplicationCommandOptionType.Number,
            description: 'amount of $ you want add',
            required: true
        },
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'the member you want to add the money',
            required: true
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
        let data = yaml.load(fileContents)
        const filter = (interaction) => interaction.user.id === interaction.member.id;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.removemoney_not_admin })
        }

        var amount = interaction.options.getNumber("amount")
        let user = interaction.options.get("member")
        await db.sub(`${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`, amount)
        let bal = await db.get(`${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`)

        let embed = new EmbedBuilder()
            .setAuthor({ name: data.removemoney_embed_title, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
            .addFields({ name: data.removemoney_embed_fields, value: `${amount}$` },
                { name: data.removemoney_embed_second_fields, value: `${bal}$` })
            .setColor("#bc0116")
            .setTimestamp()

        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.removemoney_logs_embed_title)
                .setDescription(data.removemoney_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)    
                    .replace(/\${amount}/g, amount)    
                    .replace(/\${user\.user\.id}/g, user.user.id)    
                    )

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { return };


        return interaction.reply({ embeds: [embed] })
    }
}
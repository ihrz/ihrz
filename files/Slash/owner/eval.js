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
const logger = require(`${process.cwd()}/files/core/logger`);

module.exports = {
    name: 'eval',
    description: 'Run Javascript program (only for developers)',
    options: [
        {
            name: 'code',
            type: ApplicationCommandOptionType.String,
            description: 'javascript code',
            required: true
        }
    ],
    run: async (client, interaction) => {
        const print = (message) => { logger.log(message); }

        const { QuickDB } = require("quick.db");
        const db = new QuickDB();
        if (interaction.user.id !== "171356978310938624") return;
        var result = interaction.options.getString("code")
        let evaled = eval(result);

        let embed = new EmbedBuilder()
            .setColor("#468468")
            .setTitle("This block was evalued with iHorizon.")
            .setDescription(`\`\`\`JS\n${result || "None"}\n\`\`\``)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        return interaction.reply({ embeds: [embed], ephemeral: true })
    }
}
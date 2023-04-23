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
    name: 'punishpub',
    description: 'Punish user when them advertise on your server!',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'Choose the action',
            required: true,
            choices: [
                {
                    name: "POWER ON",
                    value: "true"
                },
                {
                    name: "POWER OFF",
                    value: "false"
                }
            ]
        },
        {
            name: 'amount',
            type: ApplicationCommandOptionType.Number,
            description: 'The max amount of flags before punishement',
            required: false,
        },
        {
            name: 'punishement',
            type: ApplicationCommandOptionType.String,
            description: 'Choose the punishement',
            required: false,
            choices: [
                {
                    name: "BAN",
                    value: "ban"
                },
                {
                    name: "KICK",
                    value: "kick"
                },
                {
                    name: "MUTE",
                    value: "mute"
                }
            ]
        }
    ],

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply(":x: | You must be an administrator of this server to request this commands!");


        const { QuickDB } = require("quick.db");
        const db = new QuickDB();

        let action = interaction.options.getString("action");
        let amount = interaction.options.getNumber("amount");
        let punishement = interaction.options.getString("punishement")

        if (action == "true") {
            if (amount > 20) { return interaction.reply({ content: "You amount is too high ! Is not recommended !" }) };
            if (amount < 0) { return interaction.reply({ content: "You can't type negative number !" }) };
            if (amount == 0) { return interaction.reply({ content: "The number 0 is not possible !" }) };

            await db.set(`${interaction.guild.id}.GUILD.PUNISH`,
                {
                    amountMax: amount,
                    punishementType: punishement,
                    state: action
                });

            interaction.reply({ content: "In dev but i think is good !" })

            try {
                logEmbed = new EmbedBuilder()
                  .setColor("#bf0bb9")
                  .setTitle("PunishPub Logs")
                  .setDescription(`<@${interaction.user.id}> set the PunishPUB to on with an amout of ${amount} max flags with ${punishement} punishement !`)
          
                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
              } catch (e) { return };

        } else {
            try {
                logEmbed = new EmbedBuilder()
                  .setColor("#bf0bb9")
                  .setTitle("PunishPub Logs")
                  .setDescription(`<@${interaction.user.id}> set the PunishPUB to off !`)
          
                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
              } catch (e) { return console.error(e)};
              
            await db.delete(`${interaction.guild.id}.GUILD.PUNISH`);
            interaction.reply({ content: "(2) In dev but i think is good !" })
        };
    }
}
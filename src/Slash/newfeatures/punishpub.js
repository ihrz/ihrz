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
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.punishpub_not_admin });
        }

        const { QuickDB } = require("quick.db");
        const db = new QuickDB();

        let action = interaction.options.getString("action");
        let amount = interaction.options.getNumber("amount");
        let punishement = interaction.options.getString("punishement")

        if (action == "true") {
            if (amount > 50) { return interaction.reply({ content: data.punishpub_too_hight_enable }) };
            if (amount < 0) { return interaction.reply({ content: data.punishpub_negative_number_enable }) };
            if (amount == 0) { return interaction.reply({ content: data.punishpub_zero_number_enable }) };

            await db.set(`${interaction.guild.id}.GUILD.PUNISH.PUNISH_PUB`,
                {
                    amountMax: amount-1,
                    punishementType: punishement,
                    state: action
                });

            interaction.reply({ content: data.punishpub_confirmation_message_enable
                .replace("${interaction.user.id}", interaction.user.id)
                .replace("${amount}", amount)
                .replace("${punishement}", punishement)
            })

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.punishpub_logs_embed_title)
                    .setDescription(data.punishpub_logs_embed_description
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${amount}", amount)
                        .replace("${punishement}", punishement)
                    )
                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { };

        } else {
            await db.delete(`${interaction.guild.id}.GUILD.PUNISH.PUNISH_PUB`);
            interaction.reply({ content: data.punishpub_confirmation_disable })

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.punishpub_logs_embed_title_disable)
                    .setDescription(data.punishpub_logs_embed_description_disable
                        .replace("${interaction.user.id}", interaction.user.id)
                    )
                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { };
        };
    }
};
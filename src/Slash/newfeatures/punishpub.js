/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

const slashInfo = require(`${process.cwd()}/files/ihorizon-api/slashHandler`);

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

const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

slashInfo.newfeatures.punishpub.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: data.punishpub_not_admin });
    }

    

    let action = interaction.options.getString("action");
    let amount = interaction.options.getNumber("amount");
    let punishment = interaction.options.getString("punishement");

    if (action == "true") {
        if (amount > 50) { return interaction.reply({ content: data.punishpub_too_hight_enable }) };
        if (amount < 0) { return interaction.reply({ content: data.punishpub_negative_number_enable }) };
        if (amount == 0) { return interaction.reply({ content: data.punishpub_zero_number_enable }) };

        await DataBaseModel({id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.PUNISH.PUNISH_PUB`, values:
            {
                amountMax: amount - 1,
                punishementType: punishment,
                state: action
            }});
        // await db.set(`${interaction.guild.id}.GUILD.PUNISH.PUNISH_PUB`,
        //     {
        //         amountMax: amount - 1,
        //         punishementType: punishement,
        //         state: action
        //     });

        interaction.reply({
            content: data.punishpub_confirmation_message_enable
                .replace("${interaction.user.id}", interaction.user.id)
                .replace("${amount}", amount)
                .replace("${punishment}", punishment)
        })

        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.punishpub_logs_embed_title)
                .setDescription(data.punishpub_logs_embed_description
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${amount}", amount)
                    .replace("${punishment}", punishment)
                )
            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { };

    } else {
        // await db.delete(`${interaction.guild.id}.GUILD.PUNISH.PUNISH_PUB`);
        await DataBaseModel({id: DataBaseModel.Delete, key:`${interaction.guild.id}.GUILD.PUNISH.PUNISH_PUB`});
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
};

module.exports = slashInfo.newfeatures.punishpub;
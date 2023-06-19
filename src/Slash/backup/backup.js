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
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');

const backup = require('discord-backup')
backup.setStorageFolder(`${process.cwd()}/files/ihorizon-api/backups/`);

const logger = require(`${process.cwd()}/src/core/logger`);
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

slashInfo.backup.backup.run = async (client, interaction) => {
    let data = await getLanguageData(interaction.guild.id);

    let backup_options = interaction.options.getString('action');
    let backupID = interaction.options.getString('backup-id');

    await interaction.reply({ content: data.backup_wait_please });

    if (backup_options === "create") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: data.backup_not_admin });
        }
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: data.backup_i_dont_have_permission })
        }
        i = 0; j = 0;

        backup.create(interaction.guild, {
            maxMessagesPerChannel: 15,
            jsonBeautify: true
        }).then(async (backupData) => {
            await backupData.channels.categories.forEach(category => { i++; category.children.forEach(() => { j++; }); });
            elData =  {guildName: backupData.name, categoryCount: i, channelCount: j};

            await DataBaseModel({id: DataBaseModel.Set, key: `BACKUPS.${interaction.user.id}.${backupData.id}`, value: elData});

            interaction.channel.send({ content: data.backup_command_work_on_creation });
            interaction.editReply({
                content: data.backup_command_work_info_on_creation
                    .replace("${backupData.id}", backupData.id)
            });
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.backup_logs_embed_title_on_creation)
                    .setDescription(data.backup_logs_embed_description_on_creation)
                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'iHorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };
        });
    }

    if (backup_options === "load") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: data.backup_dont_have_perm_on_load });
        }
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: data.backup_i_dont_have_perm_on_load })
        }

        if (!backupID) {
            return interaction.editReply({ content: data.backup_unvalid_id_on_load });
        }

        if(backupID && !await db.get(`BACKUPS.${interaction.user.id}.${backupID}`)) {
            return interaction.editReply({ content: "❌ | This is not your backup !" });
        };

        await interaction.channel.send({ content: data.backup_waiting_on_load });

        backup.fetch(backupID).then(async () => {
            backup.load(backupID, interaction.guild).then(() => {
                backup.remove(backupID);
            }).catch((err) => {
                return interaction.channel.send({
                    content: data.backup_error_on_load
                        .replace("${backupID}", backupID)
                    , ephemeral: true
                });
            });
        }).catch((err) => {
            return interaction.channel.send({ content: `❌` });
        });
    }

    if (backup_options === "see") {
        // If the user provided a backup ID, show the backup's info.
            
        if(backupID && !await DataBaseModel({id: DataBaseModel.Get, key: `BACKUPS.${interaction.user.id}.${backupID}`})) {
            return interaction.editReply({ content: "❌ | This is not your backup !" });
        };

        if (backupID) {
            let data = await DataBaseModel({id: DataBaseModel.Get, key: `BACKUPS.${interaction.user.id}.${backupID}`});

            if (!data) return interaction.editReply({ content: "ERROR? Backup don't exist." });
            let v = `:placard:・Category's Count: \`${data.categoryCount}\`\n:hash:・Channel's Count: \`${data.channelCount}\``
            em = new EmbedBuilder().setColor("#bf0bb9").setTimestamp().addFields({ name: `${data.guildName} - (||${backupID}||)`, value: v });
            return interaction.editReply({ content: ' ', embeds: [em] });
        }
        // If the user didn't provide a backup ID, show all the backups.
        else {
            let em = new EmbedBuilder().setDescription("**All of your backup:** ").setColor("#bf0bb9").setTimestamp();
            let data2 = await DataBaseModel({id: DataBaseModel.Get, key: `BACKUPS.${interaction.user.id}`});
            b = 1;
            for (i in data2) {
                let result = await DataBaseModel({id: DataBaseModel.Get, key: `BACKUPS.${interaction.user.id}.${i}`});
                let v = `:placard:・Category's Count: \`${result.categoryCount}\`\n:hash:・Channel's Count: \`${result.channelCount}\``
                if (result) em.addFields({ name: `${result.guildName} - (||${i}||)`, value: v }) && b++;
            };

            return interaction.editReply({ content: ' ', embeds: [em] });
        }
    }
};

module.exports = slashInfo.backup.backup;
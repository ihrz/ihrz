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

const logger = require(`${process.cwd()}/src/core/logger`);
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = {
    name: 'backup',
    description: 'Manage, create and delete a guild backups !',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'What you want to do?',
            required: true,
            choices: [
                {
                    name: 'Create a backup',
                    value: "create"
                },
                {
                    name: 'Load your backup',
                    value: "load"
                },
            ],
        },
        {
            name: 'backup-id',
            type: ApplicationCommandOptionType.String,
            description: 'Whats is the backup id?',
            required: false
        }
    ],
    run: async (client, interaction) => {
        let data = await getLanguageData(interaction.guild.id);

        let backup_options = interaction.options.getString('action');
        await interaction.reply({ content: data.backup_wait_please });

        if (backup_options === "create") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply({ content: data.backup_not_admin });
            }
            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply({ content: data.backup_i_dont_have_permission })
            }
            backup.create(interaction.guild, {
                jsonBeautify: true
            }).then((backupData) => {
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
            let backupID = interaction.options.getString('backup-id');

            if (!backupID) {
                return interaction.editReply({ content: data.backup_unvalid_id_on_load });
            }
            interaction.channel.send({ content: data.backup_waiting_on_load });

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
                return interaction.channel.send({ content: `` });
            });
        }
    }
}

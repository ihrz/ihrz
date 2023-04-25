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

const backup = require("discord-backup")

const yaml = require('js-yaml'), fs = require('fs');

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
        let fileContents = fs.readFileSync(process.cwd()+"/files/lang/en-US.yml", 'utf-8');
        let data = yaml.load(fileContents)

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return
        let backup_options = interaction.options.getString('action')
        await interaction.reply({ content: "⏲ Wait please..." })

        if (backup_options === "create") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                if (!interaction.guild.me.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply("I don't have  permission `ADMINISTRATOR`")
                return interaction.editReply({ content: ":x: | You must be an administrator of this server to request a backup!" });
            }
            backup.create(interaction.guild, {
                jsonBeautify: true
            }).then((backupData) => {

                interaction.channel.send(":white_check_mark: Backup successfully created.");
                interaction.editReply({ content: "The backup has been created! ID: `" + backupData.id + "`!" });
                try {
                    logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle("Backup Logs")
                        .setDescription(`<@${interaction.user.id}> Create Backup !`)
                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'iHorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e) { console.error(e) };
            });
        }

        if (backup_options === "load") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                if (!interaction.guild.me.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply("I don't have  permission `ADMINISTRATOR`")
                return interaction.editReply({ content: ":x: | You must be an administrator of this server to load a backup!" });
            }
            let backupID = interaction.options.getString('backup-id')
            if (!backupID) {
                return interaction.editReply({ content: ":x: | You must specify a valid backup ID!" });
            }
            interaction.channel.send({ content: "✅ - Loading..." })
            backup.fetch(backupID).then(async () => {
                backup.load(backupID, interaction.guild).then(() => {
                    backup.remove(backupID);
                }).catch((err) => {
                    return interaction.channel.send({ content: ":x: | Sorry, an error occurred... Please check that I have administrator permissions!", ephemeral: true });
                });
            }).catch((err) => {
                //console.log(err);
                return interaction.channel.send({ content: `:x: | No backup found for ${backupID} !` });
            });
        }
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}

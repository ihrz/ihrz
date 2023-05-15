const {
    Client,
    Intents,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    SelectMenuBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js');

const { QuickDB } = require("quick.db");
const db = new QuickDB();

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = {
    name: 'embed',
    description: 'Embed Creator!',

    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.punishpub_not_admin });
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId('starter')
            .setPlaceholder('Make a selection!')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Copier un embed')
                    .setDescription(' ')
                    .setEmoji("📥")
                    .setValue('0'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Modifier le titre')
                    .setDescription(' ')
                    .setEmoji("🖊")
                    .setValue('1'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Supprimer le titre')
                    .setDescription(' ')
                    .setEmoji("💥")
                    .setValue('2'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Modifier la description')
                    .setDescription(' ')
                    .setEmoji("💬")
                    .setValue('3'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Supprimer la description')
                    .setDescription(' ')
                    .setEmoji("📝")
                    .setValue('4'),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Modifier l'auteur")
                    .setDescription(' ')
                    .setEmoji("🕵️")
                    .setValue('5'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Supprimer l\'auteur')
                    .setDescription(' ')
                    .setEmoji("✂")
                    .setValue('6'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Modifier le footer')
                    .setDescription(' ')
                    .setEmoji("🔻")
                    .setValue('7'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Supprimer le footer')
                    .setDescription(' ')
                    .setEmoji("🔺")
                    .setValue('8'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Modifier le thumbnail')
                    .setDescription(' ')
                    .setEmoji("🔳")
                    .setValue('9'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Modifier l\'image')
                    .setDescription(' ')
                    .setEmoji("🖼️")
                    .setValue('10'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Modifier l\'URL du titre')
                    .setDescription(' ')
                    .setEmoji("🌐")
                    .setValue('11'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Modifier la couleur')
                    .setDescription(' ')
                    .setEmoji("🎨")
                    .setValue('12'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Supprimer la couleur')
                    .setDescription(' ')
                    .setEmoji("🔵")
                    .setValue('13')
            );

        const row = new ActionRowBuilder()
            .addComponents(select);


        await interaction.reply({
            content: 'What do you want ?',
            components: [row],
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
        } catch (e) {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
        }

    }
}
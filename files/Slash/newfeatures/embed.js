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
    ComponentType,
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

        let __tempEmbed = new EmbedBuilder().setColor("#211f1f").setDescription('.');

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


        interaction.reply({
            content: 'Que veux tu faire ?',
            embeds: [__tempEmbed],
            components: [row],
        }).then(async msgg => {
            const collector = msgg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

            collector.on('collect', async i => {
                const selection = i.values[0];
                console.log(selection)
                await chooseAction(selection)
            });
            async function chooseAction(confirmation) {
                switch (confirmation) {
                    case '0':
                        let i0 = await interaction.followUp('Quel message voulez-vous inclure dans votre Embed?');
                        const messageFilter = m => m.author.id === interaction.user.id;
                        const messageCollector = interaction.channel.createMessageCollector({ messageFilter, max: 1, time: 60000 });
                        messageCollector.on('collect', message => {
                            __tempEmbed.setDescription(message.content);
                            msgg.edit({ embeds: [__tempEmbed] })
                            i0.delete()
                            message.delete()
                        });
                        break;
                    case '1':
                        let i1 = await interaction.followUp('Quel titre voulez-vous inclure dans votre Embed?');
                        const titleFilter = m => m.author.id === interaction.user.id;
                        const titleCollector = interaction.channel.createMessageCollector({ titleFilter, max: 1, time: 60000 });
                        titleCollector.on('collect', message => {
                            __tempEmbed.setTitle(message.content);
                            msgg.edit({ embeds: [__tempEmbed] })
                            i1.delete()
                            message.delete()
                        });
                        break;
                    case '2':
                        __tempEmbed.setTitle('');
                        interaction.followUp({ embeds: [__tempEmbed] });
                        break;
                    case '3':
                        await interaction.followUp('Quelle description voulez-vous inclure dans votre Embed?');
                        const descriptionFilter = m => m.author.id === interaction.user.id;
                        const descriptionCollector = interaction.channel.createMessageCollector({ descriptionFilter, max: 1, time: 60000 });
                        descriptionCollector.on('collect', message => {
                            __tempEmbed.setDescription(message.content);
                            interaction.followUp({ embeds: [__tempEmbed] });
                        });
                        break;
                    case '4':
                        __tempEmbed.setDescription('');
                        interaction.followUp({ embeds: [__tempEmbed] });
                        break;
                    case '5':
                        await interaction.followUp('Quel auteur voulez-vous inclure dans votre Embed?');
                        const authorFilter = m => m.author.id === interaction.user.id;
                        const authorCollector = interaction.channel.createMessageCollector({ authorFilter, max: 1, time: 60000 });
                        authorCollector.on('collect', message => {
                            __tempEmbed.setAuthor(message.content);
                            interaction.followUp({ embeds: [__tempEmbed] });
                        });
                        break;
                    case '6':
                        __tempEmbed.setAuthor('');
                        interaction.followUp({ embeds: [__tempEmbed] });
                        break;
                    case '7':
                        await interaction.followUp('Quel footer voulez-vous inclure dans votre Embed?');
                        const footerFilter = m => m.author.id === interaction.user.id;
                        const footerCollector = interaction.channel.createMessageCollector({ footerFilter, max: 1, time: 60000 });
                        footerCollector.on('collect', message => {
                            __tempEmbed.setFooter(message.content);
                            interaction.followUp({ embeds: [__tempEmbed] });
                        });
                        break;
                    case '8':
                        __tempEmbed.setFooter('');
                        interaction.followUp({ embeds: [__tempEmbed] });
                        break;
                    case '9':
                        interaction.channel.send({ content: `**Modifier le thumbnail**` });
                        break;
                    case '10':
                        interaction.channel.send({ content: `**Modifier l'image**` });
                        break;
                    case '11':
                        interaction.channel.send({ content: `**Modifier l'URL du titre**` });
                        break;
                    case '12':
                        interaction.channel.send({ content: `**Modifier la couleur**` });
                        break;
                    case '13':
                        interaction.channel.send({ content: `**Supprimer la couleur**` });
                        break;
                    default:
                        break;
                };
            }

        })
    }
}
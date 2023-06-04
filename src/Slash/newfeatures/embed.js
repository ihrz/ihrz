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
    ApplicationCommandOptionType,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
} = require('discord.js');

const { QuickDB } = require("quick.db");
const db = new QuickDB();
var generator = require('generate-password');

slashInfo.newfeatures.embed.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    let arg = interaction.options.getString("id");
    potentialEmbed = await db.get(`EMBED.${arg}`);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: data.punishpub_not_admin });
    };

    let __tempEmbed = new EmbedBuilder().setDescription('** **');
    if (potentialEmbed) { __tempEmbed = new EmbedBuilder(potentialEmbed.embedSource) };

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

    const save = new ButtonBuilder()
        .setCustomId('save')
        .setLabel('Save Embed')
        .setStyle(ButtonStyle.Success);

    const send = new ButtonBuilder()
        .setCustomId('send')
        .setLabel('Send Embed')
        .setStyle(ButtonStyle.Primary);

    const cancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
        .addComponents(select)

    const btn = new ActionRowBuilder()
        .addComponents(save, send, cancel);

    const response = await interaction.reply({
        content: 'Que veux tu faire ?',
        embeds: [__tempEmbed],
        components: [row, btn],
    })
    const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 420_000 });

    collector.on('collect', async i => {
        if (i.member.id !== interaction.user.id) {
            return i.reply({ content: `This interaction is not for you`, ephemeral: true })
        }
        getButton();
        await chooseAction(i);
    });

    async function getButton() {
        try {
            const collectorFilter = i => i.user.id === interaction.user.id;
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 120_000 });

            switch (confirmation.customId) {
                case "save":
                    if (potentialEmbed) await db.delete(`EMBED.${arg}`);

                    await confirmation.update({
                        content: `<@${interaction.user.id}>, **Vous avez décidé de sauvegardée la configuration de l'Embed !**\`\`\`Identifiant de l'Embed: ${await saveEmbed()}\`\`\``,
                        components: [], embeds: []
                    })
                    return;
                case "cancel":
                    return confirmation.update({ content: `<@${interaction.user.id}>, **Vous avez décidé d'abandonner la configuration de l'Embed !**`, components: [], embeds: [] });
                case "send":
                    confirmation.update({ content: `<@${interaction.user.id}>, **Dans quel cannal je dois envoyez cette embed ?** (*Avec l'ID du salon*)`, components: [] });
                    sendEmbed();
                    return;
            }
        } catch (e) {
            return interaction.channel.send({ content: `<@${interaction.user.id}>, **Vous avez mis trop de temps à répondre, je coupe l'opération en cours!**` })
        };
    }; getButton();

    const links = [
        "https://",
        "http://",
    ];

    var reg = /^#([0-9a-f]{3}){1,2}$/i;

    async function chooseAction(i) {
        switch (i.values[0]) {
            case '0':
                let i0 = await i.reply('Quel message voulez-vous inclure dans votre Embed?');
                const messageFilter = m => m.author.id === interaction.user.id;
                const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, max: 1, time: 120_000 });
                messageCollector.on('collect', message => {
                    __tempEmbed.setDescription(message.content);
                    response.edit({ embeds: [__tempEmbed] })
                    i0.delete() && message.delete();
                });
                break;
            case '1':
                let i1 = await i.reply('Quel titre voulez-vous inclure dans votre Embed?');
                const titleFilter = m => m.author.id === interaction.user.id;
                const titleCollector = interaction.channel.createMessageCollector({ filter: titleFilter, max: 1, time: 120_000 });
                titleCollector.on('collect', message => {
                    __tempEmbed.setTitle(message.content);
                    response.edit({ embeds: [__tempEmbed] })
                    i1.delete() && message.delete();
                });
                break;
            case '2':
                __tempEmbed.setTitle('** **');
                response.edit({ embeds: [__tempEmbed] });
                i.reply("Le titre de l'embed à été correctement Supprimer !")
                break;
            case '3':
                let i3 = await i.reply('Quelle description voulez-vous inclure dans votre Embed?');
                const descriptionFilter = m => m.author.id === interaction.user.id;
                const descriptionCollector = interaction.channel.createMessageCollector({ filter: descriptionFilter, max: 1, time: 120_000 });
                descriptionCollector.on('collect', message => {
                    __tempEmbed.setDescription(message.content);
                    response.edit({ embeds: [__tempEmbed] });
                    i3.delete() && message.delete();
                });
                break;
            case '4':
                __tempEmbed.setDescription('** **');
                response.edit({ embeds: [__tempEmbed] });
                i.reply("La description de l'embed à été correctement Supprimer !")
                break;
            case '5':
                let i5 = await i.reply('Quel auteur voulez-vous inclure dans votre Embed?');
                const authorFilter = m => m.author.id === interaction.user.id;
                const authorCollector = interaction.channel.createMessageCollector({ filter: authorFilter, max: 1, time: 120_000 });
                authorCollector.on('collect', message => {
                    __tempEmbed.setAuthor({ name: message.content });
                    response.edit({ embeds: [__tempEmbed] });
                    i5.delete() && message.delete();
                });
                break;
            case '6':
                __tempEmbed.setAuthor({ name: "      " });
                response.edit({ embeds: [__tempEmbed] });
                i.reply("L'autheur de l'embed à été correctement Supprimer !")
                break;
            case '7':
                i7 = await i.reply('Quel footer voulez-vous inclure dans votre Embed?');
                const footerFilter = m => m.author.id === interaction.user.id;
                const footerCollector = interaction.channel.createMessageCollector({ filter: footerFilter, max: 1, time: 120_000 });
                footerCollector.on('collect', message => {
                    __tempEmbed.setFooter({ text: message.content });
                    response.edit({ embeds: [__tempEmbed] });
                    i7.delete() && message.delete();
                });
                break;
            case '8':
                __tempEmbed.setFooter({ text: "** **" });
                response.edit({ embeds: [__tempEmbed] });
                i.reply("Le footer de l'embed à été correctement Supprimer !")
                break;
            case '9':
                i9 = await i.reply('Quel image de thumbnail voulez-vous inclure dans votre Embed?');
                const thumbnailFilter = m => m.author.id === interaction.user.id;
                const thumbnailCollector = interaction.channel.createMessageCollector({ filter: thumbnailFilter, max: 1, time: 120_000 });
                thumbnailCollector.on('collect', message => {
                    if (!links.some(word => message.content.includes(word))) {
                        __tempEmbed.setThumbnail("https://exemple.com/exemple/png")
                    } else {
                        __tempEmbed.setThumbnail(message.content)
                    };

                    response.edit({ embeds: [__tempEmbed] });
                    i9.delete() && message.delete();
                });
                break;
            case '10':
                i10 = await i.reply('Quel image voulez-vous inclure dans votre Embed?');
                const imageFilter = m => m.author.id === interaction.user.id;
                const imageCollector = interaction.channel.createMessageCollector({ filter: imageFilter, max: 1, time: 120_000 });
                imageCollector.on('collect', message => {
                    if (!links.some(word => message.content.includes(word))) {
                        __tempEmbed.setImage("https://exemple.com/exemple/png")
                    } else {
                        __tempEmbed.setImage(message.content)
                    };

                    response.edit({ embeds: [__tempEmbed] });
                    i10.delete() && message.delete();
                });
                break;
            case '11':
                i11 = await i.reply('Quel URL de titre voulez-vous inclure dans votre Embed?');
                const ttUrlFilter = m => m.author.id === interaction.user.id;
                const ttUrlCollector = interaction.channel.createMessageCollector({ filter: ttUrlFilter, max: 1, time: 120_000 });
                ttUrlCollector.on('collect', message => {
                    if (links.some(word => message.content.includes(word))) {
                        __tempEmbed.setURL(message.content) && response.edit({ embeds: [__tempEmbed] });
                    };

                    i11.delete() && message.delete();
                });
                break;
            case '12':
                i12 = await i.reply('Quel est la couleur que voulez-vous inclure dans votre Embed? **www.color-hex.com**');
                const colorFilter = m => m.author.id === interaction.user.id;
                const colorCollector = interaction.channel.createMessageCollector({ filter: colorFilter, max: 1, time: 120_000 });
                colorCollector.on('collect', message => {
                    if (reg.test(message.content)) {
                        __tempEmbed.setColor(message.content);
                        response.edit({ embeds: [__tempEmbed] });
                    } else {
                        interaction.channel.send("❌ | Couleur Invalide ! Svp, renseignez vous sur **www.color-hex.com**");
                    }

                    i12.delete() && message.delete();
                });
                break;
            case '13':
                __tempEmbed.setColor("#000000");
                response.edit({ embeds: [__tempEmbed] });
                i.reply("La couleur de l'Embed à correctement été Supprimer !")
                break;
            default:
                break;
        };
    }

    async function sendEmbed() {
        const seFilter = m => m.author.id === interaction.user.id;
        const seCollector = interaction.channel.createMessageCollector({ filter: seFilter, max: 1, time: 120_000 });

        seCollector.on('collect', message => {
            let channel = interaction.guild.channels.cache.get(message.content)

            if (!channel) return;
            channel.send({ embeds: [__tempEmbed] });
            message.delete();
            response.edit({ content: `<@${interaction.user.id}>, **Vous avez parfaitement envoyé l'Embed dans le salon <#${message.content}> !**`, embeds: [] });
        });
    }

    async function saveEmbed() {
        var password = generator.generate({
            length: 8,
            numbers: true
        });

        await db.set(`EMBED.${password}`,
            {
                embedOwner: interaction.user.id,
                embedSource: __tempEmbed
            }
        );
        return password;
    }
};

module.exports = slashInfo.newfeatures.embed;
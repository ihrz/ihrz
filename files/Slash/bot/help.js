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


const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  name: 'help',
  description: 'show help panel',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);
    let CONTENT = await db.get("BOT.CONTENT");

    const categories = [
      { name: data.help_mod_fields, value: CONTENT.moderation.toString(), inline: true, description: data.help_mod_dsc },
      { name: data.help_ranks_fields, value: CONTENT.ranks.toString(), inline: true, description: data.help_ranks_dsc },
      { name: data.help_fun_fields, value: CONTENT.fun.toString(), inline: true, description: data.help_fun_dsc },
      { name: data.help_utils_fields, value: CONTENT.utils.toString(), inline: true, description: data.help_utils_dsc },
      { name: data.help_giveaway_fields, value: CONTENT.giveaway.toString(), inline: true, description: data.help_giveaway_dsc },
      { name: data.help_bot_fields, value: CONTENT.bot.toString(), inline: true, description: data.help_bot_dsc },
      { name: data.help_music_fields, value: CONTENT.music.toString(), inline: true, description: data.help_music_dsc },
      { name: data.help_backup_fields, value: CONTENT.backup.toString(), inline: true, description: data.help_backup_dsc },
      { name: data.help_guildconf_fields, value: CONTENT.guildconfig.toString(), inline: true, description: data.help_guildconf_dsc },
      { name: data.help_prof_fields, value: CONTENT.profil.toString(), inline: true, description: data.help_prof_dsc },
      { name: data.help_economy_fields, value: CONTENT.economy.toString(), inline: true, description: data.help_economy_dsc },
      { name: data.help_owner_fields, value: CONTENT.owner.toString(), inline: true, description: data.help_owner_dsc },
      { name: data.help_roler_fields, value: CONTENT.rolereactions.toString(), inline: true, description: data.help_roler_dsc },
      { name: data.help_invitem_fields, value: CONTENT.invitemanager.toString(), inline: true, description: data.help_invitem_dsc },
      { name: data.help_ticket_fields, value: CONTENT.ticket.toString(), inline: true, description: data.help_ticket_dsc },
      { name: data.help_memberc_fields, value: CONTENT.membercount.toString(), inline: true, description: data.help_memberc_dsc },
      { name: data.help_newftrs_fields, value: CONTENT.newfeatures.toString(), inline: true, description: data.help_newftrs_dsc },
    ];

    const select = new StringSelectMenuBuilder()
      .setCustomId('starter')
      .setPlaceholder('Make a selection!')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel(categories[0].name).setValue('0').setEmoji("👮‍♀️"),
        new StringSelectMenuOptionBuilder().setLabel(categories[1].name).setValue('1').setEmoji("🌟"),
        new StringSelectMenuOptionBuilder().setLabel(categories[2].name).setValue('2').setEmoji("🆒"),
        new StringSelectMenuOptionBuilder().setLabel(categories[3].name).setValue('3').setEmoji("🧰"),
        new StringSelectMenuOptionBuilder().setLabel(categories[4].name).setValue('4').setEmoji("🎉"),
        new StringSelectMenuOptionBuilder().setLabel(categories[5].name).setValue('5').setEmoji("🤖"),
        new StringSelectMenuOptionBuilder().setLabel(categories[6].name).setValue('6').setEmoji("🎵"),
        new StringSelectMenuOptionBuilder().setLabel(categories[7].name).setValue('7').setEmoji("🔁"),
        new StringSelectMenuOptionBuilder().setLabel(categories[8].name).setValue('8').setEmoji("⚙"),
        new StringSelectMenuOptionBuilder().setLabel(categories[9].name).setValue('9').setEmoji("👩"),
        new StringSelectMenuOptionBuilder().setLabel(categories[10].name).setValue('10').setEmoji("👩‍💼"),
        new StringSelectMenuOptionBuilder().setLabel(categories[11].name).setValue('11').setEmoji("👩‍✈️"),
        new StringSelectMenuOptionBuilder().setLabel(categories[12].name).setValue('12').setEmoji("📇"),
        new StringSelectMenuOptionBuilder().setLabel(categories[13].name).setValue('13').setEmoji("💾"),
        new StringSelectMenuOptionBuilder().setLabel(categories[14].name).setValue('14').setEmoji("🎫"),
        new StringSelectMenuOptionBuilder().setLabel(categories[15].name).setValue('15').setEmoji("👥"),
        new StringSelectMenuOptionBuilder().setLabel(categories[16].name).setValue('16').setEmoji("🆕"),
      );

    const row = new ActionRowBuilder().addComponents(select);

    const embed = new EmbedBuilder()
      .setColor('#001eff')
      .setDescription(data.help_tip_embed)
      .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
      .setThumbnail(client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }))
      .setTimestamp();

    const response = await interaction.reply({ embeds: [embed], components: [row] })

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120_000 });

    collector.on('collect', async i => {
      if (i.member.id !== interaction.user.id) {
        return i.reply({ content: `This interaction is not for you`, ephemeral: true })
      }
      await i.reply({ content: `🔎 -> ${categories[i.values[0]].name}!`, ephemeral: true })
        .then((sent) => { setTimeout(() => { sent.delete(); }, 2000); });

      await chooseAction(i);
    });

    async function chooseAction(i) {
      embed.setTitle(categories[i.values[0]].name)
        .setDescription(categories[i.values[0]].description)
        .setFields({ name: categories[i.values[0]].name, value: categories[i.values[0]].value });

      response.edit({ embeds: [embed] });
    };

  }

};
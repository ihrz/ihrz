const { EmbedBuilder, ActionRowBuilder, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);
const { QuickDB } = require("quick.db"), db = new QuickDB();

module.exports = {
  name: 'help',
  description: 'Need help? Use this command !',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);
    let CONTENT = await db.get("BOT.CONTENT");

    const categories = [
      { name: data.help_mod_fields, value: CONTENT.moderation.toString(), inline: true, description: data.help_mod_dsc, emoji: "👮‍♀️" },
      { name: data.help_ranks_fields, value: CONTENT.ranks.toString(), inline: true, description: data.help_ranks_dsc, emoji: "🌟" },
      { name: data.help_fun_fields, value: CONTENT.fun.toString(), inline: true, description: data.help_fun_dsc, emoji: "🆒" },
      { name: data.help_utils_fields, value: CONTENT.utils.toString(), inline: true, description: data.help_utils_dsc, emoji: "🧰" },
      { name: data.help_giveaway_fields, value: CONTENT.giveaway.toString(), inline: true, description: data.help_giveaway_dsc, emoji: "🎉" },
      { name: data.help_bot_fields, value: CONTENT.bot.toString(), inline: true, description: data.help_bot_dsc, emoji: "🤖" },
      { name: data.help_music_fields, value: CONTENT.music.toString(), inline: true, description: data.help_music_dsc, emoji: "🎵" },
      { name: data.help_backup_fields, value: CONTENT.backup.toString(), inline: true, description: data.help_backup_dsc, emoji: "🔁" },
      { name: data.help_guildconf_fields, value: CONTENT.guildconfig.toString(), inline: true, description: data.help_guildconf_dsc, emoji: "⚙" },
      { name: data.help_prof_fields, value: CONTENT.profil.toString(), inline: true, description: data.help_prof_dsc, emoji: "👩" },
      { name: data.help_economy_fields, value: CONTENT.economy.toString(), inline: true, description: data.help_economy_dsc, emoji: "👩‍💼" },
      { name: data.help_owner_fields, value: CONTENT.owner.toString(), inline: true, description: data.help_owner_dsc, emoji: "👩‍✈️" },
      { name: data.help_roler_fields, value: CONTENT.rolereactions.toString(), inline: true, description: data.help_roler_dsc, emoji: "📇" },
      { name: data.help_invitem_fields, value: CONTENT.invitemanager.toString(), inline: true, description: data.help_invitem_dsc, emoji: "💾" },
      { name: data.help_ticket_fields, value: CONTENT.ticket.toString(), inline: true, description: data.help_ticket_dsc, emoji: "🎫" },
      { name: data.help_memberc_fields, value: CONTENT.membercount.toString(), inline: true, description: data.help_memberc_dsc, emoji: "👥" },
      { name: data.help_newftrs_fields, value: CONTENT.newfeatures.toString(), inline: true, description: data.help_newftrs_dsc, emoji: "🆕" }
    ];

    const select = new StringSelectMenuBuilder().setCustomId('starter').setPlaceholder('Make a selection!');
    categories.forEach((category, index) => { select.addOptions(new StringSelectMenuOptionBuilder().setLabel(category.name).setValue(index.toString()).setEmoji(category.emoji)); });
    const row = new ActionRowBuilder().addComponents(select);

    const embed = new EmbedBuilder()
      .setColor('#001eff')
      .setDescription(data.help_tip_embed)
      .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
      .setThumbnail(client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }))
      .setTimestamp();

    const response = await interaction.reply({ embeds: [embed], components: [row] });
    const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60_000 });

    collector.on('collect', async i => {
      if (i.member.id !== interaction.user.id) { return i.reply({ content: `This interaction is not for you`, ephemeral: true }) };

      await i.reply({ content: `${categories[i.values[0]].emoji}・**${categories[i.values[0]].name}**`, ephemeral: true })
        .then((sent) => { setTimeout(() => { sent.delete(); }, 2000); });

      embed
        .setTitle(`${categories[i.values[0]].emoji}・${categories[i.values[0]].name}`)
        .setDescription(categories[i.values[0]].description)
        .setFields({ name: categories[i.values[0]].name, value: categories[i.values[0]].value });

      await response.edit({ embeds: [embed] });
    });
  }
};
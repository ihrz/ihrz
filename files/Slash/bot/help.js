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

    const nextBtn = new ButtonBuilder()
      .setCustomId('next')
      .setLabel('➡')
      .setStyle(ButtonStyle.Secondary);

    const beforeBtn = new ButtonBuilder()
      .setCustomId('before')
      .setLabel('⬅')
      .setStyle(ButtonStyle.Secondary);

    const btn = new ActionRowBuilder()
      .addComponents(beforeBtn, nextBtn);

    const embed = new EmbedBuilder()
      .setColor('#001eff')
      .setDescription(data.help_tip_embed)
      .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
      .setThumbnail(client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }))
      .setTimestamp();

    const categories = [
      { name: data.help_mod_fields, value: CONTENT.moderation.toString(), inline: true, description: data.help_mod_dsc},
      { name: data.help_ranks_fields, value: CONTENT.ranks.toString(), inline: true, description: data.help_ranks_dsc},
      { name: data.help_fun_fields, value: CONTENT.fun.toString(), inline: true, description: data.help_fun_dsc},
      { name: data.help_utils_fields, value: CONTENT.utils.toString(), inline: true, description: data.help_utils_dsc},
      { name: data.help_giveaway_fields, value: CONTENT.giveaway.toString(), inline: true, description: data.help_giveaway_dsc},
      { name: data.help_bot_fields, value: CONTENT.bot.toString(), inline: true, description: data.help_bot_dsc},
      { name: data.help_music_fields, value: CONTENT.music.toString(), inline: true, description: data.help_music_dsc},
      { name: data.help_backup_fields, value: CONTENT.backup.toString(), inline: true, description: data.help_backup_dsc},
      { name: data.help_guildconf_fields, value: CONTENT.guildconfig.toString(), inline: true, description: data.help_guildconf_dsc},
      { name: data.help_prof_fields, value: CONTENT.profil.toString(), inline: true, description: data.help_prof_dsc},
      { name: data.help_economy_fields, value: CONTENT.economy.toString(), inline: true, description: data.help_economy_dsc},
      { name: data.help_owner_fields, value: CONTENT.owner.toString(), inline: true, description: data.help_owner_dsc},
      { name: data.help_roler_fields, value: CONTENT.rolereactions.toString(), inline: true, description: data.help_roler_dsc},
      { name: data.help_invitem_fields, value: CONTENT.invitemanager.toString(), inline: true, description: data.help_invitem_dsc},
      { name: data.help_ticket_fields, value: CONTENT.ticket.toString(), inline: true, description: data.help_ticket_dsc},
      { name: data.help_memberc_fields, value: CONTENT.membercount.toString(), inline: true, description: data.help_memberc_dsc},
      { name: data.help_newftrs_fields, value: CONTENT.newfeatures.toString(), inline: true, description: data.help_newftrs_dsc},
    ];
    let currentCategoryIndex = 0;

    const response = await interaction.reply({ embeds: [embed], components: [btn] })
    await getButton();

    async function getButton() {

      try {
        const collectorFilter = i => i.user.id === interaction.user.id;
        const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

        switch (confirmation.customId) {
          case 'next':
            currentCategoryIndex = (currentCategoryIndex + 1) % categories.length;
            break;
          case 'before':
            currentCategoryIndex = (currentCategoryIndex - 1 + categories.length) % categories.length;
            break;
        }
        embed.setTitle(categories[currentCategoryIndex].name);
        embed.setDescription(categories[currentCategoryIndex].description);
        embed.setFields({ name: categories[currentCategoryIndex].name, value: categories[currentCategoryIndex].value });
        embed.setFooter({ text: `iHorizon - Category ${currentCategoryIndex + 1}/${categories.length}`, iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) });

        await confirmation.update({ embeds: [embed] });
        getButton();
      } catch (e) {
        console.error(e)
        return;
      };
    };
  }

};
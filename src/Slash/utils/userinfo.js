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

const config = require(`${process.cwd()}/files/config.js`),
  moment = require(`${process.cwd()}/files/ihorizon-api/moment`),
  DiscordOauth2 = require("discord-oauth2"),
  oauth = new DiscordOauth2(),
  axios = require('axios'),
  apiUrlParser = require(`${process.cwd()}/src/core/apiUrlParser`);

const badges = {
  Discord_Employee: {
    Value: 1,
    Emoji: "<:STAFF:1047264630109642802>"
  },
  Partnered_Server_Owner: {
    Value: 2,
    Emoji: "<:PARTENAIRE:1047264628704559164>"
  },
  HypeSquad_Events: {
    Value: 4,
    Emoji: "<:HYPESQUAD_EVENTS:1047264625156169778>",
  },
  Bug_Hunter_Level_1: {
    Value: 8,
    Emoji: "<:BUG1:1047264619686789170>",
  },
  Early_Supporter: {
    Value: 512,
    Emoji: "<:EARLY:1047264622249521212>",
  },
  Bug_Hunter_Level_2: {
    Value: 16384,
    Emoji: "<:BUG2:1047264620873797702>",
  },
  Early_Verified_Bot_Developer: {
    Value: 131072,
    Emoji: "<:EARLY_CERTIFIED_DISCORD_BOT_DEVE:1047264623805595758>",
  },
  House_Bravery: {
    Value: 64,
    Emoji: "<:BRAVERY:1047264617317011556>",
  },
  House_Brilliance: {
    Value: 128,
    Emoji: "<:BRILLANCE:1047264618554331157>",
  },
  House_Balance: {
    Value: 256,
    Emoji: "<:BALANCE:1047264615509270579>",
  },
  Active_Developers: {
    Value: 4194304,
    Emoji: "<:VERIFIED_DEV:1047266396725334078>",
  },
  Discord_Moderators: {
    Value: 262144,
    Emoji: "<:MODERATORS:1047264626695483453>",
  },
  Slash_Bot: {
    Value: 524288,
    Emoji: "<:SLASH_BOTS:1116790067365683251>",
  }
};

// yeah lol, pirate stealer code here
function getBadges(flags) {
  var b = '';
  for (const prop in badges) {
    let o = badges[prop];
    if ((flags & o.Value) == o.Value) b += o.Emoji;
  };
  if (b == '') b = 'None'
  return b;
};

const logger = require(`${process.cwd()}/src/core/logger`);

slashInfo.utils.userinfo.run = async (client, interaction) => {
  const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
  let data = await getLanguageData(interaction.guild.id);

  let member = interaction.options.getUser("user") || interaction.user;

  function getSubscriptions(response) {
    if (!response.available) { return };
    //si il n'est pas enregistré dans la db
    if (response.available == "no") {
      description = `${getBadges(member.flags)}\n**User:** \`${member.username}\#${member.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\`\n[My nitro is not showed](${apiUrlParser.LoginURL()})`;
      sendMessage(description)
    };

    if (response.available == "yes") {
      const access_token = response.connectionToken;
      oauth.getUser(access_token).then(data => {
        switch (data.premium_type) {
          case 0:
            /*Don't have nitro*/
            descriptionTwo = `${getBadges(member.flags)}\n**User:** \`${member.username}\#${member.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
            sendMessage(descriptionTwo)
            break;
          case 1:
            /* Discord Nitro Classic*/
            if (getBadges(member.flags) === 'None') {
              descriptionTwo = `<:NITRO:1047317443770581062>\n**User:** \`${member.username}\#${member.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
            } else {
              descriptionTwo = `${getBadges(member.flags)}<:NITRO:1047317443770581062>\n**User:** \`${member.username}\#${member.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
            }
            sendMessage(descriptionTwo);
            break;
          case 2:
            /* Discord Nitro Boost*/
            if (getBadges(member.flags) === 'None') {
              descriptionTwo = `<:NITRO:1047317443770581062><:BOOST:1047322188493099038>\n**User:** \`${member.username}\#${member.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
            } else {
              descriptionTwo = `${getBadges(member.flags)}<:NITRO:1047317443770581062><:BOOST:1047322188493099038>\n**User:** \`${member.username}\#${member.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
            }
            sendMessage(descriptionTwo);
            break;
          case 3:
            /* Discord Nitro Basic*/
            if (getBadges(member.flags) === 'None') {
              descriptionTwo = `<:NITRO:1047317443770581062>\n**User:** \`${member.username}\#${member.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
            } else {
              descriptionTwo = `${getBadges(member.flags)}<:NITRO:1047317443770581062>\n**User:** \`${member.username}\#${member.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
            }
            sendMessage(descriptionTwo);
            break;
        };
      })
    }
  };
  async function sendMessage(description) {
    embed = new EmbedBuilder()
      .setAuthor({ name: `${member.tag}`, iconURL: member.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(member.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp()
      .setColor("#0014a8")
      .setDescription(description);

    return interaction.editReply({ embeds: [embed], content: "✅ Fetched !" });
  };

  await interaction.reply({ content: data.userinfo_wait_please });

  const requestData = {
    tokent: 'want',
    adminKey: config.api.apiToken,
    userid: member.id,
    tor: 'CHECK_IN_SYSTEM'
  };

  try {
    const response = await axios.post(apiUrlParser.ApiURL(), requestData);
    getSubscriptions(response.data);
  } catch (error) {
    logger.err(error);

    const embed = {
      author: { name: `${member.tag}`, iconURL: member.displayAvatarURL({ dynamic: true }) },
      thumbnail: { url: member.displayAvatarURL({ dynamic: true }) },
      footer: { text: `ID: ${member.id}` },
      timestamp: new Date(),
      color: '#0014a8',
      description: `${getBadges(member.flags)}\n**User:** \`${member.username}\#${member.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\`\n[🔴 API DOWN](${apiUrlParser.LoginURL()})`
    };

    await interaction.editReply({ embeds: [embed], content: '🔴 API DOWN' });
  };
};

module.exports = slashInfo.utils.userinfo;
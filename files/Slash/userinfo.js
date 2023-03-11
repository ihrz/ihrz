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

const config = require("../config.json")
const moment = require('moment');
const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();
const superagent = require('superagent');
const api_login = config.loginURL
const api_url = config.loginURL+`/api/check`
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
      Emoji: "\<:EARLY_CERTIFIED_DISCORD_BOT_DEVE:1047264623805595758>",
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
}
module.exports = {
  name: 'userinfo',
  description: 'lookup a user',
  options: [
    {
        name: 'user',
        type: ApplicationCommandOptionType.User,
        description: 'user you want to lookup',
        required: true
    }
],
  run: async (client, interaction) => {
    let member = interaction.options.get("user") || interaction.member;
        member = await interaction.guild.members.fetch(member)

  function getSubscriptions(response) {
          if(!response.available){ return }
          //si il n'est pas enregistré dans la db
          if(response.available == "no"){ 
          description = `${getBadges(member.user.flags)}\n**User:** \`${member.user.username}\#${member.user.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.user.createdAt).format('MMMM Do YYYY')}\`\n**Joined Server on:** \`${moment(member.joinedAt).format('MMMM Do YYYY')}\`\n[My nitro is not showed](${api_login})`;
          sendMessage(description)
        };
          
          if(response.available == "yes"){ 
              const access_token = response.connectionToken;
              oauth.getUser(access_token).then(data => {
    switch (data.premium_type) {
      case 0:
        /*Don't have nitro*/
        descriptionTwo = `${getBadges(member.user.flags)}\n**User:** \`${member.user.username}\#${member.user.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.user.createdAt).format('MMMM Do YYYY')}\`\n**Joined Server on:** \`${moment(member.joinedAt).format('MMMM Do YYYY')}\``;
        sendMessage(descriptionTwo)
        break;
      case 1:
        /* Discord Nitro Classic*/
        descriptionTwo = `${getBadges(member.user.flags)}<:NITRO:1047317443770581062>\n**User:** \`${member.user.username}\#${member.user.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.user.createdAt).format('MMMM Do YYYY')}\`\n**Joined Server on:** \`${moment(member.joinedAt).format('MMMM Do YYYY')}\``;
        sendMessage(descriptionTwo)
        break;
      case 2:
        /* Discord Nitro Boost*/
        descriptionTwo = `${getBadges(member.user.flags)}<:NITRO:1047317443770581062><:BOOST:1047322188493099038>\n**User:** \`${member.user.username}\#${member.user.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.user.createdAt).format('MMMM Do YYYY')}\`\n**Joined Server on:** \`${moment(member.joinedAt).format('MMMM Do YYYY')}\``;
        sendMessage(descriptionTwo)
        break;
      case 3:
        /* Discord Nitro Basic*/
        descriptionTwo = `${getBadges(member.user.flags)}<:NITRO:1047317443770581062>\n**User:** \`${member.user.username}\#${member.user.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.user.createdAt).format('MMMM Do YYYY')}\`\n**Joined Server on:** \`${moment(member.joinedAt).format('MMMM Do YYYY')}\``;
        sendMessage(descriptionTwo)
        break;
    };})
    }
    };
    async function sendMessage(description) {
      embed = new EmbedBuilder()
      .setAuthor(`${member.user.tag}`, member.user.displayAvatarURL({ dynamic : true }))
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter(`ID: ${member.id}`)
      .setTimestamp()
      .setColor("BLURPLE")
      .setDescription(`${description}`)
      return interaction.editReply({embeds: [embed], content: "✅ Fetched !"});
    }
    await interaction.reply({content: "⏲ Wait please..."})
        superagent.post(`${api_url}`).send({tokent: "want", adminKey: config.apiToken, userid: member.id, tor: 'CHECK_IN_SYSTEM'}).end(async (err, response) => {
          if(err){
            console.error(err)
            embed = new EmbedBuilder()
            .setAuthor(`${member.user.tag}`, member.user.displayAvatarURL({ dynamic : true }))
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter(`ID: ${member.id}`)
            .setTimestamp()
            .setColor("BLURPLE")
            .setDescription(`${getBadges(member.user.flags)}\n**User:** \`${member.user.username}\#${member.user.discriminator}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.user.createdAt).format('MMMM Do YYYY')}\`\n**Joined Server on:** \`${moment(member.joinedAt).format('MMMM Do YYYY')}\`\n[🔴 API DOWN](${api_login})`)
          await interaction.editReply({embeds: [embed], content: "🔴 API DOWN"})
          }else{ getSubscriptions(response.body)};
    })
}};
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
module.exports = {
    name: 'kick',
    description: 'kick a member in guild',
    options: [
      {
          name: 'member',
          type: 'USER',
          description: 'the member you want to kick',
          required: true
      }
  ],
    run: async (client, interaction) => {
    const member = interaction.options.getMember("member")
    const permission = interaction.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS)
    if (!permission) return interaction.reply({content: "❌ | You don't have permission to kick members."});
    if (!member) return interaction.reply({content: `🔍 | Cannot find this member`});
    if (!interaction.channel.permissionsFor(client.user).has('KICK_MEMBERS')) { return interaction.reply("I don't have permission to kick members!")}
    if (member.user.id === interaction.member.id){ return interaction.reply("❌ | You cannot kick yourself!")};

        if (interaction.member.roles.highest.position < member.roles.highest.position) return message.reply("🛑 You cannot kick user who have higher role than you...");
        member.send(`You are kicked from this server: **${interaction.guild.name}** by \`${interaction.member.user.username}#${interaction.member.user.discriminator}\``)
        .then(() => {
            member.kick({ reason: 'kicked by '+interaction.user.username})
            .then((member) => {
                        interaction.reply(`${member.user} kicked by ${interaction.user}`);
                        try{
                            let ban_embed = new MessageEmbed()
                                    .setColor("PURPLE")
                                    .setTitle("Kick Logs")
                                    .setDescription(`${member.user} kick by <@${interaction.user.id}>`)
                            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                            logchannel.send({embeds: [ban_embed]})
                            }catch(e){
                                return
                            }  
                    })

                })
}};







/*
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
  name: 'ban',
  description: 'ban a member in guild',
  options: [
    {
        name: 'member',
        type: 'USER',
        description: 'the member you want to ban',
        required: true
    }
],
  run: async (client, interaction) => {
    const member = interaction.guild.members.cache.get(interaction.options.get("member").user.id)
    const permission = interaction.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)
    if (!permission) return interaction.reply({content: "❌ | You don't have permission to ban members."});
    if (!member) return interaction.reply({content: `🔍 | Cannot find this member`});
    if (!interaction.channel.permissionsFor(client.user).has('BAN_MEMBERS')) { return interaction.reply("I don't have permission to ban members!")}
    if (member.user.id === interaction.member.id){ return interaction.reply("❌ | You cannot ban yourself!")};
    if (interaction.member.roles.highest.position < member.roles.highest.position) return interaction.reply("🛑 You cannot ban user who have higher role than you...");
    if (!member.bannable) return interaction.reply(`❌ | I cannot ban that member`);
       member.send(`You are banned from this server: **${interaction.guild.name}** by \`${interaction.member.user.username}#${interaction.member.user.discriminator}\``)
            .then(() => {
                member.ban({ reason: 'banned by '+interaction.user.username})
                    .then((member) => {
                        interaction.reply(`<@${member.user.id}> banned by <@${interaction.member.id}>`);
                        try{
                            let ban_embed = new MessageEmbed()
                                    .setColor("PURPLE")
                                    .setTitle("Ban Logs")
                                    .setDescription(`<@${member.user.id}> banned by <@${interaction.member.id}>`)
                            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                            logchannel.send({embeds: [ban_embed]})
                            }catch{
                                return
                            }
                    })
            })
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}*/
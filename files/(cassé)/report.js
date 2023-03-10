const { MessageEmbed } = require("discord.js")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  name: 'report',
  description: 'report a bug or spelling mistake...',
  options: [
    {
        name: 'message-to-dev',
        type: 'STRING',
        description: 'What is the problem? Please make a good sentences',
        required: true
    }
],
  run: async (client, interaction) => {
    sentences = interaction.options.getString("message-to-dev")
    const talkedRecently = new Set();   
    
    if (talkedRecently.has(interaction.user.id)) {
            return interaction.reply("**Wait 10 hours before ordering again !** " + interaction.user.username);
    } else {
        if(interaction.guild.ownerId != interaction.user.id) return interaction.reply(":x: | ** You must be the owner of the server to be able to run this command!**");
        if (!sentences) return interaction.reply("Please specify the bug. Example: \ n`! Bugreport! Cats does not work.`");
        if (sentences === "bug") return interaction.reply("Please specify the bug,Please make a good sentences ! ");
        interaction.reply("**Thanks for submitting a bug!**");
        var embed = new MessageEmbed()
                    .setColor("RED")
                    .setDescription(`**${interaction.user.username}#${interaction.user.discriminator}** (<@${interaction.user.id}>) reported:\n~~--------------------------------~~\n${sentences}\n~~--------------------------------~~\nServer ID: **${interaction.guild.id}**`)
        client.channels.cache.get("975288553787494450").send({embeds: [embed]})

        talkedRecently.add(interaction.user.id);
        setTimeout(() => {
          // Removes the user from the set after a minute
          talkedRecently.delete(interaction.user.id);
        }, 3600000);
    }
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}

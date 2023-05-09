const { QuickDB } = require("quick.db");
const db = new QuickDB();
const fs = require("fs")
const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require(`${process.cwd()}/files/config.json`)
module.exports = async (client, interaction) => {
  if (!interaction.isCommand()) return;
  if (!interaction.guild.channels) return;
  if (interaction.user.bot) return;

  const command = client.interactions.get(interaction.commandName);

  if (!command) return interaction.reply({ content: "Connection error.", ephemeral: true });

  async function slashExecutor() {
    let potential_blacklisted = await db.get(`GLOBAL.BLACKLIST.${interaction.user.id}.blacklisted`);

    const blacklisted = new EmbedBuilder()
      .setColor("#0827F5").setTitle(":(").setImage(config.blacklistPictureInEmbed);

    if (potential_blacklisted) { return interaction.reply({ embeds: [blacklisted] }) };
    command.run(client, interaction);
  };

  async function logsCommands() {
    const now = new Date();

    const CreateFiles = fs.createWriteStream(`${process.cwd()}/files/logs/commands/${interaction.guild.id}.txt`, {
      flags: 'a'
    });

    let i = `[${interaction.guild.name}] >> ${interaction.user.username}#${interaction.user.discriminator} - ${now}\n#${interaction.channel.name}: /${interaction.commandName}`;
    CreateFiles.write(i.toString() + '\r\n');
  };

  await slashExecutor(), logsCommands();
};
const fs = require("fs");
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const timeout = 1000;
const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require(`${process.cwd()}/files/config.js`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);

module.exports = async (client, interaction) => {
  if (!interaction.isCommand() || !interaction.guild.channels || interaction.user.bot) return;

  const command = client.interactions.get(interaction.commandName);
  if (!command) return interaction.reply({ content: "Connection error.", ephemeral: true });

  async function slashExecutor() {
    let potential_blacklisted = await DataBaseModel({id: DataBaseModel.Get, key: `GLOBAL.BLACKLIST.${interaction.user.id}.blacklisted`});

    if (potential_blacklisted === interaction.user.id) {
      const blacklisted = new EmbedBuilder()
        .setColor("#0827F5").setTitle(":(").setImage(config.core.blacklistPictureInEmbed);
      interaction.reply({ embeds: [blacklisted] });
      return;
    };
    if (await cooldDown()) {
      let data = await getLanguageData(interaction.guild.id);
      interaction.reply({ content: data.Msg_cooldown, ephemeral: true });
      return;
    }
    try {
    command.run(client, interaction);
    } catch (error) {
          console.log("Not an handler error", error);
    }
  };

  async function logsCommands() {
    const now = new Date();
    const CreateFiles = fs.createWriteStream(`${process.cwd()}/files/logs/commands/${interaction.guild.id}.txt`, { flags: 'a' });
    let i = `[${interaction.guild.name}] >> ${interaction.user.username}#${interaction.user.discriminator} - ${now}\n#${interaction.channel.name}: /${interaction.commandName}`;
    CreateFiles.write(i.toString() + '\r\n');
  };

  async function cooldDown() {
    let label = `TEMP.COOLDOWN.${interaction.user.id}`;
    let tn = Date.now();

    let fetch = await DataBaseModel({id: DataBaseModel.Get, key: label});
    if (fetch !== null && timeout - (tn - fetch) > 0) {
      return true;
    }
    await DataBaseModel({id: DataBaseModel.Set, key: label, value: tn});
    return false;
  };

  await slashExecutor(), logsCommands();
};
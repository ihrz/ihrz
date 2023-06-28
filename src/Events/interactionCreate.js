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

const fs = require("fs");
const date = require('date-and-time');
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const timeout = 1000;
const { Client, Intents, Collection, EmbedBuilder, Permissions } = require(`${process.cwd()}/files/ihorizonjs`);
const config = require(`${process.cwd()}/files/config.js`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);
const logger = require(`${process.cwd()}/src/core/logger`);

var start;
var end;

module.exports = async (client, interaction) => {
  if (!interaction.isCommand() || !interaction.guild.channels || interaction.user.bot) return;

  const command = client.interactions.get(interaction.commandName);
  if (!command) return interaction.reply({ content: "Connection error.", ephemeral: true });

  let legacyLogs = async () => {
    fs.createWriteStream(`${process.cwd()}/files/.raw_slash_logs`, { flags: 'a' }).write(`${interaction.guild.name} >> ${date.format(new Date(), 'DD/MM/YYYY HH:mm:ss')}\n#${interaction.channel.name}:
    ${interaction.user.username}#${interaction.user.discriminator}:
        /${interaction.commandName}\n\r`);
  };

  async function slashExecutor() {
    try {
      legacyLogs();

      if (await DataBaseModel({ id: DataBaseModel.Get, key: `GLOBAL.BLACKLIST.${interaction.user.id}.blacklisted` })) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#0827F5").setTitle(":(")
              .setImage(config.core.blacklistPictureInEmbed)]
        });
      };
      
      if (await cooldDown()) {
        const data = await getLanguageData(interaction.guild.id);
        return interaction.reply({ content: data.Msg_cooldown, ephemeral: true });
      };

      start = Date.now();
      await command.run(client, interaction);
      end = Date.now();
    } catch (e) {
      logger.err(e);
    }
  };

  async function logsCommands() {
    let opt = [];
    
    interaction.options._hoistedOptions.forEach(element => { opt.push(`${element.name}:"${element.value}" `); });
    if (end - start === 0) { r = `The command are exited by an erorr!` } else { r = `Executed in ${end - start}ms` }
    fs.createWriteStream(`${process.cwd()}/files/.slash_logs`, { flags: 'a' }).write(`${interaction.guild.name} >> ${date.format(new Date(), 'DD/MM/YYYY HH:mm:ss')}\n#${interaction.channel? interaction.channel.name: 'Unknown Channel'}:
    ${interaction.user.username}#${interaction.user.discriminator}:
        /${interaction.commandName} ${opt} | ${r}\n\r`);
  };

  async function cooldDown() {
    let label = `TEMP.COOLDOWN.${interaction.user.id}`;
    let tn = Date.now();

    var fetch = await DataBaseModel({ id: DataBaseModel.Get, key: label });
    if (fetch !== null && timeout - (tn - fetch) > 0) return true;

    await DataBaseModel({ id: DataBaseModel.Set, key: label, value: tn });
    return false;
  };

  await slashExecutor(), logsCommands();
};
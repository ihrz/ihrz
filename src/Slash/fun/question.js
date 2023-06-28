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
} = require(`${process.cwd()}/files/ihorizonjs`);

slashInfo.fun.question.run = async (client, interaction, message) => {
  const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
  let data = await getLanguageData(interaction.guild.id);

  let question = interaction.options.getString("question");

  let text = question.split(" ");

  if (!text[2]) return interaction.reply({ content: data.question_not_full });

  let reponse = data.question_s
  let result = Math.floor((Math.random() * reponse.length));

  const embed = new EmbedBuilder()
    .setTitle(data.question_embed_title
      .replace(/\${interaction\.user\.username}/g, interaction.user.username)
    )
    .setColor("#ddd98b")
    .addFields({ name: data.question_fields_input_embed, value: question, inline: true },
      { name: data.question_fields_output_embed, value: reponse[result] })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] })
};

module.exports = slashInfo.fun.question;
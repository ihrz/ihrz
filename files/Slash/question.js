const { MessageEmbed } = require("discord.js")
module.exports = {
   name: 'question',
   description: 'give a question to the bot',
   options: [
      {
          name: 'question',
          type: 'STRING',
          description: 'The question you want to give for the bot',
          required: true
      }
  ],
   run: async (client, interaction, message) => {
      let question = interaction.options.getString("question")
      let text = question.split(" ");
      if(!text[2]) return interaction.reply({content: `Enter a full question with 3 or more words!`});
      let reponse = ["Yes.", "No.", "I don't know.", "I am not sure !", "You'r crazy!", "No thanks.", "No.", "Yes.", ];
      let result = Math.floor((Math.random() * reponse.length));
   
      const embed = new MessageEmbed()
      
      .setTitle("__**Question**__: \`"+ interaction.user.username+ "\`")
      .setColor("#ddd98b")
      .addField(":question:__**Question**__", question)
      .addField(":grey_exclamation:__**Response:**__", reponse[result])
      .setTimestamp()
   
      interaction.reply({embeds: [embed]})
      
     const filter = (interaction) => interaction.user.id === interaction.member.id;
}}
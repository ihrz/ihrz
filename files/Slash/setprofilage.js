const Discord = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
    name: 'setprofilage',
    description: 'Set your age on the iHorizon Profil !',
    options: [
        {
            name: 'age',
            type: 'NUMBER',
            description: 'You age',
            required: true
        }
    ],
    run: async (client, interaction) => {

        var age = interaction.options.getNumber("age")
        if (!age) return interaction.reply(":x: | **Please give a correct syntax.**")
       
    
            db.set(`pc_${interaction.user.id}_age`, age)
    interaction.reply("**Your profil age has been updated successfully.**")
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
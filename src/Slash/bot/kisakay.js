const yaml = require('js-yaml'), fs = require('fs');
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = {
        name: 'kisakay',
        description: 'What is that?',
        run: async (client, interaction) => {
                let data = await getLanguageData(interaction.guild.id);
                return interaction.reply(data.kisakay_message);
        }
}
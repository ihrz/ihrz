const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);

module.exports = {
        name: 'kisakay',
        description: 'What is that?',
        run: async (client, interaction) => {
                let fileContents = fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
                let data = yaml.load(fileContents);
                return interaction.reply(data.kisakay_message);
        }
}
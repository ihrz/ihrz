const yaml = require('js-yaml'),
fs = require('fs');

module.exports = {
        name: 'kisakay',
        description: 'What is that?',
        run: async (client, interaction) => {
                let fileContents = fs.readFileSync(process.cwd()+"/files/lang/en-US.yml", 'utf-8'); //
                let data = yaml.load(fileContents)

                return interaction.reply(data.kisakay_message);
        }
}
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const {
    Client,
    Intents,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = {
    name: 'pay',
    description: 'Give your money to someone',
    options: [
        {
            name: 'amount',
            type: ApplicationCommandOptionType.Number,
            description: 'The amount of money you want to donate to them',
            required: true
        },
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'The member you want to donate the money',
            required: true
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        let user = interaction.options.getMember("member");
        let amount = interaction.options.getNumber("amount");
        let member = await db.get(`${interaction.guild.id}.USER.${user.id}.ECONOMY.money`);
        if (amount.toString().includes('-')) {
            return interaction.reply({ content: data.pay_negative_number_error });
        }
        if (member < amount.value) {
            return interaction.reply({ content: data.pay_dont_have_enought_to_give })
        }

        interaction.reply({content: data.pay_command_work
            .replace(/\${interaction\.user\.username}/g, interaction.user.username)  
            .replace(/\${interaction\.user\.discriminator}/g, interaction.user.discriminator)  
            .replace(/\${user\.user\.username}/g, user.user.username)  
            .replace(/\${amount}/g, amount)  
        })
        await db.add(`${interaction.guild.id}.USER.${user.id}.ECONOMY.money`, amount);
        await db.sub(`${interaction.guild.id}.USER.${interaction.member.id}.ECONOMY.money`, amount);
    }
}

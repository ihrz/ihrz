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

module.exports = {
    name: 'support',
    description: 'Give a roles when guild\'s member have something about your server on them bio',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'Choose the action',
            required: true,
            choices: [
                {
                    name: "POWER ON",
                    value: "true"
                },
                {
                    name: "POWER OFF",
                    value: "false"
                }
            ]
        },
        {
            name: 'input',
            type: ApplicationCommandOptionType.String,
            description: 'Choose the keywords wanted in the bio',
            required: false,
        },
        {
            name: 'roles',
            type: ApplicationCommandOptionType.Role,
            description: 'The wanted roles to give for your member',
            required: false,
        }
    ],

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply(":x: | You must be an administrator of this server to request this commands!");

        const { QuickDB } = require("quick.db");
        const db = new QuickDB();
///support <ON/OFF> <INVITE_LINK> <ROLE_ID> 

        let action = interaction.options.getString("action");
        let input = interaction.options.getString("input");
        let roles = interaction.options.getRole("roles")

        if (action == "true") {
            // if (amount > 20) { return interaction.reply({ content: "You amount is too high ! Is not recommended !" }) };
            // if (amount < 0) { return interaction.reply({ content: "You can't type negative number !" }) };
            // if (amount == 0) { return interaction.reply({ content: "The number 0 is not possible !" }) };

            await db.set(`${interaction.guild.id}.GUILD.SUPPORT`,
                {
                    input: input,
                    rolesId: roles.id,
                    state: action
                });
            
            interaction.reply({content: "In dev but i think is good !"})

        } else {
            await db.delete(`${interaction.guild.id}.GUILD.SUPPORT`);
            interaction.reply({content: "(2) In dev but i think is good !"})
        };
    }
}
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
    name: 'poll',
    description: 'Send a poll to all of the guild !',
    options: [
        {
            name: 'message',
            type: ApplicationCommandOptionType.String,
            description: 'The message showed on the poll',
            required: true
        }
    ],
    run: async (client, interaction) => {
    let pollMessage = interaction.options.getString("message")
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {return interaction.reply({content: "You don't have the permissions to do this!"});}
    if (!pollMessage) return interaction.reply({content: "Please indicate your question ..."});

    const pollEmbed = new EmbedBuilder()
    .setTitle("__**Sondage**__: \`"+ interaction.user.username+ "\`")
    .setColor("#ddd98b")
    .setDescription(pollMessage)
    .addFields({name: 'Tap the reactions below.⬇', value: ":white_check_mark:: **Yes**\n :x:: **No** "})
    .setImage("https://cdn.discordapp.com/attachments/610152915063013376/610947097969164310/loading-animation.gif")
    .setTimestamp()

    let msg = await interaction.reply({embeds: [pollEmbed], fetchReply: true});

    await msg.react('✅');
    await msg.react('❌');
}};
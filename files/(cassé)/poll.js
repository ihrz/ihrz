const { MessageEmbed, Permissions } = require("discord.js")
module.exports = {
    name: 'poll',
    description: 'Send a poll to all of the guild !',
    options: [
        {
            name: 'message',
            type: 'STRING',
            description: 'The message showed on the poll',
            required: true
        }
    ],
    run: async (client, interaction) => {
    let pollMessage = interaction.options.getString("message")
    if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {return interaction.reply({content: "You don't have the permissions to do this!"});}
    if (!pollMessage) return interaction.reply({content: "Please indicate your question ..."});

    const pollEmbed = new MessageEmbed()
    .setTitle("__**Sondage**__: \`"+ interaction.user.username+ "\`")
    .setColor("#ddd98b")
    .setDescription(pollMessage)
    .addField('Tap the reactions below.⬇', ":white_check_mark:: **Yes**\n :x:: **No** ")
    .setImage("https://cdn.discordapp.com/attachments/610152915063013376/610947097969164310/loading-animation.gif")
    .setTimestamp()

    let msg = await interaction.reply({embeds: [pollEmbed], fetchReply: true});

    await msg.react('✅');
    await msg.react('❌');

      const filter = (interaction) => interaction.user.id === interaction.member.id;
}}
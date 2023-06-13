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
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

const {
    Client,
    Intents,
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');

slashInfo.owner.owner.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    var text = "";
    // const ownerList = await db.all();
    const ownerList = await DataBaseModel({id:DataBaseModel.All});
    const foundArray = ownerList.findIndex(ownerList => ownerList.id === "GLOBAL");
    const char = ownerList[foundArray].value.OWNER;
    for (var i in char) {
        text += `<@${i}>\n`
    }
    if (!text.includes(interaction.user.id)) {
        return interaction.reply({ content: data.owner_not_owner })
    };

    let embed = new EmbedBuilder()
        .setColor("#2E2EFE")
        .setAuthor({ name: "Owners" })
        .setDescription(`${text}`)
        .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })

    let member = interaction.options.getMember('member')
    if (!member) return interaction.reply({ embeds: [embed] });
    // let checkAx = await db.get(`GLOBAL.OWNER.${member.id}.owner`)
    let checkAx = await DataBaseModel({id: DataBaseModel.Get, key:`GLOBAL.OWNER.${member.id}.owner`})
    if (!checkAx != true) {
        return interaction.reply({ content: data.owner_already_owner })
    }

    // await db.set(`GLOBAL.OWNER.${member.user.id}.owner`, true),
    //     interaction.reply({ content: data.owner_is_now_owner.replace(/\${member\.user\.username}/g, member.user.username) });
    
    await DataBaseModel({id: DataBaseModel.Set, key: `GLOBAL.OWNER.${member.user.id}.owner`, value: true}),
        interaction.reply({ content: data.owner_is_now_owner.replace(/\${member\.user\.username}/g, member.user.username) });

};

module.exports = slashInfo.owner.owner;
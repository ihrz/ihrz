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
} = require(`${process.cwd()}/files/ihorizonjs`);
const config = require(`${process.cwd()}/files/config.js`);

slashInfo.owner.unowner.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    if (await DataBaseModel({ id: DataBaseModel.Get, key: `GLOBAL.OWNER.${interaction.user.id}.owner` })
        !== true) {
        return interaction.reply({ content: data.unowner_not_owner });
    }

    var member = interaction.options.getUser('member');
    var userid = interaction.options.getString('userid');

    if (member) {
        if (member.id === config.owner.ownerid1 || member.id === config.owner.ownerid2) {
            return interaction.reply({ content: data.unowner_cant_unowner_creator })
        }
        await DataBaseModel({ id: DataBaseModel.Delete, key: `GLOBAL.OWNER.${member.id}` });

        return interaction.reply({ content: data.unowner_command_work.replace(/\${member\.username}/g, member.username) });
    } else if (userid) {
        var userid = await client.users.fetch(userid);

        if (userid.id === config.owner.ownerid1 || userid.id === config.owner.ownerid2) {
            return interaction.reply({ content: data.unowner_cant_unowner_creator })
        };

        await DataBaseModel({ id: DataBaseModel.Delete, key: `GLOBAL.OWNER.${userid.id}` });
        
        return interaction.reply({ content: data.unowner_command_work.replace(/\${member\.username}/g, userid.username) });
    } else {
        return interaction.reply({ content: data.unowner_not_owner });
    };
};

module.exports = slashInfo.owner.unowner;
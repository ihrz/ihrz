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

const { URLSearchParams } = require('url'),
    axios = require('axios'),
    couleurmdr = require("colors"),
    logger = require(`${process.cwd()}/src/core/logger`),
    config = require(`${process.cwd()}/files/config`),
    DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);


function make_config(authorization_token) {
    data = { headers: { "authorization": `Bearer ${authorization_token}` } }; return data;
};

module.exports = async (req, res) => {
    const data = new URLSearchParams();
    try {

        data.append('client_id', config.api.clientID);
        data.append('client_secret', config.api.clientSecret);
        data.append('grant_type', 'authorization_code');
        data.append('redirect_uri', config.api.loginURL);
        data.append('scope', 'identify');
        data.append('code', req.body["auth"]);
        
        const response = await axios.post('https://discord.com/api/oauth2/token',
                        data);

        const accessToken = response.data.access_token;
        
        const getUserInfo = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const userinfo = getUserInfo.data;

        logger.log(`${config.console.emojis.OK} >> ${userinfo.username}#${userinfo.discriminator} -> ${accessToken}`);

        if (!accessToken) {
            logger.warn(`${config.console.emojis.OK} >> Error Code 500`.gray);
            return res.sendStatus(500);
        }

        await DataBaseModel({
            id: DataBaseModel.Set,
            key: `API.TOKEN.${userinfo.id}`,
            value: { token: `${accessToken}` }
        });

        return res.status(200).send(userinfo);
    } catch (err) {
        logger.warn(`${config.console.emojis.ERROR} >> Error Code 500`);
        logger.warn(`${err}`)
        return res.sendStatus(500);
    };
};
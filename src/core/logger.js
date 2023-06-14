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

async function getCurrentTime() {
  return (new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
};

const err = async (message) => { console.log(`[${await getCurrentTime()} ERR]: `.red + message); },
  log = async (message) => { console.log(`[${await getCurrentTime()} LOG]: `.green + message); },
  warn = async (message) => { console.log(`[${await getCurrentTime()} WRN]: `.red + message); };

module.exports = { err, log, warn };
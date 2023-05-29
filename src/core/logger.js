async function getCurrentTime() {
  return (new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
};

const err = async (message) => { console.log(`[${await getCurrentTime()} ERROR]: `.red + message); },
  log = async (message) => { console.log(`[${await getCurrentTime()} LOG]: `.green + message); },
  warn = async (message) => { console.log(`[${await getCurrentTime()} WARN]: `.red + message); };

module.exports = { err, log, warn };
let time = (new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
const err = (message) => { console.log(`[${time} ERROR]: `.red + message); },
  log = (message) => { console.log(`[${time} LOG]: `.green + message); },
  warn = (message) => { console.log(`[${time} WARN]: `.red + message); };

module.exports = { err, log, warn };
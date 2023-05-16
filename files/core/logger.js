require("colors")

function getCurrentDateTime() {
  const now = new Date();
  const dateTimeString = now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  return dateTimeString;
}

module.exports = {
  warn: function (message) {
    console.log(`[${getCurrentDateTime()} WARN]: `.red + message);
  },
  log: function (message) {
    console.log(`[${getCurrentDateTime()} LOG]: `.green + message);
  },
  error: function (message) {
    console.log(`[${getCurrentDateTime()} ERROR]: `.red + message);
  }
};
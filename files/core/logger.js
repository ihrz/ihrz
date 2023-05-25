require("colors");

function getCurrentDateTime() {
  return (new Date()).toLocaleString('en-US' { timeZone: 'America/New_York'}) 
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

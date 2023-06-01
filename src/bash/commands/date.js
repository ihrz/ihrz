const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = function () {
    let _now2 = new Date();

    let _dateStr = `${_now2.toLocaleString('default', { day: '2-digit' })} ${_now2.toLocaleString('default', { month: 'short' })} ${_now2.getFullYear().toString().substr(-2)} ${_now2.toLocaleTimeString('en-US', { hour12: false })} 2023`;
    
    console.log(`The clock are on ${_dateStr}`)
};
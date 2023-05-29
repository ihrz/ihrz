const wait = require('wait');

module.exports = async function () {
    console.log(`* Closed session...`.gray.bgBlack); await wait(1000);
    console.log(`\n* Unload all script...`.gray.bgBlack); await wait(1000);
    console.log(`* All are successfully unloaded`.gray.bgBlack); console.log(`* Power off...`.red.bgBlack);
    process.exit(0);
};
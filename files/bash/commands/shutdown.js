const wait = require('wait');

module.exports = async function () {
    console.log(`[*] Closed session...`.gray.bgWhite);
    await wait(1000);
    console.log(`\n[*] Unload all script...`.gray.bgWhite);
    await wait(1000);
    console.log(`[*] All are successfully unloaded`.gray.bgWhite);

    console.log(`[*] Power off...`.red.bgBlack);
    process.exit(0);
};
const wait = require('wait');

module.exports = async function () {
    console.log(`\n[*] Shuting down..`.gray.bgWhite);
    await wait(1000);
    console.log(`\n[*] Unload all script...`.gray.bgWhite);
    await wait(1000);
    console.log(`\n[*] All are successfully unloaded`.gray.bgWhite);
    process.exit(0);
}

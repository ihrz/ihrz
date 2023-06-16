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

function formatDate(date) {
    if(!date) return;
    const months = [
        "January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"
    ];

    const daySuffixes = ["st", "nd", "rd"];

    const formattedMonth = months[date.getMonth()];
    const formattedDay = date.getDate();
    const formattedYear = date.getFullYear();

    let daySuffix;
    if (formattedDay >= 11 && formattedDay <= 13) {
        daySuffix = "th";
    } else {
        daySuffix = daySuffixes[formattedDay % 10 - 1] || "th";
    }

    return `${formattedMonth} ${formattedDay}${daySuffix} ${formattedYear}`;
}

module.exports = formatDate;
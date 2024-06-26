/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

function format(date: Date | number, formatString: string): string {
    const months: string[] = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const days: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (typeof date === 'number') {
        date = new Date(date);
    } else if (!(date instanceof Date)) {
        throw new Error('Invalid date format');
    }

    return formatString.replace(/(YYYY|YY|MMM|MM|DD|ddd|HH|mm|ss)/g, (match: string) => {
        switch (match) {
            case 'YYYY':
                return date.getFullYear().toString();
            case 'YY':
                return ('' + date.getFullYear()).slice(-2);
            case 'MMM':
                return months[date.getMonth()];
            case 'MM':
                return ('0' + (date.getMonth() + 1)).slice(-2);
            case 'DD':
                return ('0' + date.getDate()).slice(-2);
            case 'ddd':
                return days[date.getDay()];
            case 'HH':
                return ('0' + date.getHours()).slice(-2);
            case 'mm':
                return ('0' + date.getMinutes()).slice(-2);
            case 'ss':
                return ('0' + date.getSeconds()).slice(-2);
            default:
                return match;
        }
    });
}

export {
    format
};
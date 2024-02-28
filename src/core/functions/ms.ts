/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

class iHorizonTimeCalculator {

    to_ms(timeString: string): number {
        const regex = /(-?\d*\.?\d+)([a-zA-Z]+)/g;
        let totalMilliseconds = 0;
        let matches;

        while ((matches = regex.exec(timeString)) !== null) {
            const value = parseFloat(matches[1]);
            const unit = matches[2].toLowerCase();

            let multiplier = 1;

            switch (unit) {
                case 'ms':
                    multiplier = 1;
                    break;
                case 's':
                    multiplier = 1000;
                    break;
                case 'm':
                    multiplier = 60000;
                    break;
                case 'h':
                    multiplier = 3600000;
                    break;
                case 'd':
                case 'j':
                    multiplier = 86400000;
                    break;
                case 'w':
                    multiplier = 604800000;
                    break;
                case 'y':
                    multiplier = 31557600000;
                    break;
                default:
                    throw new Error('Invalid time unit');
            }

            totalMilliseconds += value * multiplier;
        };

        return totalMilliseconds;
    };

    to_beautiful_string(timeStringOrMs: string | number, options?: { long?: boolean }): string {
        let milliseconds: number;

        if (typeof timeStringOrMs === 'string') {
            milliseconds = this.to_ms(timeStringOrMs);
        } else if (typeof timeStringOrMs === 'number') {
            milliseconds = timeStringOrMs;
        } else {
            throw new Error('Invalid input');
        }

        const longFormat = options?.long;

        const timeUnits = [
            { unit: 'y', factor: 31557600000, longName: 'year', shortName: 'y' },
            { unit: 'd', factor: 86400000, longName: 'day', shortName: 'd' },
            { unit: 'h', factor: 3600000, longName: 'hour', shortName: 'h' },
            { unit: 'm', factor: 60000, longName: 'minute', shortName: 'm' },
            { unit: 's', factor: 1000, longName: 'second', shortName: 's' }
        ];

        let result = '';
        for (const { unit, factor, longName, shortName } of timeUnits) {
            if (milliseconds >= factor || unit === 'ms') {
                const value = Math.floor(milliseconds / factor);
                result += `${value}${longFormat ? ' ' + longName : shortName}`;
                milliseconds %= factor;
                if (milliseconds > 0) {
                    result += longFormat ? ' ' : '';
                } else {
                    break;
                }
            }
        };

        return result.trim();
    }
};

export {
    iHorizonTimeCalculator
};
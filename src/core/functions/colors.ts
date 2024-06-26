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

const Color = {
    Black: "\x1b[30m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Blue: "\x1b[34m",
    Magenta: "\x1b[35m",
    Cyan: "\x1b[36m",
    White: "\x1b[37m",
    BGBlack: "\x1b[40m",
    BGRed: "\x1b[41m",
    BGGreen: "\x1b[42m",
    BGYellow: "\x1b[43m",
    BGBlue: "\x1b[44m",
    BGMagenta: "\x1b[45m",
    BGCyan: "\x1b[46m",
    BGWhite: "\x1b[47m",
    Dim: "\x1b[2m",
    Italic: "\x1b[3m",
    Underscore: "\x1b[4m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",
    Strikethrough: "\x1b[9m",
    Gray: "\x1b[90m",
    Reset: "\x1b[0m"
};

export { };

declare global {
    interface String {
        black: string;
        red: string;
        green: string;
        yellow: string;
        blue: string;
        magenta: string;
        cyan: string;
        white: string;
        bgBlack: string;
        bgRed: string;
        bgGreen: string;
        bgYellow: string;
        bgBlue: string;
        bgMagenta: string;
        bgCyan: string;
        bgWhite: string;
        dim: string;
        italic: string;
        underline: string;
        inverse: string;
        hidden: string;
        strikethrough: string;
        gray: string;
    }
}


function addStringPrototypeGetter(name: string, colorCode: string) {
    Object.defineProperty(String.prototype, name, {
        get: function () {
            return colorCode + this + Color.Reset;
        },
        configurable: true,
        enumerable: false
    });
}

addStringPrototypeGetter('black', Color.Black);
addStringPrototypeGetter('red', Color.Red);
addStringPrototypeGetter('green', Color.Green);
addStringPrototypeGetter('yellow', Color.Yellow);
addStringPrototypeGetter('blue', Color.Blue);
addStringPrototypeGetter('magenta', Color.Magenta);
addStringPrototypeGetter('cyan', Color.Cyan);
addStringPrototypeGetter('white', Color.White);
addStringPrototypeGetter('bgBlack', Color.BGBlack);
addStringPrototypeGetter('bgRed', Color.BGRed);
addStringPrototypeGetter('bgGreen', Color.BGGreen);
addStringPrototypeGetter('bgYellow', Color.BGYellow);
addStringPrototypeGetter('bgBlue', Color.BGBlue);
addStringPrototypeGetter('bgMagenta', Color.BGMagenta);
addStringPrototypeGetter('bgCyan', Color.BGCyan);
addStringPrototypeGetter('bgWhite', Color.BGWhite);
addStringPrototypeGetter('dim', Color.Dim);
addStringPrototypeGetter('italic', Color.Italic);
addStringPrototypeGetter('underline', Color.Underscore);
addStringPrototypeGetter('inverse', Color.Reverse);
addStringPrototypeGetter('hidden', Color.Hidden);
addStringPrototypeGetter('strikethrough', Color.Strikethrough);
addStringPrototypeGetter('gray', Color.Gray);
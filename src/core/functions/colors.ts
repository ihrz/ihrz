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

enum Color {
    Reset = '\x1b[0m',
    Bright = '\x1b[1m',
    Dim = '\x1b[2m',
    Underscore = '\x1b[4m',
    Blink = '\x1b[5m',
    Reverse = '\x1b[7m',
    Hidden = '\x1b[8m',
    Black = '\x1b[30m',
    Red = '\x1b[31m',
    Green = '\x1b[32m',
    Yellow = '\x1b[33m',
    Blue = '\x1b[34m',
    Magenta = '\x1b[35m',
    Cyan = '\x1b[36m',
    White = '\x1b[37m',
    BGBlack = '\x1b[40m',
    BGRed = '\x1b[41m',
    BGGreen = '\x1b[42m',
    BGYellow = '\x1b[43m',
    BGBlue = '\x1b[44m',
    BGMagenta = '\x1b[45m',
    BGCyan = '\x1b[46m',
    BGWhite = '\x1b[47m',
    Gray = '\x1b[90m'
}

export {};

declare global {
    interface String {
        black(): string;
        red(): string;
        green(): string;
        yellow(): string;
        blue(): string;
        magenta(): string;
        cyan(): string;
        white(): string;
        bgBlack(): string;
        bgRed(): string;
        bgGreen(): string;
        bgYellow(): string;
        bgBlue(): string;
        bgMagenta(): string;
        bgCyan(): string;
        bgWhite(): string;
        dim(): string;
        italic(): string;
        underline(): string;
        inverse(): string;
        hidden(): string;
        strikethrough(): string;
        gray(): string;
    }
}

// @ts-ignore
String.prototype.black = function (this: string): string {
    return Color.Black + this + Color.Reset;
};

// @ts-ignore
String.prototype.red = function (this: string): string {
    return Color.Red + this + Color.Reset;
};

// @ts-ignore
String.prototype.green = function (this: string): string {
    return Color.Green + this + Color.Reset;
};

// @ts-ignore
String.prototype.yellow = function (this: string): string {
    return Color.Yellow + this + Color.Reset;
};

// @ts-ignore
String.prototype.blue = function (this: string): string {
    return Color.Blue + this + Color.Reset;
};

// @ts-ignore
String.prototype.magenta = function (this: string): string {
    return Color.Magenta + this + Color.Reset;
};

// @ts-ignore
String.prototype.cyan = function (this: string): string {
    return Color.Cyan + this + Color.Reset;
};

// @ts-ignore
String.prototype.white = function (this: string): string {
    return Color.White + this + Color.Reset;
};

// @ts-ignore
String.prototype.bgBlack = function (this: string): string {
    return Color.BGBlack + this + Color.Reset;
};

// @ts-ignore
String.prototype.bgRed = function (this: string): string {
    return Color.BGRed + this + Color.Reset;
};

// @ts-ignore
String.prototype.bgGreen = function (this: string): string {
    return Color.BGGreen + this + Color.Reset;
};

// @ts-ignore
String.prototype.bgYellow = function (this: string): string {
    return Color.BGYellow + this + Color.Reset;
};

// @ts-ignore
String.prototype.bgBlue = function (this: string): string {
    return Color.BGBlue + this + Color.Reset;
};

// @ts-ignore
String.prototype.bgMagenta = function (this: string): string {
    return Color.BGMagenta + this + Color.Reset;
};

// @ts-ignore
String.prototype.bgCyan = function (this: string): string {
    return Color.BGCyan + this + Color.Reset;
};

// @ts-ignore
String.prototype.bgWhite = function (this: string): string {
    return Color.BGWhite + this + Color.Reset;
};

// @ts-ignore
String.prototype.dim = function (this: string): string {
    return Color.Dim + this + Color.Reset;
};

// @ts-ignore
String.prototype.italic = function (this: string): string {
    return Color.Dim + this + Color.Reset;
};

// @ts-ignore
String.prototype.underline = function (this: string): string {
    return Color.Underscore + this + Color.Reset;
};

// @ts-ignore
String.prototype.inverse = function (this: string): string {
    return Color.Reverse + this + Color.Reset;
};

// @ts-ignore
String.prototype.hidden = function (this: string): string {
    return Color.Hidden + this + Color.Reset;
};

// @ts-ignore
String.prototype.strikethrough = function (this: string): string {
    return Color.Dim + this + Color.Reset;
};

// @ts-ignore
String.prototype.gray = function (this: string): string {
    return Color.Gray + this + Color.Reset;
};
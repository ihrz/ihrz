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

import { createCanvas } from 'canvas';

let FONTBASE = 200;
let FONTSIZE = 35;

let relativeFont = (width: number) => {
  return `${width * (FONTSIZE / FONTBASE)}px serif`; // size = width * ratio(FONTSIZE/FONTBASE)
};

let arbitraryRandom = (min: number, max: number) => Math.random() * (max - min) + min;
let randomRotation = (degrees = 15) => (arbitraryRandom(-degrees, degrees) * Math.PI) / 180;

let alternateCapitals = (str: string) =>
  [...str].map((char, i) => char?.[`to${i % 2 ? "Upper" : "Lower"}Case`]()).join("");

let randomText = () => alternateCapitals(Math.random().toString(36).substring(2, 8));

let configureText = (ctx: { font: string; textBaseline: string; textAlign: string; fillText: (arg0: string, arg1: number, arg2: number) => void; }, width: number, height: number) => {

  ctx.font = relativeFont(width);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  let text = randomText();

  ctx.fillText(text, width / 2, height / 2);

  return text;
};

let generate = (width: number, height: number) => {
  let canvas = createCanvas(width, height);
  let ctx = canvas.getContext("2d");

  ctx.rotate(randomRotation());
  let text = configureText(ctx, width, height);

  return {
    image: canvas.toDataURL(),
    text: text
  };
};

export = generate;
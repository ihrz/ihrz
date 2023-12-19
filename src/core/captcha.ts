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

import Jimp from 'jimp';

let FONTBASE = 200;
let FONTSIZE = 35;

let relativeFont = (width: number) => {
  return Jimp.FONT_SANS_16_BLACK; // You can choose the desired Jimp font here
};

let arbitraryRandom = (min: number, max: number) => Math.random() * (max - min) + min;
let randomRotation = (degrees = 15) => arbitraryRandom(-degrees, degrees);

let alternateCapitals = (str: string) =>
  [...str].map((char, i) => char?.[`to${i % 2 ? "Upper" : "Lower"}Case`]()).join("");

let randomText = () => alternateCapitals(Math.random().toString(36).substring(2, 8));

let configureText = async (image: Jimp, width: number, height: number) => {
  const font = await Jimp.loadFont(relativeFont(width));

  let text = randomText();

  image.print(font, 0, 0, { text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, width, height);

  return text;
};

let generate = async (width: number, height: number) => {
  let image = await new Jimp(width, height);
  image.rotate(randomRotation());
  let text = await configureText(image, width, height);
  let img = await image.getBase64Async(Jimp.MIME_PNG) as string;

  return { image: img, text: text };
};

export = generate;
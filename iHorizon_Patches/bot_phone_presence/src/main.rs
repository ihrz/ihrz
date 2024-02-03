/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)
・ Contribution by Naya (https://github.com/belugafr)
・ Copyright © 2020-2024 iHorizon
*/

use std::fs;
use std::io::{self, Read, Write};
use std::path::Path;

use colored::Colorize;
use logger::Logger;
mod logger;

const LOGGER: logger::SimpleLogger = logger::SimpleLogger;

fn main() {
    LOGGER.legacy("[*] iHorizon Discord Bot (https://github.com/ihrz/ihrz)");
    LOGGER.legacy("[*] Warning: iHorizon Discord bot is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 2.0");
    LOGGER.legacy("[*] Please respect the terms of this license. Learn more at: https://creativecommons.org/licenses/by-nc-sa/2.0");

    if let Err(err) = run() {
        LOGGER.err(&*err.to_string())
    }

    LOGGER.log(Colorize::magenta("(_) /\\  /\\___  _ __(_)_______  _ __  "));
    LOGGER.log(Colorize::magenta(
        "| |/ /_/ / _ \\| '__| |_  / _ \\| '_ \\ ",
    ));
    LOGGER.log(Colorize::magenta("| / __  / (_) | |  | |/ / (_) | | | |"));
    LOGGER.log(Colorize::magenta(
        "|_\\/ /_/ \\___/|_|  |_/___\\___/|_| |_|",
    ));
    LOGGER.log(Colorize::magenta("Mainly dev by Kisakay ♀️"))
}

fn run() -> io::Result<()> {
    let file_path = Path::new("./../../node_modules/@discordjs/ws/dist/index.js");

    let mut file_content = String::new();
    let mut file = fs::File::open(&file_path)?;

    file.read_to_string(&mut file_content)?;

    let modified_content =
        file_content.replace("browser: DefaultDeviceProperty", "browser: 'Discord iOS'");

    let mut output_file = fs::File::create(&file_path)?;

    output_file.write_all(modified_content.as_bytes())?;

    LOGGER.log("The @discordjs/ws has been succefully patched. Now you can enjoy the bot phone presence!");

    Ok(())
}

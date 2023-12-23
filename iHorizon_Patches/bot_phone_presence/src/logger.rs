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
・ Copyright © 2020-2023 iHorizon
*/

use chrono::prelude::*;
use colored::{Colorize, ColoredString};

pub trait Logger {
    fn warn<S>(&self, message: S)
    where
        S: Into<ColoredString> + Colorize;

    fn err<S>(&self, message: S)
    where
        S: Into<ColoredString> + Colorize;

    fn log<S>(&self, message: S)
    where
        S: Into<ColoredString> + Colorize;

    fn legacy<S>(&self, message: S)
    where
        S: Into<ColoredString> + Colorize;
}

pub struct SimpleLogger;

impl Logger for SimpleLogger {
    fn warn<S>(&self, message: S)
    where
        S: Into<ColoredString> + Colorize,
    {
        println!(
            "[{} WRN]: {}",
            get_current_time().red(),
            message.into().to_string().white()
        );
    }

    fn err<S>(&self, message: S)
    where
        S: Into<ColoredString> + Colorize,
    {
        println!(
            "[{} ERR]: {}",
            get_current_time().red(),
            message.into().to_string().white()
        );
    }

    fn log<S>(&self, message: S)
    where
        S: Into<ColoredString> + Colorize,
    {
        println!(
            "[{} LOG]: {}",
            get_current_time().green(),
            message.into().to_string().white()
        );
    }

    fn legacy<S>(&self, message: S)
    where
        S: Into<ColoredString> + Colorize,
    {
        println!("{}", message.into().to_string().bright_black());
    }
}

fn get_current_time() -> String {
    Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

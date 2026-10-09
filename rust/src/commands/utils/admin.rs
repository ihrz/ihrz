use super::*;

pub mod admin_users;
pub mod allbots;
pub mod allwebhooks;
pub mod autorenew;
pub mod derogation;
pub mod dm;
pub mod embed_post;
pub mod leash;
pub mod nickkicker;
pub mod setmentionrole;
pub mod unban_all;
pub mod unban_undo;
pub mod unleash;
pub mod unzip_emojis;
pub mod vanity_generator;
pub mod wakeup;
pub mod zip_emojis;
pub mod zip_stickers;

pub use self::admin_users::admin_users;
pub use self::allbots::allbots;
pub use self::allwebhooks::allwebhooks;
pub use self::autorenew::autorenew;
pub use self::derogation::derogation;
pub use self::dm::dm;
pub use self::embed_post::embed_post;
pub use self::leash::leash;
pub use self::nickkicker::nickkicker;
pub use self::setmentionrole::setmentionrole;
pub use self::unban_all::unban_all;
pub use self::unban_undo::unban_undo;
pub use self::unleash::unleash;
pub use self::unzip_emojis::unzip_emojis;
pub use self::vanity_generator::vanity_generator;
pub use self::wakeup::wakeup;
pub use self::zip_emojis::zip_emojis;
pub use self::zip_stickers::zip_stickers;

#[allow(unused_imports)]
pub mod main {
    pub use super::admin_users::*;
    pub use super::allbots::*;
    pub use super::allwebhooks::*;
    pub use super::autorenew::*;
    pub use super::derogation::*;
    pub use super::dm::*;
    pub use super::embed_post::*;
    pub use super::leash::*;
    pub use super::nickkicker::*;
    pub use super::setmentionrole::*;
    pub use super::unban_all::*;
    pub use super::unban_undo::*;
    pub use super::unleash::*;
    pub use super::unzip_emojis::*;
    pub use super::vanity_generator::*;
    pub use super::wakeup::*;
    pub use super::zip_emojis::*;
    pub use super::zip_stickers::*;
    pub use super::*;
}

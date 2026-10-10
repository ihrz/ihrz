// Grouped-path compat shim (see parent mod.rs); no in-crate consumer by design.
#![allow(unused_imports)]
pub use super::dice::dice;
pub use super::hack::hack;
pub use super::heads_tails::coinflip;
pub use super::morse::morse;
pub use super::number::number;
pub use super::poll::poll;
pub use super::question::question;

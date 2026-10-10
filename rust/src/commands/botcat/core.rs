// Grouped-path compat shim (see parent mod.rs); no in-crate consumer by design.
#![allow(unused_imports)]
pub use super::botinfo::botinfo_full;
pub use super::help::help;
pub use super::invite::invite;
pub use super::link::links;
pub use super::ping::ping;
pub use super::say::say;
pub use super::setserverlang::setlang;

// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Hub: the panel lived in this file; it is now split one-leaf-per-file
// (pure move, zero logic change). The historical
// `welcomer_panel::main::X` paths keep working through these re-exports.
// The `pub(crate)` shims below are path-stability aliases: leaves import
// each other directly, so allow the resulting unused-import lints here.
#![allow(unused_imports)]

pub use super::banner::{
    banner_avatar_size, banner_config, banner_config_value, banner_frame, banner_prop,
    banner_text_size, is_valid_background_url, is_valid_hex_colour, validate_banner_message,
    BannerConfig, BannerPicker, BANNER_AVATAR_MULTS, BANNER_AVATAR_SIZES, BANNER_FRAMES,
    BANNER_MESSAGE_MAX_CHARS, BANNER_MESSAGE_MIN_CHARS, BANNER_PROPS, BANNER_TEXT_MULTS,
    BANNER_TEXT_SIZES, BANNER_URL_MAX_CHARS, DEFAULT_BANNER_AVATAR_SIZE, DEFAULT_BANNER_BACKGROUND,
    DEFAULT_BANNER_FRAME, DEFAULT_BANNER_TEXT_COLOUR, DEFAULT_BANNER_TEXT_SIZE,
};
pub(crate) use super::banner_edit::handle_banner_prop;
pub use super::command::welcomer_panel;
pub(crate) use super::command::{
    ephemeral, load_banner, post_panel_log, render_disabled, render_panel_message, rerender,
    save_banner, set_section, stored_section, welcomer_embed_exists,
};
pub use super::component::handle_welcomer_component;
pub use super::constants::{
    welcomer_panel_expired, BANNER_FRAME_PICK_ID, BANNER_PROP_ID, BANNER_SIZE_PICK_ID,
    PANEL_ACCENT, WELCOMER_COLLECTOR_TIMEOUT_SECS, WELCOMER_ENTRY_SECTION, WELCOMER_PREFIX,
    WELCOMER_SECTIONS, WELCOMER_SECTION_ID,
};
pub(crate) use super::constants::{BANNER_PICKER_FIELD, PANEL_SECTION_FIELD, PENDING_ROLES_FIELD};
pub(crate) use super::render::{button, t};
pub use super::render::{panel_blocks, panel_placeholder_v2, panel_rows, panel_v2, section_title};
pub use super::roles::DANGEROUS_PERM_KEYS;
pub(crate) use super::roles::{handle_roles_pick, save_roles};
pub(crate) use super::state::blob_str;
pub use super::state::{load_panel_state, welcomer_section, PanelState};

/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

// Reference language: its shape is the LanguageData type
// (types/languageData.d.ts). Every other language must match it.
const enUS = {
	// Basic language file for iHorizon Discord Bot
	// en-US: English

	// Variable
	var_member: "Members",
	var_user: "User",
	var_author: "Author",
	var_reason: "Reason",
	var_guild: "Guild",
	var_sanction: "Sanction",
	var_time: "Time",
	var_message: "Message",
	var_no_set: "Not Set",
	var_none: "None",
	var_roles: "Roles",
	var_names: "Names",
	var_text_channel: "Text Channel",
	var_voice_channel: "Voice Channel",
	var_creator: "Creator",
	var_doesnt_have_permissions:
		"You are not allowed to do this. You need the {permission} permission.",
	var_ihorizon: "iHorizon",
	var_developer: "Developer",
	var_chance: "Luck",
	var_other: "Other",
	var_unknown: "Unknown",
	var_secure: "Secure",
	var_unsecure: "Insecure",
	var_prefix: "Prefix",
	var_slash: "Slash",
	var_discord: "Discord",
	var_network: "Network",
	var_latency: "Latency",
	var_bot: "Bot",
	var_true: "True",
	var_false: "False",
	var_enabled: "Enabled",
	var_disabled: "Disabled",
	var_yes: "Yes",
	var_no: "No",
	var_colour: "Color",
	var_length: "Length",
	var_good: "Good",
	var_size: "Size",
	var_level: "Level",
	var_add: "Add",
	var_remove: "Remove",
	var_edit: "Edit",
	var_confirm: "Confirm",
	var_succes: "Success",
	var_page: "Page",
	var_previous: "Previous",
	var_next: "Next",
	var_permission: "Permission",
	var_usage: "Usage",
	var_aliases: "Aliases",
	var_dont_have_perm:
		"You aren't allowed to do this, you are missing the {perm} permission!",
	var_price: "Price",
	var_boost: "Boost",
	var_uses: "Uses",
	var_vc_stats: "Statistics",
	var_1d: "1 day",
	var_7d: "7 days",
	var_14d: "14 days",
	var_year: "year(s)",
	var_mo: "month(s)",
	var_w: "week(s)",
	var_d: "day(s)",
	var_h: "hour(s)",
	var_m: "minute(s)",
	var_s: "second(s)",
	var_ms: "millisecond(s)",
	var_banned_user: "Banned User(s)",
	var_no_one_banned: "No one is banned in this server.",
	var_category: "Category",
	var_total: "Total",
	var_online_members: "Online Member(s)",
	var_boost_level: "Boost Level",
	var_features: "Features",
	var_guild_icon: "Guild Icon",
	var_guild_banner: "Guild Banner",
	var_guild_splash: "Guild Splash",
	var_unknown_guild_name: "Unknown Guild Name",
	var_preview: "Preview",
	var_form: "Form",
	var_original_message: "Original Message",
	var_click_here: "Click here",
	var_s_message: "{nickname}'s message",
	var_source: "Music from: ",
	var_online_call: "In Voice",
	var_online: "Online",
	var_stream: "Streaming",
	var_boosts: "Boosts",
	var_muted: "Muted",
	var_camera: "Camera On",

	// Discord Permission Name
	perm_createinstantinvite_name: "Create Instant Invite",
	perm_kickmembers_name: "Kick Members",
	perm_banmembers_name: "Ban Members",
	perm_administrator_name: "Administrator",
	perm_managechannels_name: "Manage Channels",
	perm_manageguild_name: "Manage Server",
	perm_addreactions_name: "Add Reactions",
	perm_viewauditlog_name: "View Audit Log",
	perm_priorityspeaker_name: "Priority Speaker",
	perm_stream_name: "Stream",
	perm_viewchannel_name: "View Channel",
	perm_sendmessages_name: "Send Messages",
	perm_sendttsmessages_name: "Send TTS Messages",
	perm_managemessages_name: "Manage Messages",
	perm_embedlinks_name: "Embed Links",
	perm_attachfiles_name: "Attach Files",
	perm_readmessagehistory_name: "Read Message History",
	perm_mentioneveryone_name: "Mention Everyone",
	perm_useexternalemojis_name: "Use External Emojis",
	perm_viewguildinsights_name: "View Server Insights",
	perm_connect_name: "Connect",
	perm_speak_name: "Speak",
	perm_mutemembers_name: "Mute Members",
	perm_deafenmembers_name: "Deafen Members",
	perm_movemembers_name: "Move Members",
	perm_usevad_name: "Use Voice Activity",
	perm_changenickname_name: "Change Nickname",
	perm_managenicknames_name: "Manage Nicknames",
	perm_manageroles_name: "Manage Roles",
	perm_managewebhooks_name: "Manage Webhooks",
	perm_manageemojisandstickers_name: "Manage Emojis and Stickers",
	perm_manageguildexpressions_name: "Manage Server Expressions",
	perm_useapplicationcommands_name: "Use Application Commands",
	perm_requesttospeak_name: "Request to Speak",
	perm_manageevents_name: "Manage Events",
	perm_managethreads_name: "Manage Threads",
	perm_createpublicthreads_name: "Create Public Threads",
	perm_createprivatethreads_name: "Create Private Threads",
	perm_useexternalstickers_name: "Use External Stickers",
	perm_sendmessagesinthreads_name: "Send Messages in Threads",
	perm_useembeddedactivities_name: "Use Embedded Activities",
	perm_moderatemembers_name: "Moderate Members",
	perm_viewcreatormonetizationanalytics_name:
		"View Creator Monetization Analytics",
	perm_usesoundboard_name: "Use Soundboard",
	perm_createguildexpressions_name: "Create Server Expressions",
	perm_createevents_name: "Create Events",
	perm_useexternalsounds_name: "Use External Sounds",
	perm_sendvoicemessages_name: "Send Voice Messages",
	perm_sendpolls_name: "Send Polls",
	perm_useexternalapps_name: "Use External Apps",

	// Ticket commands
	// /add, /close, /delete, /sethereticket, /open, /remove, /transript, /disableticket
	ticket_disabled_command:
		"You cannot use this command because an administrator has disabled it",

	// /add
	add_disabled_command:
		"You cannot use this command because an administrator has disabled it",
	add_command_work: "Successfully added ${memberTag} to your ticket!",
	add_command_error: "An error occurred, please try again",

	// /close
	close_disabled_command:
		"You cannot use this command because an administrator has disabled it",
	close_title_sourcebin: "Ticket transcript by iHorizon",
	close_description_sourcebin: " ",
	close_error_command: "An error occurred, please try again!",
	close_command_work_channel:
		"You just closed your ticket. iHorizon sent you the transcript",
	close_command_work_notify_channel: "The ticket was successfully closed!",
	close_command_error: "An error occurred, please try again!",
	close_not_in_ticket:
		"You cannot use this command outside of a ticket channel!",

	// /delete
	delete_disabled_command:
		"You cannot use this command because an administrator disabled it",
	delete_not_in_ticket:
		"You cannot use this command outside of a ticket channel!",
	ticket_deleted:
		"The ticket ${ticketOwnerMention} has been deleted by <@${deletedByUserId}>. Here is the transcript:",

	// /sethereticket
	sethereticket_panel_select_embed_desc:
		"# Panel Name\n```${panelName}```\n{msg}\n\n## Category\n```{category}```\n",

	// /open
	open_disabled_command:
		"You cannot use this command because an administrator has disabled it",
	open_command_work: "Successfully reopened ${channel}.",
	open_command_error: "An error occurred, please try again!",
	open_not_in_ticket:
		"You cannot use this command outside of a ticket channel!",

	// /remove
	remove_disabled_command:
		"You cannot use this command because an administrator has disabled it",
	remove_not_in_ticket:
		"You cannot use this command outside of a ticket channel!",
	remove_command_error: "An error occurred, please try again",
	remove_command_work: "Successfully removed ${memberTag} from your ticket!",

	// /transript
	transript_disabled_command:
		"You cannot use this command because an administrator has disabled it!",
	transript_name_sourcebin: " ",
	transript_title_sourcebin: "Ticket transcript for ${channelName}",
	transript_command_error: "An error occurred, please try again!",
	transript_command_work:
		"You closed your ticket. iHorizon sent you a transcript of the content of your ticket.",
	transript_not_in_ticket:
		"You cannot use this command outside of a ticket channel!",

	// /disableticket
	disableticket_not_admin:
		":x: | You must be an administrator of this server to use this command!",
	disableticket_logs_embed_title_disable: "Disable Ticket Logs",
	disableticket_logs_embed_description_disable:
		"<@${authorId}> disabled ticket commands!",
	disableticket_command_work_disable:
		"You have successfully disabled the ticket commands!",
	disableticket_logs_embed_title_enable: "Enable Ticket Logs",
	disableticket_logs_embed_description_enable:
		"<@${authorId}> enabled ticket commands!",
	disableticket_command_work_enable:
		"You have successfully enabled the ticket commands!",

	// /setticketcategory
	setticketcategory_not_admin:
		":x: | You must be an administrator of this server to use this command!",
	setticketcategory_disabled_command:
		"You can't use this command because an administrator disabled the ticket commands!",
	setticketcategory_not_a_category:
		"The channel specified is not a category, please try again.",
	setticketcategory_command_work:
		"<@${authorId}>, you have set the category for the ticket channels to `${categoryName}`!",

	// /ticket log-channel
	ticket_logchannel_embed_title: "Ticket Logs Channel",
	ticket_logchannel_embed_desc:
		"${author}, you have set the Ticket module's log channel to ${channel}!",

	// /ticket panel
	ticket_panel_default_placeholder: "Select a category to open a ticket",
	ticket_panel_embed_title: "Ticket Panel #",
	ticket_panel_embed_desc: "Customize a ticket embed with specific options.",
	ticket_panel_saved_conf: "💾 Saved Configuration",
	ticket_panel_related_embed: "🕸️ Related embed",
	ticket_panel_role_to_ping: "📌 Role to ping",
	ticket_panel_ping_user: "📎 Ping user",
	ticket_panel_placeholder: "🏷️ Placeholder",
	ticket_panel_category: "📤 Category",
	ticket_panel_option_fields: "📔 Option Fields",
	ticket_panel_form: "📝 Form",
	ticket_panel_panel_placeholder: "Choose options",
	ticket_panel_panel_1_label: "Save current configuration",
	ticket_panel_panel_2_label: "Show preview",
	ticket_panel_panel_3_label: "Change related embed",
	ticket_panel_panel_4_label: "Add/remove a role to ping",
	ticket_panel_panel_5_label: "Change placeholder",
	ticket_panel_panel_6_label: "Change category",
	ticket_panel_panel_7_label: "Change pinged user",
	ticket_panel_panel_8_label: "Add/remove option fields",
	ticket_panel_panel_9_label: "Change form",
	ticket_panel_button_send: "Send embed",
	ticket_panel_change_category_channelSelect_placeholder: "Select a category",
	ticket_panel_select_channel_to_send:
		"Select a channel to send the embed to",
	ticket_panel_change_placeholder_modal_title: "Change Placeholder",
	ticket_panel_change_placeholder_modal_placeholder: "New Placeholder",
	ticket_panel_need_save_config:
		"You need to save the current configuration before sending the embed.",
	ticket_panel_need_1_option:
		"You need at least one option to send the embed.",
	ticket_panel_related_embed_dont_exist: "The related embed does not exist",
	ticket_panel_channel_error:
		"The channel does not exist or I do not have permission to send messages in it.",
	ticket_panel_embed_been_send: "The embed has been sent to the channel.",
	ticket_panel_successfully_saved:
		"The configuration has been successfully saved",
	ticket_panel_change_role_roleSelect_placeholder: "Select a role",
	ticket_panel_change_role_interaction_content:
		"Select the role that will be pinged when a ticket is opened.",
	ticket_panel_change_embed_modal_title: "Change Related Embed",
	ticket_panel_change_embed_modal_placeholder: "Embed ID",
	ticket_panel_change_embed_dont_exist: "The embed does not exist",
	ticket_panel_change_option_select_placeholder: "Select an option",
	ticket_panel_change_option_select_1_label: "Add a new option field",
	ticket_panel_change_option_select_2_label: "Remove an option field",
	ticket_panel_change_option_interaction_content:
		"Select an option to add or remove option fields",
	ticket_panel_add_option_max_10: "You can't add more than 10 option fields",
	ticket_panel_add_option_modal_title: "Add option field",
	ticket_panel_add_option_modal_field1_label: "Name",
	ticket_panel_add_option_modal_field2_label: "Description",
	ticket_panel_add_option_modal_field3_label: "Emoji",
	ticket_panel_remove_option_empty: "There are no option fields to remove",
	ticket_panel_remove_option_select_placeholder: "Choose an option to remove",
	ticket_panel_rempve_option_interaction_content:
		"Select an option to remove",
	ticket_panel_change_form_select_placeholder_1: "Add a form field",
	ticket_panel_change_form_select_placeholder_2: "Remove a form field",
	ticket_panel_change_form_interaction_content:
		"Select an option to add or remove form fields",
	ticket_panel_add_form_max_3: "You can't add more than 3 form fields",
	ticket_panel_add_form_modal_title: "Add a form field",
	ticket_panel_add_form_modal_field1_label: "Question Title",
	ticket_panel_add_form_modal_field2_label: "Question Placeholder",
	ticket_panel_preview_message: "Preview of the ticket panel",
	ticket_panel_option_change_category: "Select an option to change category",
	ticket_panel_panel_10_label: "Change category for one specific option",
	ticket_panel_channel_panel_embed_id: "Ticket Channel Embed ID",
	ticket_panel_panel_11_label: "Change ticket channel embed",
	ticket_panel_select_user: "Menu to add members to the ticket",
	ticket_panel_button_delete: "Button to delete the ticket",
	ticket_panel_button_transcript: "Button to create a transcript",
	ticket_panel_panel_12_label:
		"Show menu to add/remove members from a ticket",
	ticket_panel_panel_13_label: "Show button to delete a ticket",
	ticket_panel_panel_14_label: "Show transcript button",
	ticket_panel_tip_about_variable1:
		"${emoji_VC_OpenChat} **Did you know?** When you use `/utils embed` to generate an embed, you can include the **`{category}`** variable, which will be replaced by the category chosen by the user.",
	ticket_panel_no_question_to_delete: "No questions to delete.",
	ticket_panel_chose_a_question: "Choose a question",
	ticket_panel_select_question_to_delete: "Select a question to delete.",
	ticket_panel_panel_15_label: "Configure an embed per option",
	ticket_panel_panel_16_label: "Configure a form per option",
	ticket_panel_panel_17_label: "Configure roles to ping per option",
	ticket_panel_mode: "⚙️ Mode",
	ticket_panel_mode_simple: "Simple",
	ticket_panel_mode_advanced: "Advanced",
	ticket_panel_mode_simple_desc:
		"One button opens a ticket, no choice or question.",
	ticket_panel_mode_advanced_desc:
		"A menu with options, per-option settings and forms.",
	ticket_panel_panel_18_label: "Switch mode (simple / advanced)",
	ticket_panel_simple_default_title: "Support",
	ticket_panel_simple_default_desc:
		"Need help? Click the button below to open a ticket.",
	ticket_panel_manage_form_title:
		"Manage the form for option: **${optionName}**",
	ticket_panel_change_embed_options:
		"Select an option to edit the channel panel embed ID.",
	ticket_panel_change_embed_options_null:
		"There are no options to edit the channel panel embed ID.",
	ticket_panel_change_embed_options_chose:
		"Choose the category to edit the channel panel ID.",
	ticket_panel_add_a_question: "Add a question",
	ticket_panel_remove_a_question: "Remove a question",
	ticket_panel_option_invalid: "❌ Invalid option.",
	ticket_panel_chose_option_to_form:
		"Select an option to configure its form.",
	var_chose_option: "Choose an option",
	ticket_panel_saved_and_sended_panel:
		"The ticket panel #${panelCode} has been successfully sent to ${channel}. Please keep the code somewhere in case you need to modify the panel.",
	var_title: "Title",
	var_action: "Action",

	// /ticket rename
	ticket_rename_ok: "Ticket channel has been renamed!",
	ticket_rename_error: "Error when renaming the text channel",

	// /ticket unlink
	ticket_unlink_command_ok:
		"${emoji_Yes} | **The channel is now unlinked from the ticket module.**",
	ticket_unlink_panel_edited_content:
		"This channel was an old ticket. The user {user} has unlinked this channel.",

	// /ticket remind
	ticket_remind_embed_title: "Uh-oh! Ticket Reminder",
	ticket_remind_embed_desc:
		"You haven't been very active, that's okay, but your ticket is still being processed! Come and reply to it!",
	ticket_remind_embed_fields_1_name: "Last reply",
	ticket_remind_command_ok: "I have sent a reminder message to the user.",
	var_never: "Never",

	// Ranks commands
	// /level, /setxpchannels, /disablexp

	// /disablexp
	disablexp_not_admin:
		":x: | You must be an administrator of this server to use this command!",
	disablexp_logs_embed_title_disable: "Disable XP Logs",
	disablexp_logs_embed_description_disable: "<@${authorId}> disabled XP!",
	disablexp_command_work_disable: "You have successfully disabled XP.",
	disablexp_logs_embed_title_enable: "Enable XP Logs",
	disablexp_logs_embed_description_enable: "<@${authorId}> enabled XP!",
	disablexp_command_work_enable: "You have successfully enabled XP.",
	disablexp_command_work_disable_entierly:
		"You have successfully disabled the ranks module! (No more messages, and users will not earn levels)",

	// /setxpchannels
	setxpchannels_not_admin:
		":x: | You must be an administrator of this server to use this command!",
	setxpchannels_logs_embed_title_disable: "SetXpChannels Logs",
	setxpchannels_logs_embed_description_disable:
		"<@${authorId}> disabled the custom XP channels and reset settings to default.",
	setxpchannels_already_disabled_disable:
		"The custom XP channels are already disabled!",
	setxpchannels_command_work_disable:
		"You have successfully disabled the custom XP channel!",
	setxpchannels_command_error_disable:
		"Error: missing permissions or channel doesn't exist",
	setxpchannels_logs_embed_title_enable: "SetXpChannels Logs",
	setxpchannels_logs_embed_description_enable:
		"<@${authorId}> set the custom XP channels to: <#${argsid}>",
	setxpchannels_valid_channel_message:
		"You must specify a valid channel for your configuration.",
	setxpchannels_already_with_this_config:
		"The custom XP channels are already configured with this channel ID!",
	setxpchannels_confirmation_message: "**Custom XP channel set here!**",
	setxpchannels_command_work_enable:
		"You have successfully set the custom XP channel to <#${argsid}>",
	setxpchannels_command_error_enable:
		"Error: missing permissions or channel doesn't exist",

	// /level
	level_embed_title: "__**XP Level**__: `${userUsername}`",
	level_embed_fields1_name: ":arrow_up:・__Levels:__",
	level_embed_fields1_value: "`${currentxp}/${xpNeeded}`",
	level_embed_fields2_name: ":money_with_wings:・__Experience:__",
	level_embed_fields2_value: "`${level}`",
	level_embed_description:
		"`${expNeededForLevelUp}` **experience points needed for the next level!**",
	level_xp_needed_for_new_level: "XP until next level:",
	level_xp_total: "Total XP:",

	// /ranks leaderboard
	ranks_leaderboard_top_txt: "Top #${i}",
	ranks_leaderboard_top_txt_raw: "Top #${i} ${rawText}\n",
	ranks_leaderboard_txt_text:
		"👤 ${user} `(${userGlobalName})`\n⭐ ➥ **Level**: `${level}`\n🔱 ➥ **XP Total**: `${xpTotal}`",
	ranks_leaderboard_embed_title: "🏆 Server Leaderboard of Legends",
	ranks_leaderboard_embed_footer:
		"Page ${cPage} of ${totalPages} • Ranked by Total XP",

	// /ranks ignore-channels
	ranks_ignorechannels_embed_title: "Ranks Module Configurations",
	ranks_ignorechannels_embed_desc:
		"When new messages are sent in one of these channels, the Ranks Module ignores them.",

	// /ranks set-message
	ranksSetMessage_not_admin:
		":x: | You must be an administrator of this server to use this command!",
	ranksSetMessage_help_embed_title: "/ranks set-message Help!",
	ranksSetMessage_help_embed_description: "/ranks set-message",
	ranksSetMessage_help_embed_fields_name: "How to use?",
	ranksSetMessage_logs_embed_title_on_enable: "RanksSetMessage Logs",
	ranksSetMessage_logs_embed_description_on_enable:
		"<@${authorId}> set the ranks message!",
	ranksSetMessage_command_work_on_enable:
		"${emoji_GreenTick} | Successfully set ranks message.",
	ranksSetMessage_logs_embed_title_on_disable: "RanksSetMessage Logs",
	ranksSetMessage_logs_embed_description_on_disable:
		"<@${authorId}> deleted the ranks message!",
	ranksSetMessage_command_work_on_disable:
		"${emoji_Yes} | Successfully deleted custom ranks message.",
	ranksSetMessage_command_work_ls: "The ranks message is:",
	ranksSetMessage_help_embed_fields_custom_name: "Custom Message",
	ranksSetMessage_help_embed_fields_custom_name_empy: "Not Set!",
	ranksSetMessage_help_embed_fields_default_name_empy: "Default Message",
	ranksSetMessage_help_embed_desc:
		"{memberUsername} => The member's username\n{memberMention} => Mention the member\n{memberCount} => Number of guild members\n{guildName} => The name of the guild\n{createdAt} => Account creation date in dd/mm/yyyy\n{xpLevel} => The user's XP level\n{accountCreationTimestamp} => Account creation timestamp",
	ranksSetMessage_button_set_name: "Set message",
	ranksSetMessage_buttom_del_name: "Default Message",
	ranksSetMessage_awaiting_response: "Write the new custom ranks message.",
	ranksSetMessage_embed_fields_xpmessage: "Ranks Message",

	// /ranks ranks-ureset
	reset_uranks_are_you_sure:
		"**Are you really sure you want to delete all rank data?\nThis action is permanent and you cannot undo it.**\n**This action is destructive!!**",
	reset_uranks_logs_embed_title: "Rank Module Logs (DANGEROUS ACTION)",
	reset_uranks_logs_embed_desc:
		"${author} has deleted all rank module data for ${user}!",

	// /ranks config
	ranks_config_embed_title: "🏆 Rank Roles Configuration",
	ranks_config_embed_desc: "Customize your server's XP-based role rewards!",
	ranks_config_autofields_name: "🌟 Level ${level}",
	ranks_config_autofields_value:
		"Role: <@&${roleId}>\n🔓 Unlocked at level ${level}",
	ranks_config_nofields_name: "🚫 No Roles Configured",
	ranks_config_nofields_value: "Set up rank roles to reward active members!",
	ranks_config_help_footer:
		"Page ${currentPage} of ${totalPage} • Total Ranks: ${totalRanks}",
	ranks_config_btn_add_name: "Add Role",
	ranks_config_btn_remove_name: "Remove Role",
	ranks_config_add_max_roles:
		"You've reached the maximum number of rank roles (25).",
	ranks_config_add_role_menu_placeholder: "Select a role",
	ranks_config_awaiting1_response:
		"Select the role you want to assign to a specific level.",
	ranks_config_add_modal_title: "Set Level for Role",
	ranks_config_add_modal_fields1_placeholder: "Level Requirement",
	ranks_config_add_invalid_level:
		"Invalid level! Please enter a positive number.",
	ranks_config_add_invalid_role:
		"The role {role} already exists. The role can only be assigned to one level.",
	ranks_config_add_command_work:
		"Role ${selectedRole} added for level ${level}!",
	ranks_config_add_command_warn:
		"# WARN ⚠️ Warning: The role ${selectedRole} has the following sensitive permissions:\n\n${_}",
	ranks_config_remove_no_rank:
		"There are no rank roles configured to remove.",
	ranks_config_var_level: "Level {level}",
	ranks_config_remove_string_menu_desc: "Remove role at level ${level}",
	ranks_config_remove_string_menu1_placeholder: "Select a role to remove",
	ranks_config_remove_awaiting_response:
		"Select the role you want to remove.",
	ranks_config_remove_command_work:
		"Role for level ${levelToRemove} has been removed!",

	// Owner commands
	// /owner, /unowner, /blacklist, /unblacklist

	// /owner
	owner_not_owner:
		"You are not an owner of the iHorizon Project. You can't use this command.",
	owner_already_owner: "This user is already an owner!",
	owner_is_now_owner:
		"${memberUsername} is now an owner of the iHorizon Project!",

	// /unowner
	unowner_not_owner:
		"You are not an owner of the iHorizon Project. You can't use this command.",
	unowner_cant_unowner_creator:
		"It is not possible to remove this user; they are the creator of the iHorizon Project.",
	unowner_command_work: "${memberUsername} is no longer an owner",

	// /blacklist
	blacklist_not_owner:
		"You are not an owner of the iHorizon Project. You can't use this command.",
	blacklist_bot_lol: "Can't blacklist myself x)",
	blacklist_command_work: "${memberUsername} is now blacklisted",
	blacklist_blacklisted_but_can_ban_him:
		"${emoji_No} is now blacklisted. I can't ban this member here, missing permission?",
	blacklist_already_blacklisted: "${memberUsername} is already blacklisted!",
	blacklist_no_one_blacklist: "${emoji_No} No blacklisted users found!",
	blacklist_var_no_reason: "No reason found",
	blacklist_embed_title: "Blacklist - Page ${page}",
	blacklist_command_work_shard:
		"✅ ${username} banned on **${totalSuccess}** server(s) across all shards (`{score}`)",

	// /unblacklist
	unblacklist_not_owner:
		"You are not an owner of the iHorizon Project. You can't use this command.",
	unblacklist_command_work: "<@${memberId}> is no longer blacklisted",
	unblacklist_not_blacklisted: "<@${memberId}> was not blacklisted",
	unblacklist_unblacklisted_but_can_unban_him:
		"${emoji_No} has been removed from the blacklist, but I can't unban this member here; missing permission or already unbanned?",
	unblacklist_user_is_not_exist: "I couldn't find the user.",
	unblacklist_command_work_across_all_shard:
		"✅ ${bannedMemberUsername} is now unbanned on **${totalSuccess}** server(s) across all shards (`${score}`)",

	// Invite Manager commands
	// /addinvites, /invites, /leaderboard, /removeinvites

	// /addinvites
	addinvites_confirmation_embed_description:
		"Added ${amount} invites for ${user}",
	addinvites_logs_embed_title: "Invite Manager Logs",
	addinvites_logs_embed_description:
		"<@${authorId}> added ${amount} invites to <@${userId}>!",

	// /invites

	// /leaderboard

	// /removeinvites
	removeinvites_not_admin_embed_description:
		"You need to be an admin to use this command!",
	removeinvites_confirmation_embed_description:
		"Removed ${amount} invites for ${user}",
	removeinvites_logs_embed_title: "Invite Manager Logs",
	removeinvites_logs_embed_description:
		"<@${authorId}> removed ${amount} invites from <@${userId}>!",

	// /invites reset-all
	resetallinvites_warning_msg:
		"**Are you really sure you want to delete all of the Invite Manager's data?\nThis action is permanent and you can't roll it back.**\n**This action is destructive!!**",
	resetallinvites_yes_button: "Delete all",
	resetallinvites_no_button: "Undo action",
	resetallinvites_succes_on_delete: "Successfully deleted!",
	resetallinvites_logs_embed_title: "Invite Manager Logs (DANGEROUS ACTION)",
	resetallinvites_logs_embed_desc:
		"${author} has deleted all data of the Invites Manager!",

	// Bot commands
	// /botinfo, /invite, /kisakay, /ping, /status

	// /links
	links_message: "Click the links below to learn more about me!",
	links_website: "My Website",
	links_gitlab: "My GitLab",

	// /botinfo
	botinfo_embed_fields_myname: "My Name:",
	botinfo_embed_fields_mychannels: "My Channels:",
	botinfo_embed_fields_myservers: "My Servers:",
	botinfo_embed_fields_members: "Members:",
	botinfo_embed_fields_libraires: "Libraries:",
	botinfo_embed_fields_created_at: "Created at:",
	botinfo_embed_fields_created_by: "Created by:",

	// /invite
	invite_embed_title: "Thank you for adding iHorizon!",
	invite_embed_description: "I love you; show your love back by inviting me!",

	// /kisakay
	kisakay_message:
		"${emoji_Sparkles} Kisakay is both my creator and my developer. It is because of her and her keyboard that I came into existence. I am deeply grateful to her!✨ ❤️❤️",

	// /andru
	andru_message:
		'Andru is a collaborator and developer. "The jack of all trades," he manages the marketing, the community...',

	// /ether
	ether_message:
		"${emoji_Sparkles} Ether was a contributor and team member of the iHorizon project. He created the iHorizon documentation and the iHorizon Installation Script, and he managed the bot's translations to make them (almost) perfect! He left on <t:1785567600:f>.",

	// /Irisweb
	irisweb_message:
		"😼 IrisWeb is my second developer/contributor, IrisWeb x Kisakay ❤️",

	// /ping
	pong_message: "【:ballot_box_with_check:】__**Pong**__ : ",

	// /status
	status_be_bot_dev: ":x: | **You have to be the bot developer to do this!**",

	// /help
	help_tip_embed:
		"```${botName} ・ Help Menu```\n${emoji_Pin} ・ **${categorieCount}** available Command Categories\n${emoji_Slash_Bot_Badge} ・ **${slashCount}** available Slash Commands\n${emoji_Crown} ・ **Created by** <@${owner1}>, <@${owner2}>\n\n```Do you know ? ・ Tips```\n${emoji_VC_Region} ・ ${botName} is **100% multilingual**\n${emoji_Slash_Bot_Badge} ・ `/setlang language:Japanese`",
	help_mod_fields: "Moderation",
	help_ranks_fields: "Ranks",
	help_fun_fields: "Fun",
	help_utils_fields: "Utils",
	help_giveaway_fields: "Giveaway",
	help_bot_fields: "Bot",
	help_music_fields: "Music",
	help_backup_fields: "Backup",
	help_guildconf_fields: "Guild Config",
	help_prof_fields: "Profile Personalization",
	help_economy_fields: "Economy",
	help_owner_fields: "Owner",
	help_roler_fields: "Role Reaction",
	help_invitem_fields: "Invite Manager",
	help_ticket_fields: "Ticket",
	help_memberc_fields: "Member Count",
	help_newftrs_fields: "New feature",
	help_mod_dsc:
		"> *Moderate your Discord server without stress with iHorizon's commands.*",
	help_ranks_dsc:
		"> *Have fun tracking your experience level to see who's the most active on the server!*",
	help_fun_dsc:
		"> *Find Discord boring? Alright, this category is made for you! iHorizon will bring a smile back to your face!*",
	help_utils_dsc:
		"> *Need specific commands that are useful in certain cases? Alright! Here they are!*",
	help_giveaway_dsc:
		"> *Feeling generous? Want to give something to your community? Here are my commands to help you out!*",
	help_bot_dsc:
		"> *Are you curious and want to know more about me? These commands are here for that!*",
	help_music_dsc: "> *Are you into music? Here's a gift for you :)*",
	help_backup_dsc: "> *Need a quick backup of your server? Here I am!*",
	help_guildconf_dsc:
		"> *Looking for an advanced and easy-to-set-up configuration? Here I am :3*",
	help_prof_dsc:
		"> *Do you take care of your appearance? Here are some commands to ensure you have a magnificent profile among users :)*",
	help_economy_dsc:
		"> *Are you mindful of your wallet? Or simply want to make purchases? I'm here :)*",
	help_owner_dsc:
		"> *This category is reserved for owners and administrators of the iHorizon project!*",
	help_roler_dsc:
		"> *Want to set up a reaction role for your server? Here I am!*",
	help_invitem_dsc: "> *Want to check a member's invites? It's here!*",
	help_ticket_dsc:
		"> *Would you like to create a ticket or use one of my functions within it? Of course!*",
	help_memberc_dsc:
		"> *Want to set up voice channels for member count? Of course :smile:*",
	help_newftrs_dsc: "> *Here are some new and highly interesting features!*",
	help_not_for_you: "This interaction is not for you",
	help_protection_fields: "Protection",
	help_protection_dsc:
		"> *Prevent non-whitelisted users from doing certain actions in order to protect the server.*",
	help_suggestion_fields: "Suggestion",
	help_suggestion_dsc:
		"> *Grant your users the ability to express themselves, empower them to submit suggestions in a dedicated channel!*",
	help_security_fields: "Security",
	help_security_dsc:
		"> *Administer captcha tests to your new members to secure access to your server.*",
	help_schedule_fields: "Schedule",
	help_schedule_dsc:
		"> *Create reminders with pre-programmed messages that the bot will send to you in a private message*",
	help_pfps_fields: "PFPS",
	help_pfps_dsc: "> *Send a random user avatar in a channel!*",
	help_voicedashboard_fields: "VoiceDashboard",
	help_voicedashboard_dsc:
		"> *Create a custom temporary voice channel with interface!*",
	help_select_menu: "Make a selection!",
	help_select_menu_fields_desc: "${commandCount} Commands",
	help_back_to_menu: "Main menu",
	help_back_to_menu_desc: "Go back to initial menu",
	help_confession_dsc:
		"> *Do you have a confession to make? Very well, no matter how sordid it is, iHorizon is here for you!*",
	help_confession_fields: "Confession",
	help_antispam_dsc:
		"> *Bored of spamming? Nice! iHorizon is here, to moderate some spamming!*",
	help_antispam_fields: "AntiSpam",
	help_stats_fields: "User Stats",
	help_stats_dsc:
		"> *See a user's message count and voice activity in a guild*",
	help_notifier_dsc:
		"> *Be notified when a YouTuber or streamer publishes a video!*",
	help_notifier_fields: "Notifier",
	help_authrestore_fields: "AuthRestore",
	help_authrestore_dsc:
		"> *Verify your server members with OAuth2. If your server gets raided or terminated, you can recover your old members!*",
	help_tags_fields: "Custom Tags",
	help_tags_dsc:
		"> *Create tag messages for your server, and use them in your server!*",
	help_starboard_dsc:
		"> *See the most starred messages in a Discord server.*",
	help_starboard_fields: "StarBoard",
	help_blogger_dsc:
		"> *Follow your favorite RSS feeds and be notified when new articles are released through iHorizon.*",
	help_blogger_fields: "Blogger",
	help_lastfm_dsc:
		"> *Connect your Last.fm account and automatically scrobble the tracks played by iHorizon while you stay in the voice channel.*",
	help_lastfm_fields: "LastFM Scrobbler",
	help_honeypot_fields: "Honeypot",
	help_honeypot_dsc:
		"> *Set up a trap channel to catch compromised accounts and automatically clean up recent spam across your server.*",

	// /h
	h_suite: "(Continued)",
	h_suite_desc: "*Continued commands of the category*",
	helpall_no_perms_defined:
		"No custom permissions are defined on this server, so `helpall` is useless here — use `${botPrefix}h` instead.",
	helpall_no_access:
		"You don't have access to any permission-gated command on this server.",

	// /say
	say_footer_msg: "\n\nSent from `/say` by ${author}",

	// /ping
	ping_down_msg: "**DOWN**",
	ping_embed_desc:
		"# Pong! ${botName}'s Network Stats:\n\n**[Discord Website Ping]** >> `${_net03}` ms.\n**[Cloudflare Ping]** >> `${_net02}` ms.\n**[Google Ping]** >> `${_net01}` ms.\n\n${emoji_Crown} **[iHorizon Website Ping]** >> `${_net04}` ms.\n${emoji_Crown} **[Websocket Ping]** `${ping}` ms.\n\n## ${emoji_Pointer} **[Average]** >> (avg)`${averagePing}` ms.",

	// /custom
	custom_avatar_reset:
		"You have decided to reset the bot's profile picture on the server. Embed footers will return to their default state, as well as the bot's profile picture on the server.",
	custom_avatar_set:
		"${emoji_Yes} **You have decided to change the bot's profile picture on the server. Embed footers are now modified, as well as the bot's profile picture on the server.**\n${emoji_Crown} New value: `${x}`",
	custom_name_reset:
		"You have decided to reset the bot's name on the server. Embed footers will return to their default state, as well as the bot's name on the server.",
	custom_name_set:
		"${emoji_Yes} **You have decided to change the bot's name on the server. Embed footers are now modified, as well as the bot's name on the server.**\n${emoji_Crown} New value: `${name}`",
	custom_desc_reset:
		"You have decided to reset the bot's description on the server. Embed footers will return to their default state, as well as the bot's description on the server.",
	custom_desc_set:
		"${emoji_Yes} **You have decided to change the bot's description on the server. Embed footers are now modified, as well as the bot's description on the server.**\n${emoji_Crown} New value: `${desc}`",
	custom_banner_reset:
		"You have decided to reset the bot's banner on the server.",
	custom_banner_set:
		"${emoji_Yes} **You have decided to change the bot's banner on the server.**\n${emoji_Crown} New value: `${x}`",
	custom_sdk_only:
		"This command is only available on production for servers with the `Custom iHorizon Profile` subscription.",
	custom_sdk_only_title: "Support iHorizon with Custom iHorizon Profile",
	custom_sdk_only_description:
		"Our bot has been free and open source since 2022. We need revenue to keep running, developing, and hosting the bot. Our operating costs are around 500 EUR per year for servers, boosts, domains, and licenses.\n\nThe `/custom` command lets you change iHorizon’s identity on your server by editing the avatar, name, banner, and bio. By using it, iHorizon’s visual identity disappears from your server.\n\nWe therefore added a Discord-integrated subscription priced at 2.99 USD per month.\n\nBy purchasing this subscription, you will be able to use this command. Think of it as a custom bot, an OWN-IHRZ-like setup, but stable, clean, and fully functional.",

	// Fun commands
	// /caracteres, /cats, /hack, /hug, /kiss, /morse, /poll, /question, /slap

	// Fun Var
	fun_var_down_api: "Error: Seems like the API is down!",
	fun_var_good_sentence: "Please, send a good sentence!",

	// /cats

	// /duck

	// /panda

	// /fox

	// /dolphin

	// /frog

	// /squirrel

	// /hack
	hack_embed_description: "<@${victimId}> hacked by <@${authorId}>!",

	// /hug

	// /kiss

	// /poll
	poll_not_admin: "You don't have the permissions to do this!",

	// /question
	question_not_full: "Enter a full question with 3 or more words!",
	question_s: [
		"Yes.",
		"No.",
		"I don't know.",
		"I am not sure!",
		"You're crazy!",
		"No thanks.",
		"No.",
		"Yes."
	],
	question_fields_input_embed: ":question:__**Question**__",
	question_fields_output_embed: ":grey_exclamation:__**Answer:**__",
	question_embed_title: "__**Question**__: `${authorUsername}`",

	// /slap

	// /dogs
	dogs_embed_command_error: "Error retrieving dog image.",

	// /love
	love_embed_description:
		"**${user1Username}** + **${user2Username}** = __${randomNumber}%__ of love 💗",
	love_command_error: "An error occurred while trying to create the image",

	// /fun disable
	fun_disable_command_msg:
		"${author}, you have ${action_type} the fun category!",
	fun_category_disable:
		"You cannot use this command as the fun commands category is disabled in this server.",

	// /fun gay

	// /fun stench

	// /fun rate

	// /fun caracteres
	fun_caracteres_command_ok: "Please provide a text to transform!",
	fun_caracteres_embed_desc:
		"Original text: **${inputText}**\n\nChoose a style from the dropdown below to transform your text.",
	fun_caracteres_select_menu_placeholder: "Choose a font style...",

	// /fun random dice

	// /fun random heads-tails
	fun_coinflip_result_heads: "Heads",
	fun_coinflip_result_tails: "Tails",

	// /fun random number

	// +transgender

	// Economy commands
	// /addmoney, /balance, /daily, /monthly, /pay, /removemoney, /rob, /weekly, /work

	economy_cooldown_error:
		"Wait **${time}** before you can execute this command again!",

	// /addmoney
	addmoney_not_admin:
		"You cannot run this command because you do not have the necessary permissions `ADMINISTRATOR`",
	addmoney_logs_embed_title: "Economy Logs",
	addmoney_logs_embed_description:
		"<@${authorId}> added ${amountValue} coin to <@${userId}>!",
	addmoney_command_work:
		"Successfully added `${amountValue}$` to <@${userId}>",

	// /balance
	balance_dont_have_wallet: "👛 You don't have a wallet...",
	balance_he_dont_have_wallet:
		"${emoji_Wallet} ${user} doesn't have a wallet...",
	balance_have_wallet: "👛 You have ${bal} coin(s)!",
	balance_he_have_wallet: "${emoji_Wallet} ${user} has ${bal} coin(s)!",
	balance_embed_fields1_name: "Bank",
	balance_embed_fields2_name: "In Balance",

	// /daily
	daily_cooldown_error:
		"Sorry, you must wait **${time}** before running this command!",
	daily_embed_title: "Daily",
	daily_embed_description: "**Daily Reward**",
	daily_embed_fields: "Collected",

	// /monthly
	monthly_cooldown_error:
		"Sorry, you must wait **${time}** before running this command!",
	monthly_embed_title: "Monthly",
	monthly_embed_description: "**Monthly Reward**",
	monthly_embed_fields: "Collected",

	// /pay
	pay_negative_number_error: "Negative money cannot be paid.",
	pay_dont_have_enought_to_give:
		"That's more money than you've got in your balance. Try again.",
	pay_command_work:
		"${authorUsername}, you successfully paid ${userUsername} `${amount}$`.",

	// /removemoney
	removemoney_not_admin:
		"You cannot run this command because you do not have the necessary permissions `ADMINISTRATOR`",
	removemoney_embed_title: "Removed Money!",
	removemoney_embed_fields: "Amount",
	removemoney_embed_second_fields: "Balance Updated",
	removemoney_logs_embed_description:
		"<@${authorId}> removed ${amount} coin from <@${userId}>!",
	removemoney_logs_embed_title: "Economy Logs",

	// /rob
	rob_cooldown_error: "**Wait 50 minutes before robbing a user again!**",
	rob_dont_enought_error: ":x: You need at least 250$ to rob somebody.",
	rob_him_dont_enought_error:
		":x: ${userUsername} does not have enough to rob.",
	rob_embed_description:
		"<@${authorId}> you robbed <@${userId}> and got away with ${random}!",

	// /weekly
	weekly_cooldown_error:
		"Sorry, you must wait **${time}** before running this command!",
	weekly_embed_title: "Weekly",
	weekly_embed_description: "**Weekly Reward**",
	weekly_embed_fields: "Collected",

	// /work
	work_cooldown_error:
		"<@${authorId}>, **Wait ${time} minutes before working again!**",
	work_embed_author: "${authorUsername}, it paid off!",
	work_embed_description:
		"${authorUsername}, you've worked and earned ${amount}$!",

	// /withdraw
	withdraw_cannot_abuse:
		"${emoji_No} | You cannot withdraw a larger amount of coins than you have in your bank!",
	withdraw_embed_title: "Withdraw from your bank",
	withdraw_embed_desc:
		"${author}, you withdrew ${toWithdraw}${emoji_Coin} from your `bank`",
	withdraw_embed_fields1_name: "Bank",

	// /deposit
	deposit_cannot_abuse:
		"${emoji_No} | You cannot deposit a larger amount of coins than you have in your wallet!",
	deposit_embed_title: "Deposit into your bank",
	deposit_embed_desc:
		"${author}, you have deposited ${toDeposit}${emoji_Coin} in your `bank`",
	deposit_embed_fields1_name: "Bank",

	// /leaderboard
	economy_leaderboard_embed_title: "Economy leaderboard of `${guildName}`",
	economy_leaderboard_embed_fields_value:
		"<@${userId}> - Bank: `${bank}`${emoji_Coin} | Balance: `${money}`${emoji_Coin}",

	// /economy (money and cooldown commands)
	economy_action_in_progress:
		"${emoji_No} | Your previous economy command is still running, try again in a moment.",

	// /economy disable
	economy_disable_not_admin:
		":x: | You must be an administrator of this server to use this command!",
	economy_disable_already_disable:
		"<@${authorId}>, the Economy Module is already **disabled**!",
	economy_disable_already_enable:
		"<@${authorId}>, the Economy Module is already **enabled**!",
	economy_disable_set_enable:
		"<@${authorId}>, you have successfully **enabled** the Economy Module!",
	economy_disable_set_disable:
		"<@${authorId}>, you have successfully **disabled** the Economy Module!",
	economy_disable_logs_embed_desc:
		"<@${authorId}> has put the Economy Module to `${state}`!",
	economy_disable_logs_embed_title: "Economy Logs",

	// /economy boost-set
	economy_boost_role_not_found:
		"Role not found. You must set a price for the role.",
	economy_boost_embed_title: "Economy System - Buyable Roles",
	economy_boost_embed_desc: "All buyable roles are listed below.",

	// /economy role add
	economy_role_add_no_role: "There are no buyable roles to delete.",
	economy_role_add_max_20_roles: "You can only have up to 20 buyable roles.",
	economy_role_add_canceled: "The role was not added to the buyable roles.",
	economy_role_add_prompt_dangerous:
		"Are you sure you want to add this role to the buyable roles?\n**Warning:** This role has dangerous permissions.\nPermissions: ${stringDangerousPermissions}",

	// /economy shop
	economy_shop_embed_title: "🛍️ `${guildName}`'s Shop",
	economy_shop_embed_desc:
		"The shop permits you to buy items/roles using your money. You can view the roles available for purchase below.",
	economy_shop_not_available:
		"The role you selected is not available for purchase.",
	economy_shop_already_own_role: "You already own this role.",
	economy_shop_not_enough_money:
		"You do not have enough money to purchase this role.",
	economy_shop_role_add_failed:
		"I could not give you this role, so you were not charged. Ask an admin to check that it still exists and is below my highest role.",
	economy_shop_role_purchased:
		"You have successfully purchased the role **{roleName}** for **${rolePrice}** 💰.",
	economy_shop_unknown_role: "Unknown Role",
	economy_shop_not_set:
		"There are no roles available for purchase in this server. Please contact the server administrator for more information.",
	economy_shop_already_owned: "Already owned",
	economy_shop_menu_placeholder: "Select a role to purchase",

	// /economy manage-rewards set-cooldown
	economy_manage_rewards_cooldown_invalid_time:
		"Invalid time format. Please use a valid time format.",
	economy_manage_rewards_cooldown_command_ok:
		"Successfully set the cooldown for ${type} to ${stime}",

	// /economy mange-rewards set-money
	economy_manage_rewards_set_money:
		"Successfully set the money for ${type} to ${money}",

	// /economy role list
	economy_role_list_no_buyable_roles: "There are no buyable roles to list.",
	economy_role_list_embed_title: "Economy System - Buyable Roles",
	economy_role_list_embed_desc: "All buyable roles are listed below.",

	// /economy economy-ureset
	reset_ueconomy_are_you_sure:
		"**Are you really sure you want to delete all economy data?\nThis action is permanent and you cannot undo it.**\n**This action is destructive!!**",
	reset_ueconomy_logs_embed_title: "Economy Module Logs (DANGEROUS ACTION)",
	reset_ueconomy_logs_embed_desc:
		"${author} has deleted all economy module data for ${user}!",

	// /economy economy-greset
	reset_geconomy_are_you_sure:
		"**Are you really sure you want to delete all economy data FOR ALL SERVER MEMBERS?\nThis action is permanent and you cannot undo it.**\n**This action is destructive!!**",
	reset_geconomy_logs_embed_title:
		"Economy Module Logs (VERY DANGEROUS ACTION)",
	reset_geconomy_logs_embed_desc:
		"${author} has deleted all economy module data for **EVERYONE**!",

	// Profile Customization commands
	// /setprofilage, /setprofildescriptions, /profil

	// /setprofilage
	setprofilage_command_work:
		"**Your profile age has been updated successfully.**",

	// /setprofildescriptions
	setprofildescriptions_command_work:
		"**Your description has been updated successfully.**",

	// /profil
	profil_not_description_set: "No description set!",
	profil_unknown: "Unknown",
	profil_embed_title: "${emoji_Pin} __Profile of ${memberTag}__",
	profil_embed_fields_nickname: "📝 ・ __Nickname__",
	profil_embed_fields_money: "🪙 ・ __Money__",
	profil_embed_fields_money_value: " coins",
	profil_embed_fields_xplevels: "💳 ・ __XP Levels__",
	profil_embed_fields_xplevels_value: " XP Levels",
	profil_embed_fields_age: "🎂 ・ __Age__",
	profil_embed_fields_age_value: " years old",
	profil_embed_fields_gender: "👤 ・ __Gender__",
	profil_embed_fields_pronouns: "📌 ・ __Pronoun__",
	profil_embed_fields_birthdate: "🎂 ・ __Birthday date__",

	// /profil set-birthday
	profil_birthday_month_button_label: "Set month",
	profil_birthday_day_button_label: "Set day",
	profil_birthday_year_button_label: "Set year",
	profil_birthday_embed_title: "🎂 ・ Set your birthday!",
	profil_birthday_embed_introduction:
		"${emoji_Sparkles} **Like every human being, you have a birthday!**${emoji_Sparkles}\n\n${emoji_Crown} ・ Hey, ${author}\n:tada: ・ In order to celebrate it, it's time to set it!\n",
	profil_birthday_embed_current_birthday:
		"${emoji_Pin} ・ **Current birthday**: `${birthdayMonth}/${birthdayDay}/${birthdayYear}` (in the format of MM/DD/YYYY)",
	profil_birthday_modal1_title: "Enter your birth year",
	profil_birthday_modal1_fields1_label: "Year",
	profil_birthday_invalid_year: "Invalid year! Please enter a valid year.",
	profil_birthday_year_already_set: "Your year is already set.",
	profil_birthday_year_set: "Your year has been set!",
	profil_birthday_modal2_title: "Enter your birth month",
	profil_birthday_modal2_fields1_label: "Month",
	profil_birthday_invalid_month: "Invalid month! Please enter a valid month.",
	profil_birthday_month_already_set: "Your month is already set.",
	profil_birthday_month_set: "Your month has been set!",
	profil_birthday_modal3_title: "Enter your birth day",
	profil_birthday_modal3_fields1_label: "Day",
	profil_birthday_invalid_day: "Invalid day! Please enter a valid day.",
	profil_birthday_day_already_set: "Your day is already set.",
	profil_birthday_day_set: "Your day has been set!",

	// Utils commands
	// /serverinfo, /snipe, /userinfo, /renew

	// /serverinfo

	// /setrankroles
	setrankroles_not_admin:
		"${emoji_No} You are not an administrator of this server. You cannot execute this command!",
	setrankroles_already_this_in_db:
		"${emoji_No} The rank roles are already in the database for this server.",
	setrankroles_not_roles_typed:
		"${emoji_No} You have not included any roles in your command!",
	setrankroles_logs_embed_description_enable:
		"<@${authorId}> set the rankrole to <@&${argsid}>",
	setrankroles_logs_embed_title_enable: "Set RankRole",
	setrankroles_logs_embed_description_disable:
		"<@${authorId}> deleted the rank role!",
	setrankroles_logs_embed_title_disable: "Set RankRole",
	setrankroles_command_work_disable:
		"<@${authorId}>, you have deleted the rank role!",
	setrankroles_command_error:
		"${emoji_No} The command has encountered an error! Please try again later.",

	// /snipe
	snipe_no_previous_message_deleted:
		"No messages have been deleted in this channel!",

	// /userinfo
	userinfo_wait_please: "${emoji_Timer} Wait please...",
	userinfo_var_notfound: "`Not found`",
	userinfo_button_label: "User Profile",

	// /renew
	renew_channel_send_success: "${author} channel re-created!",
	renew_dont_have_permission: ":x: **Can't** `Don't have permission!`",
	renew_not_administrator:
		":x: **You are not an administrator to use this command!**",

	// /renewvc
	renewvc_not_in_voice:
		"${emoji_No} You must be connected to a voice channel to use this command!",
	renewvc_region_success:
		"${emoji_Yes} The voice region of ${targetVc} has been set to automatic!",
	renewvc_dont_have_permission: ":x: **Can't** `Don't have permission!`",

	// /prevnames
	prevnames_undetected: "No data found!",
	prevnames_not_admin:
		"You don't have the `ADMINISTRATOR` permission to execute this command!",
	prevnames_data_erased:
		"Your previous usernames have been completely deleted upon your request!",
	prevnames_embed_footer_text: "iHorizon | Page ${page}/${pageCount}",

	// /blockbot
	blockbot_not_owner: ":x: **You are not the Owner of the server!**",
	blockbot_logs_enable_title: "BlockBot Logs",
	blockbot_logs_enable_description:
		"${author} (The owner of the server) __enabled__ `BlockBot`. Now bots **can't** be added to this guild!",
	blockbot_command_work_on_enable:
		"**You have enabled the `BlockBot`**\nNow bots **can't** be added to this guild!",
	blockbot_command_work_on_disable:
		"**You have disabled the `BlockBot`**\nNow bots **can** be added to this guild!",
	blockbot_logs_disable_commmand_work: "BlockBot Log",
	blockbot_logs_disable_description:
		"${author} (The owner of the server) __disabled__ `BlockBot`. Now bots **can** be added to this guild!",

	// /banner
	banner_guild_no_banner: "The server has no banner.",
	banner_user_no_banner: "This user has no banner.",

	// /massiverole
	massiverole_too_much_member:
		"Too many members, can't do it due to possible rate limiting!",

	// /nickrole
	nickrole_too_much_member:
		"Too many members, cannot proceed due to possible rate limit!",

	// /emoji
	emoji_send_new_emoji:
		"__Created new emoji__ with the following name: **${emojiName}**! (${emoji})",
	emoji_send_err_emoji:
		"__Error when creating new emoji__ with the following name: **${emojiName}**!",

	// /derank
	derank_msg_failed: "An error occurred while removing roles.",
	derank_no_role: "This member has no roles to remove.",

	// /action unban all
	action_unban_all_no_banned_members: "There are no banned members.",

	// /action unban undo

	// /vc
	vc_embed_desc:
		"## Voice States\n`${voiceCount}` member(s) are in a voice channel:\n${emoji_iHorizon_Streaming} **=>** ${streaming}\n${emoji_iHorizon_Deaf} **=>** ${deafened}\n${emoji_iHorizon_Mute} **=>** ${muted}\n${emoji_iHorizon_Camera} **=>** ${video}\n## Member States\n`${memberCount}` member(s) are in the guild:\n${emoji_DND} **=>** ${dnd}\n${emoji_Online} **=>** ${online}\n${emoji_Idle} **=>** ${idle}\n${emoji_Invisible} **=>** ${offline}\n## Boost States\n`${boostCount}` boost(s) in the guild,\n${members}",
	vc_embed_fields_1_name: "・Member Count",
	vc_embed_fields_1_value: "```py\n${memberCount} members```",
	vc_embed_fields_2_name: "・Channel Count",
	vc_embed_fields_2_value:
		"```py\n${textChannelSize} text channel(s)\n${voiceChannelSize} voice channel(s)```",
	vc_embed_short_desc:
		"## Voice States\n`${voiceCount}` member(s) are in a voice channel:\n${emoji_iHorizon_Streaming} **=>** ${total_members_vc_streaming}\n${emoji_iHorizon_Deaf} **=>** ${total_members_vc_deaf}\n${emoji_iHorizon_Mute} **=>** ${total_members_vc_mute}\n${emoji_iHorizon_Camera} **=>** ${total_members_vc_video}\n## Member States\n`${total_members_size}` member(s) are in the guild:\n${emoji_DND} **=>** ${total_members_states_dnd}\n${emoji_Online} **=>** ${total_members_states_online}\n${emoji_Idle} **=>** ${total_members_states_idle}",

	// /massmove
	massmove_too_much_member:
		"Too many members, can't do it due to possible rate limiting!",

	// /all-admins
	all_admins_nobody_admins: "There is no administrator in this guild!",
	all_admins_unrank_button_label: "Unrank all",
	all_admins_unrank_not_owner:
		"Only the owner of the guild can unrank all administrators of the server",

	// /allbots

	// /addrole
	utils_addrole_highter_or_egal_roles_msg:
		"${emoji_Stop} You cannot add a role to a user who has a higher role than you...",
	utils_addrole_command_ok:
		"${author} has successfully added the ${role} role to ${user}",
	utils_addrole_not_wl:
		"${emoji_No} | The role you want to add to the user is not whitelisted. An administrator must add it first! (using `/utils wlroles`)",
	utils_addrole_cant_level:
		"The user isn’t an admin and you’re trying to give them an admin role? You trying to mess with me? You wanna crash the server or what?",
	utils_addrole_try2brain:
		"The bot’s role is too low in the hierarchy. I can’t assign that dumb role, sorry.",

	// /delrole
	utils_delrole_highter_or_egal_roles_msg:
		"${emoji_Stop} You cannot remove a role from a user who has a higher role than you...",
	utils_delrole_command_ok:
		"${author} has successfully removed the ${role} role from ${user}",
	utils_delrole_not_wl:
		"${emoji_No} | The role you want to delete from the user is not whitelisted. An administrator must add it first! (using `/utils wlroles`)",
	utils_delrole_try2brain:
		"The bot’s role is too low in the hierarchy. I can’t remove that dumb role, sorry.",

	// /utils wlroles
	utils_wlroles_embed_title: "Whitelist Role",
	utils_wlroles_embed_desc:
		"Here are all the allowed roles possibly giveable with `addrole`, `delrole` command!",
	utils_wlRoles_logsEmbed_title: "Whitelist Roles Modules",
	utils_wlRoles_logsEmbed_desc:
		"${author} has edited wlRoles (for `addrole`, `delrole` command)",
	utils_derogation_already_exists:
		"${emoji_No} The derogation role ${role} is already correctly configured",
	utils_derogation_created:
		"${emoji_Yes} The derogation role ${role} has been created. Synced channels: `${updatedChannels}`. Failures: `${failedChannels}`",
	utils_derogation_resynced:
		"${emoji_Yes} The derogation role ${role} already existed, I resynced `${updatedChannels}` channels. Failures: `${failedChannels}`",

	// /utils dm
	utils_dm:
		"${emoji_Yes} The message was successfully sent to ${targetMember}.",
	utils_dm_cant:
		"${emoji_No} I couldn't send a message to ${targetMember}. They may have blocked private messages, or they may have blocked me!",

	// /utils pic-only
	utils_pic_only_embed_title: "Media Only Channels",
	utils_pic_only_emnbed_desc:
		"Channel where pictures/images/videos are the only things allowed. Other content (such as plain text messages) is blocked by the bot.",
	utils_piconly_embed_fields_3_name: "Timeout Time",
	utils_piconly_select1_option1_label: "Change timeout time",
	utils_piconly_select1_option2_label: "Change threshold",
	utils_piconly_modal1_title: "MediaOnly - Time Configurations",
	utils_piconly_modal1_fields1_placeholder: "the time of the mute",
	utils_piconly_modal1_fields1_label: "Mute Time",
	utils_piconly_modal2_title: "MediaOnly - Threshold Configuration",
	utils_piconly_modal2_fields1_placeholder: "the threshold before mute",
	utils_piconly_modal2_fields1_label: "Threshold",
	utils_piconly_embed_fields2_placeholder:
		"Create a thread under the image/video",
	utils_piconly_var_thread_name: "Thread by {name}",

	// /zip-emojis
	zip_emojis_doesnt_have_perm:
		"You don't have the permission to manage emojis.",
	zip_emojis_command_work:
		"🎉 Export completed in **${calcTime}**ms! Here's the archive containing ${emojiCount} emojis.",
	zip_emojis_command_error: "An error occurred while exporting emojis.",

	// /zip-stickers
	zip_stickers_doesnt_have_perm:
		"You don't have the permission to manage stickers.",
	zip_stickers_command_work:
		"🎉 Export completed in **${calcTime}**ms! Here's the archive containing ${stickerCount} stickers.",
	zip_stickers_command_error: "An error occurred while exporting stickers.",

	// +sticker
	sticket_no_sticker: "No sticker found in the replied message.",
	sticket_command_work:
		"The sticker `${name}` has been successfully created.",
	sticker_command_error:
		"The sticker could not be created. An error occurred: `${errMessage}`.",
	sticket_command_error2: "Please reply to a message containing a sticker.",

	// /util nick-kicker
	util_nick_kicker_embed_desc:
		"If a member's nickname contains a specific word, they will be kicked.",
	util_nick_kicker_words: "words",
	util_nick_kicker_select_to_remove: "Select a word to remove",
	util_nick_kicker_remove_word: "Remove this word",
	util_nick_kicker_no_word_to_remove: "There is no word to remove",
	util_nick_kicker_add_word: "Add Word",
	util_nick_kicker_words_max_15: "You can't add more than 15 words",
	util_nick_kicker_disable: "Disable",
	util_nick_kicker_remove_word2: "Remove Word",
	util_nick_kicker_remove_desc: "Remove a word from the nick-kicker",
	util_nick_kicker_add_desc: "Add a word to the nick-kicker",
	util_nick_kicker_disable_desc: "Disable the nick-kicker",
	util_nick_kicker_enable_desc: "Enable the nick-kicker",

	// /util wakeup
	util_wakeup_yourself:
		"Bro, are you dumb or what? Don't tell me you're sleeping on the keyboard while typing this command lol",
	util_wakeup_not_in_vc:
		"Bro, the bot isn't going to clone ${userDisplayName} with the same profile pic and banner to make you think they woke up... They're not even in the VC lol",
	util_wakeup_command_work: "Let's go wake up ${user}!",

	// /util talk
	util_talk_not_in_vc: "You must be in a voice channel to use this command.",
	util_talk_audit_reason: "Voice talk mode enabled",
	util_talk_logs_title: "Voice Talk",
	util_talk_logs_description:
		"${author} has enabled talk mode in ${voiceChannel} and muted ${mutedCount} member(s). ${skippedCount} member(s) were skipped.",
	util_talk_command_work:
		"Talk mode is now enabled in ${voiceChannel}. ${mutedCount} member(s) were muted and ${skippedCount} member(s) were skipped.",

	// /util untalk
	util_untalk_nothing_active: "There is no active talk mode for this guild.",
	util_untalk_audit_reason: "Voice talk mode disabled",
	util_untalk_logs_title: "Voice Untalk",
	util_untalk_logs_description:
		"${author} has disabled talk mode in ${voiceChannel} and unmuted ${unmutedCount} member(s).",
	util_untalk_command_work:
		"Talk mode has been disabled in ${voiceChannel}. ${unmutedCount} member(s) were unmuted.",

	// /util freeze
	util_freeze_logs_title: "Voice Freeze",
	util_freeze_logs_description:
		"${author} has frozen access to ${voiceChannel}.",
	util_freeze_command_work:
		"The voice channel ${voiceChannel} is now frozen.",

	// /util wlvc
	util_wlvc_no_member:
		"You must specify a member to allow in the frozen voice channel.",
	util_wlvc_no_freeze:
		"There is no active frozen voice channel in this guild.",
	util_wlvc_logs_title: "Voice Freeze Allow",
	util_wlvc_logs_description:
		"${author} has allowed ${member} to join the frozen voice channel.",
	util_wlvc_command_work:
		"${member} is now allowed to join the frozen voice channel.",

	// /util unwlvc
	util_unwlvc_no_member:
		"You must specify a member to remove from the frozen voice channel whitelist.",
	util_unwlvc_no_freeze:
		"There is no active frozen voice channel in this guild.",
	util_unwlvc_not_whitelisted:
		"${member} is not allowed in the frozen voice channel.",
	util_unwlvc_logs_title: "Voice Freeze Remove Allow",
	util_unwlvc_logs_description:
		"${author} has removed ${member} from the frozen voice channel whitelist.",
	util_unwlvc_command_work:
		"${member} can no longer join the frozen voice channel.",

	// /util unfreeze
	util_unfreeze_no_freeze:
		"There is no active frozen voice channel in this guild.",
	util_unfreeze_logs_title: "Voice Unfreeze",
	util_unfreeze_logs_description:
		"${author} has removed the active voice freeze.",
	util_unfreeze_command_work: "The voice channel is no longer frozen.",

	// /util leash
	util_leash_too_naugthy:
		"You little rascal, you can't leash more than 3 people :D",
	util_leah_already_owned:
		"You little rascal, you already own these little wonders :smirk:",
	util_leash_confirm_message:
		"${emoji_No} | The member you want to leash isn't in a voice channel!\n${emoji_Warning_Icon} | Are you sure you want to proceed with this action?",
	util_leash_canceled_leash: "${emoji_Yes} | Leash configurations canceled",
	util_leash_confirmed_leash:
		"${emoji_Yes} | You have successfully leashed the user in this guild :smirk:",

	// /util unleash
	util_unleash_not_in_leash: "${emoji_No} | This user is not on your leash!",
	util_unleash_command_ok:
		"${emoji_Yes} | You have successfully unleashed the user in this guild :)",

	// /utilss leashlist
	util_leashlist_no_data:
		"${emoji_No} | There is no active leash in this guild.",
	util_leashlist_embed_title: "Active leashes",

	// /util lockname, /util unlockname
	util_lockname_not_in_guild:
		"${emoji_No} | This member is not in the guild!",
	util_lockname_not_manageable:
		"${emoji_No} | I don't have permission to manage this member's nickname!",
	util_lockname_already_locked:
		"${emoji_No} | This member's nickname is already locked!",
	util_lockname_success:
		"${emoji_Yes} | The nickname of ${member} is now locked to **${nick}**!",
	util_lockname_success_reset:
		"${emoji_Yes} | The nickname of ${member} is now locked!",
	util_unlockname_not_locked:
		"${emoji_No} | This member's nickname is not locked!",
	util_unlockname_success:
		"${emoji_Yes} | The nickname of ${member} has been unlocked!",
	util_lockname_logs_embed_title: "Nickname Lock Logs",
	util_lockname_logs_embed_description:
		"<@${authorId}> locked the nickname of <@${memberId}>",
	util_unlockname_logs_embed_description:
		"<@${authorId}> unlocked the nickname of <@${memberId}>",

	util_locknamelist_empty:
		"${emoji_No} | No locked nickname on this guild! `/utilss lockname` to create one.",
	util_locknamelist_embed_title: "Locked nicknames",

	// /util autorenew
	util_autorenew_time_too_short:
		"The time between channel renewals must be more than 1 minute",
	util_autorenew_time_too_long:
		"The time between channel renewals must be less than 30 days",
	util_autorenew_command_ok:
		"${emoji_Yes} Now, the ${channel} channel is automatically deleted-created (renewed) every ${time}!\nTo stop the channel from being renewed, just delete it by yourself.",
	event_autorenew_channel_renewed: "The AutoRenew has renewed the channel!",
	event_autorenew_channel_warning:
		"The AutoRenew module is configured to renew this channel. Next renewal is in ${time}.",

	// /util where
	var_video: "Video",
	var_whereis: "Where is",
	util_not_in_vc: "The members are not in a voice channel",

	// /util allwebhooks
	util_no_webhooks: "There are no webhooks in this guild.",
	util_allwebhooks_embed_title: "All webhooks",
	util_allwebhooks_deleting: "Deleting all webhooks...",
	util_allwebhooks_deleted: "**`${u}`** webhook(s) deleted!",

	// /util unzip-emojis
	util_unzip_emojis_command_work:
		"🎉 Unzip completed in **${calcTime}**ms! I have created ${emojiCount} emoji(s) in the guild.",
	util_unzip_emojis_command_error:
		"An error occurred while unzipping emojis.",
	util_unzip_emojis_command_no_file:
		"Please attach a zip file containing emojis.",

	// /util vkick
	vkick_member_not_in_guild: "The member is not in the guild.",
	vkick_not_in_vc: "The member is not in a voice channel.",
	vkick_not_admin_kick:
		"You cannot disconnect an administrator from a voice channel.",
	vkick_logEmbed_title: "Voice Kick",
	vkick_logEmbed_desc:
		"${author} has disconnected ${member} from the ${voiceChannel} voice channel.",
	vkick_command_work:
		"${author}, you have successfully disconnected ${member} from ${voiceChannel}",

	// /util sync
	util_sync_embed_description_0:
		"All channels in the category already have synchronized permissions.",

	// /util securewebhook
	util_securewebhook_action_create: "Invalid Discord Webhook URL",
	util_securewebhook_action_create_error:
		"Error while creating the webhook: `${status}`",
	util_securewebhook_action_create_ok:
		"Webhook created successfully\n> URL: ${url}\n> Use: ${use}",
	util_securewebhook_action_delete_any: "You don't have any webhook",
	util_securewebhook_action_delete_not_owner:
		"You are not the owner of this webhook",
	util_securewebhook_action_delete_error: "Error while deleting the webhook",
	util_securewebhook_actiom_list_ok: ":star: __**Your webhooks**__:\n",

	// /util admin-roles
	admin_roles_nobody_roles: "There is no administrator role in this guild!",
	admin_roles_remove_button_label: "Remove admin from all",
	admin_roles_remove_not_owner:
		"Only the owner of the guild can remove administrator permission from roles",

	// /util rolelimit
	util_rolelimit_bad_opt:
		"${emoji_No} | The provided options are invalid. Please check your input.",
	util_rolelimit_good:
		"${emoji_Crown} | Role: ${role} | Max Members: ${limit_count}\n- New users won't be able to receive this role if ${limit_count} members already have it.",

	// /util inviteinfo
	util_inviteinfo_not_valid_invite: "This `discord_invite` is not valid!",

	// /util cooldown
	util_cooldown_command_ok:
		"The channel's slowmode has been set to ${duration_in_string}.",

	// /util role-members
	util_role_members_no_one: "There is nobody with that role on the server",

	// /util vanity-generator
	util_vanity_generator_invalid_code:
		"The URL Vanity code `${VanityCode}` is invalid. The string should be alphanumeric and can include hyphens between words. The maximum length is 32 characters. Hyphens cannot be at the beginning or end of the string.",
	util_vanity_generator_already_claimed:
		"The URL Vanity code is already taken! Choose another one.",
	util_vanity_generator_command_err:
		"An error has occurred while creating the vanity code. Please try again later.",

	// +top
	utils_top_no_message: "No messages found in this channel",
	utils_top_command_ok:
		"The first message in this channel is [here](${link})",

	// +bringall
	bringall_no_from_channel: "Please specify a source voice channel.",
	bringall_invalid_category: "Please specify a valid category.",
	bringall_no_voice_channels:
		"The specified category contains no voice channels.",
	bringall_no_members: "There are no members in the source voice channel.",

	// /util move
	util_move_not_in_vc:
		"The member you want to move is not connected to any voice channel",
	util_move_impossible_to_move_admin:
		"The member you want to move is an administrator, and you are not an administrator either.",
	util_move_command_ok: "${member} is now in ${channel}",

	// Guild Config commands
	// /blockpub, /guildprofil, /setchannels, /setjoindm, /setjoinmessage, /setjoinroles, /setleavemessage, /setup

	// /blockpub
	blockpub_not_admin: ":x: | You must be an administrator of this server!",
	blockpub_now_enable:
		"📌 | The antipub is now functional (it works for everyone except admins)",
	blockpub_now_disable: "📌 | The antipub is now deactivated!",

	// /guildprofil
	guildprofil_not_admin: ":x: | You must be an administrator of this server!",
	guildprofil_not_set_reactionrole: "Not set!",
	guildprofil_set_reactionrole:
		"**MessageID**: `${i}` -> ${emoji} gives <@&${rolesID}> role\n",
	guildprofil_not_set_ticketFetched: "Not set!",
	guildprofil_set_ticketFetched: "",
	guildprofil_not_set_punishPub: "Not set!",
	guildprofil_set_punishPub:
		"`${punishementType}`: max: `${amountMax}` flags.",
	guildprofil_not_set_supportConfig: "Not set!",
	guildprofil_set_supportConfig:
		"`${input}` in bio gives <@&${rolesId}> role.",
	guildprofil_not_set_setchannelsjoin: "Not set!",
	guildprofil_set_setchannelsjoin: "",
	guildprofil_not_set_setchannelsleave: "Not set!",
	guildprofil_set_setchannelsleave: "",
	guildprofil_not_set_joinmessage: "Not set!",
	guildprofil_set_joinmessage: "",
	guildprofil_not_set_leavemessage: "Not set!",
	guildprofil_set_leavemessage: "",
	guildprofil_not_set_joinroles: "Not set!",
	guildprofil_set_joinroles: "",
	guildprofil_not_set_joinDmMessage: "Not set!",
	guildprofil_set_joinDmMessage: "",
	guildprofil_not_set_blockpub: "Power off",
	guildprofil_set_blockpub: "Power on",
	guildprofil_embed_description: "`Guild Config:` ${guildName}!",
	guildprofil_embed_fields_joinmessage: "Join Message",
	guildprofil_embed_fields_leavemessage: "Leave Message",
	guildprofil_embed_fields_setchannelsjoin: "Channel Join",
	guildprofil_embed_fields_setchannelsleave: "Channel Leave",
	guildprofil_embed_fields_joinroles: "Join Role",
	guildprofil_embed_fields_joinDmMessage: "Join DM",
	guildprofil_embed_fields_blockpub: "Block Pub",
	guildprofil_embed_fields_punishPub: "Punish Pub",
	guildprofil_embed_fields_supportConfig: "Support",
	guildprofil_embed_fields_ticketFetched: "Tickets",
	guildprofil_embed_fields_reactionrole: "Reaction Role",
	guildprofil_not_logs_set: "No Channel Logs Set",
	guildprofil_blockbot_on: "Block Bot Enabled",
	guildprofil_blockbot_off: "Block Bot Disabled",
	guildprofil_disable_xp: "Message Disabled",
	guildprofil_enable_xp: "Message Enabled",
	guildprofil_another_enable_xp:
		"Message Enabled sending in <#${xpChannels}>",
	guildprofil_embed_fields_blockbot: "Block Bot",
	guildprofil_embed_fields_logs: "Logs",
	guildprofil_embed_fields_ranks: "Ranks",

	// /setchannels
	setchannels_not_admin:
		":x: | You must be an administrator of this server to request these commands!",
	setchannels_not_specified_args:
		"You must specify a valid channel for your module.",
	setchannels_already_this_channel_on_join:
		"The module is already configured with this channel!",
	setchannels_confirmation_message_on_join:
		"**The join channel is set there!** :tada:",
	setchannels_command_error_on_join:
		"Error: missing permissions or the channel doesn't exist",
	setchannels_command_work_on_join:
		"You successfully set the join channel module to <#${argsidId}>",
	setchannels_logs_embed_title_on_join: "Set Channel Logs",
	setchannels_logs_embed_description_on_join:
		"<@${authorId}> set the join channel module to: <#${argsidId}>",
	setchannels_already_this_channel_on_leave:
		"The module is already configured with this channel!",
	setchannels_confirmation_message_on_leave:
		"**The leave channel is now set there!** :tada:",
	setchannels_command_error_on_leave:
		"Error: missing permissions or the channel doesn't exist",
	setchannels_command_work_on_leave:
		"You have successfully set the leave channel module to <#${argsidId}>",
	setchannels_logs_embed_title_on_leave: "Set Channel Logs",
	setchannels_logs_embed_description_on_leave:
		"<@${authorId}> set the leave channel to: <#${argsidId}>",
	setchannels_already_on_off:
		"The join & leave channels are already disabled",
	setchannels_command_work_on_off:
		"You have successfully disabled the leave & join channel!",
	setchannels_logs_embed_title_on_off: "Set Channel Logs",
	setchannels_logs_embed_description_on_off:
		"<@${authorId}> deleted all join/leave channel configuration!",
	setchannels_button_join: "Change Join Channel",
	setchannels_button_leave: "Change Leave Channel",
	setchannels_button_delete: "Delete Config",
	setchannels_embed_fields_value_join: "Join Channel",
	setchannels_embed_fields_value_leave: "Leave Channel",
	setchannels_not_a_text_channel:
		"${emoji_Warning_Icon} The specified channel is not a text channel!",
	setchannels_which_channel:
		"<@${authorId}>, which channel do you want to set up?",
	setchannels_title_embed_panel:
		"Configuration Panel for GuildConfig's Channel",

	// /setjoindm
	setjoindm_not_admin:
		":x: | You must be an administrator of this server to request this command!",
	setjoindm_logs_embed_title_on_enable: "Set JoinDM Logs",
	setjoindm_logs_embed_description_on_enable:
		"<@${authorId}> set the join DM message!",
	setjoindm_not_specified_args_on_enable:
		"You must specify a valid message for your join DM.",
	setjoindm_confirmation_message_on_enable:
		"You have successfully set the join DM to:```${dm_msg}``` And enabled it",
	setjoindm_command_error_on_enable:
		"Error: missing permissions or channel doesn't exist",
	setjoindm_logs_embed_title_on_disable: "Set JoinDm Logs",
	setjoindm_logs_embed_description_on_disable:
		"<@${authorId}> disabled the join DM message!",
	setjoindm_confirmation_message_on_disable:
		"You have successfully disabled the join DM!",
	setjoindm_command_error_on_disable:
		"Error: missing permissions or channel doesn't exist",
	setjoindm_already_disable: "The join DM message is already disabled!",
	setjoindm_not_setup_ls: "There is no join DM setup here!",
	setjoindm_command_work_ls: "The join DM message is:\n```${already_off}```",
	setjoindm_help_embed_title: "Set JoinDM Message Help!",
	setjoindm_help_embed_desc:
		"{memberUsername} => The member's username\n{memberMention} => Mention the member\n{memberCount} => Number of members in the guild\n{guildName} => Name of the guild\n{createdAt} => Account creation date in dd/mm/yyyy\n{accountCreationTimestamp} => The timestamp of the account creation date",
	setjoindm_buttom_set_name: "Set Message",
	setjoindm_buttom_delete_name: "Delete DM Message",
	setjoindm_awaiting_response:
		"Write the new custom JoinDM Message in the channel.",

	// /setjoinmessage
	setjoinmessage_not_admin:
		":x: | You must be an administrator of this server to use these commands!",
	setjoinmessage_help_embed_title: "setjoinmessage Help!",
	setjoinmessage_help_embed_description:
		"/setjoinmessage <Power on /Power off/Show the message set> <join message>",
	setjoinmessage_help_embed_fields_name: "how to use?",
	setjoinmessage_help_embed_fields_value:
		"Use ```/setjoinmessage <Power on /Power off/Show the message set> <message>```\n{user} = Username of Member\n{membercount} = guild's member count\n{createdat} = member account creation date\n{guild} = The name of the guild\n{inviter} = The inviter username & discriminator\n{invites} = The invites count of the user",
	setjoinmessage_logs_embed_title_on_enable: "SetJoinMessage Logs",
	setjoinmessage_logs_embed_description_on_enable:
		"<@${authorId}> set the join message!",
	setjoinmessage_command_work_on_enable:
		"${emoji_GreenTick} | Successfully set custom join message.",
	setjoinmessage_logs_embed_title_on_disable: "SetJoinMessage Logs",
	setjoinmessage_logs_embed_description_on_disable:
		"<@${authorId}> deleted the join message!",
	setjoinmessage_command_work_on_disable:
		"${emoji_Yes} | Successfully deleted custom join message.",
	setjoinmessage_command_work_ls: "The join message is:",
	setjoinmessage_help_embed_fields_custom_name: "Custom Message",
	setjoinmessage_help_embed_fields_custom_name_empy: "Not set!",
	setjoinmessage_help_embed_fields_default_name_empy: "Default Message",
	setjoinmessage_help_embed_desc:
		"{memberUsername} => The member's username\n{memberMention} => Mention the member\n{inviterUsername} => The inviter's username\n{inviterMention} => Mention the inviter\n{memberCount} => Number of members in the guild\n{invitesCount} => Number of invites by the inviter\n{guildName} => The name of the guild\n{createdAt} => Account creation date in dd/mm/yyyy\n{accountCreationTimestamp} => Timestamp of the account creation date",
	setjoinmessage_button_set_name: "Set message",
	setjoinmessage_buttom_del_name: "Default Message",
	setjoinmessage_awaiting_response: "Write the new custom Join Message.",
	setjoinmessage_image_default_text:
		"Welcome {memberUsername} to {guildName}<br>We are now {memberCount} members in the guild",
	setjoinmessage_change_image_button_title: "Change Image",
	setjoinmessage_default_image_button_title: "Default Image",
	setjoinmessage_var_enable_image: "Enable Image",
	setjoinmessage_var_disable_image: "Delete Image",
	setjoinmessage_var_image_card: "Join Message Card",
	setjoinmessage_change_image_propreties_background: "Change Background",
	setjoinmessage_change_image_propreties_frame_color:
		"Change Round Frame Color",
	setjoinmessage_change_image_propreties_text_colour: "Change Text Color",
	setjoinmessage_change_image_propreties_text_message: "Change Text Message",
	setjoinmessage_change_image_propreties_text_size: "Change Text Size",
	setjoinmessage_change_image_propreties_avatar_size: "Change Avatar Size",
	setjoinmessage_modal_fields_background_url: "background image url",
	setjoinmessage_change_image_menu_frame_color_profil:
		"Based on user profile color",
	setjoinmessage_change_image_menu_frame_status_profil:
		"Based on user status",
	setjoinmessage_modal_fields_hex_color: "color www.color-hex.com",
	setjoinmessage_modal_fields_message: "message you want",
	setjoinmessage_var_text_size: "Text Size: ",
	setjoinmessage_var_avatar_size: "Avatar Size: ",
	setjoinmessage_change_image_invalid_url:
		"Invalid Image URL. Please try with another image provider.",

	// /setjoinroles
	setjoinroles_var_none: "None",
	setjoinroles_var_perm_admin: "Administrator",
	setjoinroles_var_perm_manage_guild: "Manage Server",
	setjoinroles_var_perm_manage_role: "Manage Roles",
	setjoinroles_var_perm_use_mention: "Use @everyone @here and ping roles",
	setjoinroles_var_perm_ban_members: "Ban Members",
	setjoinroles_var_perm_kick_members: "Kick Members",
	setjoinroles_var_perm_manage_webhooks: "Manage webhooks",
	setjoinroles_var_perm_manage_channels: "Manage channels",
	setjoinroles_var_perm_manage_expression:
		"Manage emojis, stickers and soundboard",
	setjoinroles_var_perm_view_monetization_analytics:
		"View creator monetization and analytics",
	setjoinroles_var_perm_issue: "I do not have permission to manage roles.",
	setjoinroles_var_timesup: "Time expired for role selection.",
	setjoinroles_warn_dangerous_perm:
		"The following roles have dangerous permissions. Do you really want to assign them?",
	setjoinroles_warn_title: "Warning!",
	setjoinroles_timesup_button: "Time's up!",
	setjoinroles_action_canceled: "Action canceled",
	setjoinroles_too_highter_roles:
		"The following roles have a higher position compared to mine.",
	setjoinroles_not_admin:
		":x: | You must be an administrator of this server to use these commands!",
	setjoinroles_help_embed_title: "JoinRoles Module",
	setjoinroles_help_embed_description:
		"Here are all the roles I give to new members",
	setjoinroles_help_embed_fields_1_name: "All registered roles",
	setjoinroles_logs_embed_title_on_enable: "SetJoinRoles Logs",
	setjoinroles_logs_embed_description_on_enable:
		"<@${authorId}> set the join roles!",
	setjoinroles_already_on_enable:
		"The join role is already configured with this role!",

	// /welcomer
	welcomer_panel_title: "Welcomer",
	welcomer_section_placeholder: "Choose what to configure",
	welcomer_section_channels: "Channels",
	welcomer_embed_label: "Custom embed",
	welcomer_text_label: "Text",
	welcomer_embed_set_button: "Set embed",
	welcomer_embed_remove_button: "Remove embed",
	welcomer_embed_modal_title: "Set a custom embed",
	welcomer_embed_modal_label: "Embed ID (from the embed builder)",
	welcomer_embed_not_found:
		"No saved embed found with the ID `${embed_id}`. Create one with the embed builder first.",
	welcomer_embed_set_ok:
		"Custom embed `${embed_id}` will now be sent for this event. Variables like {memberMention} are replaced automatically.",
	welcomer_embed_removed_ok:
		"Custom embed removed. Back to the default card.",
	welcomer_text_enable_button: "Enable text",
	welcomer_text_disable_button: "Disable text",
	welcomer_components_enable_button: "Enable Components",
	welcomer_components_disable_button: "Disable Components",
	welcomer_render_mode_label: "Render mode",
	welcomer_render_mode_components: "Components (card)",
	welcomer_render_mode_simple: "Simple message",

	// /setleavemessage
	setleavemessage_not_admin:
		":x: | You must be an administrator of this server to use these commands!",
	setleavemessage_help_embed_title: "/setleavemessage Help!",
	setleavemessage_help_embed_description:
		"/setleavemessage <Power on /Power off/Show the message set> <leave message>",
	setleavemessage_help_embed_fields_name: "how to use?",
	setleavemessage_help_embed_fields_value:
		"Use ```/setleavemessage <Power on /Power off/Show the message set> <message>```\n{user} = Username of Member\n{membercount} = guild's member count\n{guild} = The name of the guild",
	setleavemessage_logs_embed_title_on_enable: "SetLeaveMessage Logs",
	setleavemessage_logs_embed_description_on_enable:
		"<@${authorId}> set the leave message!",
	setleavemessage_command_work_on_enable:
		"${emoji_Yes} | Successfully set custom leave message.",
	setleavemessage_logs_embed_title_on_disable: "SetLeaveMessage Logs",
	setleavemessage_logs_embed_description_on_disable:
		"<@${authorId}> deleted the leave message!",
	setleavemessage_command_work_on_disable:
		"${emoji_Yes} | Successfully deleted custom leave message.",
	setleavemessage_command_work_ls: "The leave message is:",
	setleavemessage_awaiting_response: "Write the new custom Leave Message.",

	// /setup
	setup_not_admin: ":x: | You must be an administrator of this server!",
	setup_command_work: "${emoji_Yes} | Channel Setup",
	setup_command_error:
		"The bot has already set up the logs channels, or the bot doesn't have enough permissions...",

	// /setlogschannel
	setlogschannel_not_admin:
		":x: | You must be an administrator of this server to request this command!",
	setlogschannel_not_specified_args:
		"You must specify a valid channel for your module.",
	setlogschannel_confirmation_message:
		"${emoji_Yes} | Here is now for the `${typeOfLogs}`, setup by <@${authorId}>!",
	setlogschannel_already_this_channel:
		"This server already has this channel for logs!",
	setlogschannel_already_deleted:
		"This server doesn't have `SERVER_LOGS` set!",
	setlogschannel_command_error: "An error occurred. Please try again.",
	setlogschannel_command_work:
		"You have successfully set up the `${typeOfLogs}` in <#${argsidId}>!",
	setlogschannel_utils_command_work:
		"You have successfully set up the `${typeOfLogs}` in ${argsidId}!",
	setlogschannel_command_work_on_delete:
		"You have successfully deleted all of `SERVER_LOGS` in **${guildName}**",
	setlogschannel_logs_embed_title: "Set ServerLogs",
	setlogschannel_logs_embed_description_on_enable:
		"<@${authorId}> set `${typeOfLogs}` to <#${argsidId}>",
	setlogschannel_logs_embed_title_on_off: "Set ServerLogs",
	setlogschannel_logs_embed_description_on_off:
		"<@${authorId}> deleted all `SERVER_LOGS` in the guild!",
	setlogschannel_var_roles: "Roles Logs",
	setlogschannel_var_mods: "Moderation Logs",
	setlogschannel_var_voice: "Voice Logs",
	setlogschannel_var_msg: "Messages Logs",
	setlogschannel_var_boost: "Boost Logs",
	setlogschannel_var_tickets: "Ticket Logs",
	setlogschannel_var_antispam: "AntiSpam Logs",
	setlogschannel_var_channel: "Channel Logs",
	setlogschannel_var_confession: "Confession Logs",
	setlogschannel_var_economy: "Economy Logs",

	setlogschannel_all_already_exist:
		"All the log channels are already configured!",

	// /join-ghostping add
	joinghostping_add_already_set: "The channel ${channel} is already set!",
	joinghostping_add_sent_to_channel:
		"From now on, when a member joins the guild, I'll send a ghost message **here**.",
	joinghostping_add_ok_embed_title: "Join GhostPing Module",
	joinghostping_add_ok_embed_desc:
		"I'll now send a ghost message in this channel whenever a member joins the guild!",
	joinghostping_add_ok_embed_fields_name: "All registered channels",
	joinghostping_add_logs_embed_title: "Join GhostPing Logs",
	joinghostping_add_logs_embed_desc:
		"${author} has added ${channel} to the Join GhostPing Module!",

	// /join-ghostping remove
	joinghostping_remove_isnt_set: "The channel ${channel} isn't set!",
	joinghostping_remove_ok_embed_desc:
		"The channels have been deleted from the Join GhostPing Module!",
	joinghostping_remove_logs_embed_desc:
		"${author} has deleted ${channel} from the Join GhostPing Module!",

	// /automod
	automod_panel_title: "AutoMod Control Panel",
	automod_panel_desc:
		"Configure every iHorizon AutoMod rule: enable or disable them, set their logs channel and pick the roles allowed to bypass them.",
	automod_panel_overview_title: "Protected rules",
	automod_panel_select_placeholder: "Select a rule to configure",
	automod_panel_label_logs: "Logs channel",
	automod_panel_label_bypass: "Bypass roles",
	automod_panel_label_mention_limit: "Mention limit",
	automod_panel_rule_spam_name: "Message spam",
	automod_panel_rule_spam_desc:
		"Blocks flood and repeated messages in the server.",
	automod_panel_rule_mass_mention_name: "Mass mentions",
	automod_panel_rule_mass_mention_desc:
		"Blocks messages containing an abusive number of mentions.",
	automod_panel_rule_antipub_name: "Links & advertising",
	automod_panel_rule_antipub_desc:
		"Blocks advertising links, with a safe allow-list (GitHub, Tenor, YouTube, ...).",
	automod_panel_rule_media_name: "Discord invites",
	automod_panel_rule_media_desc:
		"Blocks Discord server invitation links sent in messages.",
	automod_panel_rule_telegram_name: "Telegram links",
	automod_panel_rule_telegram_desc:
		"Blocks Telegram links (t.me, telegram.me, tg://...).",
	automod_panel_logs_placeholder:
		"Select the channel receiving the logs of this rule",
	automod_panel_bypass_placeholder: "Select the roles bypassing this rule",
	automod_panel_enable_button: "Enable",
	automod_panel_disable_button: "Disable",
	automod_panel_back_button: "Back",
	automod_panel_refresh_button: "Refresh",
	automod_panel_close_button: "Close panel",
	automod_panel_rule_enabled: "The rule **${rule}** is now enabled!",
	automod_panel_rule_disabled: "The rule **${rule}** is now disabled!",
	automod_panel_bypass_saved:
		"The bypass roles of **${rule}** have been updated!",
	automod_panel_logs_saved:
		"The logs of **${rule}** are now sent in ${channel}.",
	automod_panel_logs_reset:
		"The logs channel of **${rule}** has been removed!",
	automod_panel_api_error:
		"I couldn't apply this change, make sure I have the `Manage Server` permission and that the default Discord AutoMod rules are disabled, then try again.",

	// /guildconfig block too-new-account
	too_new_account_dont_specified_time_on_enable:
		"You did not specify a time. To enable this module, a minimum account age is required!",
	too_new_account_invalid_time_on_enable:
		"The time you entered is not valid! **Example of valid time**: `3h; 30m; 4mo; 4w; 4y` -> 3 hours; 30 minutes; 4 month(s); 4 weeks; 4 years",
	too_new_account_logEmbed_title: "TooNewAccount Module",
	too_new_account_logEmbed_desc_on_enable:
		"${author} enabled the TooNewAccount module. Accounts must now be at least ${beautifulTime} old, and if a user joins more than `${maxJoin}` times, they will be banned.",
	too_new_account_command_work_on_enable:
		"${author}, new members joining **${guildName}** with accounts younger than `${beautifulTime}` will now be kicked.",
	too_new_account_command_work_on_enable2:
		"\n-# ${emoji_Sparkles} After the account joins the server **`${maxJoin}`** times, it will be banned.",
	too_new_account_logEmbed_desc_on_disable:
		"${author} has disabled the module!",
	too_new_account_command_work_on_disable:
		"${author}, the module has been successfully disabled. New members' account creation dates will no longer be checked.",

	// /guildconfig set-bot footer-name
	guildconfig_setbot_footername_footer_too_long_msg:
		"The bot footer is too long, it will be too ugly to display.",
	guildconfig_setbot_footername_is_good:
		"Successfully changed, all iHorizon embeds will use `${footerName}` as footer!",
	guildconfig_setbot_footername_is_reset:
		"The footer name has been deleted. Now all iHorizon embeds will use the `name of the bot`.",
	guildconfig_setbot_footername_not_found:
		"The footer name is not found. Please try again!",

	// /guildconfig set-bot footer-pfp
	guildconfig_setbot_footeravatar_is_good:
		"Successfully changed, all embeds from iHorizon will use `image` as the footer!",
	guildconfig_setbot_footeravatar_incorect:
		"The file does not correspond to an image. Please try again with an image.",
	guildconfig_setbot_footeravatar_is_reset:
		"The footer avatar has been deleted. Now all iHorizon embeds will use the `avatar of the bot`.",

	// /guildconfig set-bot prefix
	guildconfig_setbot_prefix_prefix_now_mention:
		"The bot prefix for Message's command is now mention! `@Ping-Me`",
	guildconfig_setbot_prefix_prefix_specify_prefix:
		"You need to specify the bot prefix.",
	guildconfig_setbot_prefix_prefix_too_long:
		"The bot prefix is too long, it will be too difficult to use.",
	guildconfig_setbot_prefix_prefix_is_good:
		"The bot prefix has been successfully changed, now message commands are usable with: `${formatedPrefix}`",

	// /guildconfig config save
	guildconfig_config_save_check_dm:
		"Please look at your DM. If you didn't receive the message, try to verify if you accept DMs.",
	guildconfig_config_save_user_msg:
		"This is the backup of configurations of `${guildName}`!",
	guildconfig_config_save_user_msg_2:
		"Here is the link to download the server backup!\n",

	// /guildconfig config restore
	guildconfig_config_restore_err_msg:
		"There was an error downloading the file.",
	guildconfig_config_restore_msg: "The data has been set in my database.",
	guildconfig_config_restore_wrong_guild:
		"This backup does not belong to this server or is not valid, so it was not restored.",

	// /perm add
	perm_add_args_error:
		"You have not specified the commands to change or the permission to set.",

	// /perm list
	perm_list_embed_title: "All user permissions:",
	perm_list_unknown_user: "Unknown user (ID: ${userId})",
	perm_list_no_user: "No user found",
	var_command: "Command",
	var_subcommand: "Subcommand",
	var_subcommand_group: "Subcommand group",
	var_unreachable_command: "Command not found",
	perm_list_no_command_set:
		"There is no command with specific permission set in this guild!",

	// /perm set
	perm_set_deleted: "${user} has their permission **deleted**!",
	perm_set_ok: "${user} has their permission changed to **`${perm}`**",
	perm_set_warn_message:
		"${author}, you cannot give permission higher than or equal to yours!",
	perm_set_chng_perm_lvl: "Changed permission level",
	perm_set_add_role: "Added Role",
	perm_set_add_usr: "Added user",
	perm_rmv_role: "Removed Role",
	perm_rmv_usr: "Removed user",
	perm_set_command_reset: "This command has been reset",
	perm_set_no_modified: "No permission modified",
	perm_command_delete_dont_exist:
		"The specified command does not have any permissions set.",
	perm_command_delete_command_deleted:
		"Deleted permissions for command: `${commands}`",
	perm_command_delete_specify_command:
		"You need to specify a command to delete its permissions.",
	perm_command_delete_all_one:
		"You need to specify one option to delete a permission.",
	perm_command_delete_all_one_option:
		"You can only specify one option to delete a permission.",
	perm_command_delete_all_zero_change:
		"The permission type you specified was not used in any command.",
	perm_command_delete_all_command_ok:
		"\nSuccessfully deleted **${changeCount}** nested `${type}` (${value}) permissions from the database.",
	commandlimit_current_value: "${count} use(s) per ${time}",
	commandlimit_invalid_value:
		"The values provided for the command rate limit are invalid.",
	commandlimit_missing_command: "You need to specify a command.",
	commandlimit_set_success:
		"The rate limit for `${command}` has been set to `${limit}`.",
	commandlimit_reset_success:
		"The rate limit for `${command}` has been reset.",
	commandlimit_reset_missing: "No rate limit is configured for `${command}`.",
	commandlimit_list_title: "Configured command rate limits",
	commandlimit_list_item: "- `${command}`: ${limit}",
	commandlimit_list_empty:
		"No command rate limit is configured in this guild.",
	commandlimit_rate_limited:
		"You have reached the limit for this command. Try again in ${time}.",

	// /perm roles
	perm_roles_created_role: "The following roles have been created: ${roles}",
	perm_roles_already_upate: "All roles already exist and are up to date.",
	perm_roles_error: "An error occurred while creating or updating the roles.",
	perm_roles_not_owner:
		"Only the server owner can add permission level roles.",

	// /perm edit-roles
	perm_edit_roles_command_ok:
		"The permission ${permName} has had its role changed to ${strRole}",

	// /toggle-react
	toggle_react_command_work:
		"<@${authorId}>, now when a member sends a welcome message, the bot will **{activeMsg}**",
	toggle_react_doesnt_react: "no longer react",
	toggle_react_react: "react",

	// /remove-react
	remove_react_command_work:
		"<@${authorId}>, now when a member sends `${message}`, the bot will **no longer react**.",

	// /add-react
	add_react_command_err_emojis:
		"The emoji `{emoji}` for the reaction is not a valid emoji!",
	add_react_command_err_message:
		"You must specify the message that will trigger the reaction!",
	add_react_command_bad_word:
		"This word can't be used for an automatic reaction: it must not contain a dot.",
	add_react_command_work:
		"<@${authorId}>, now when a member sends `${message}`, the bot will **react** with {emoji}",

	// /list-react
	list_react_nothing_found: "No data found, please add some first.",
	list_react_embed_msg:
		"When someone sends **`${key}`**, I will **react** with ${value}\n",

	// /autoreact
	autoreact_embed_title: "Autoreact Configuration",
	autoreact_embed_desc:
		"When a new message is sent in the specified channel, the bot will react with the specified emoji(s).",
	autoreact_embed_autofields_value: "Reaction: ${reaction}",
	autoreact_embed_autofields_none_value: "No autoreact configuration set.",
	autoreact_embed_footer:
		"Page ${currentPage} of ${totalPage} • Total Ranks: ${totalReact}",
	autoreact_btn_add_name: "Add channel",
	autoreact_btn_remove_name: "Remove channel",
	autoreact_max_25: "Maximum of 25 autoreact configurations can be set.",
	autoreact_menu_add_place: "Select a channel to add",
	autoreact_awaiting1_msg:
		"Please select a channel to add to the autoreact module.",
	autoreact_modal_title: "AutoReact Configuration",
	autoreact_modal_fields1_label: "The reaction (emoji)",
	autoreact_invalid_emoji: "Invalid emoji. Please enter a valid emoji.",
	autoreact_add_command_ok: "The autoreact configuration has been set.",
	autoreact_remove_not_found: "No autoreact configurations set.",
	autoreact_menu_remove_place: "Select a channel to remove",
	autoreact_awaiting_remove_msg:
		"Please select a channel to remove from the autoreact module.",
	autoreact_remove_command_ok:
		"The autoreact configuration for this channel has been removed.",

	// Member Count commands
	// /setmembercount

	// /setmembercount
	setmembercount_not_admin:
		":x: | You must be an administrator of this server to request this command!",
	setmembercount_helpembed_title: "Set MemberCount Help!",
	setmembercount_helpembed_description:
		"/membercount <Enable / Disable> <Channel Name>",
	setmembercount_helpembed_fields_name: "How to use it?",
	setmembercount_helpembed_fields_value:
		"{MemberCount} = number of members in the server\n{RolesCount} = number of roles\n{BotCount} = number of bots in the server\n{ChannelCount} = number of channels in the server\n{BoostCount} = number of boosts on the server\n{VoiceCount} = total number of members in voice channel on the guild\n{OnlineCount} = total online members in the guild",
	setmembercount_logs_embed_title_on_enable: "Set MemberCount Logs",
	setmembercount_logs_embed_description_on_enable:
		"<@${authorId}> set the MemberCount of <#${channelId}> to `${messagei}`!",
	setmembercount_command_work_on_enable:
		"${emoji_Yes} | Successfully set MemberCount.",
	setmembercount_command_work_on_disable:
		"${emoji_Yes} | Successfully removed MemberCount.",
	setmembercount_logs_embed_title_on_disable: "Set MemberCount Logs",
	setmembercount_logs_embed_description_on_disable:
		"<@${authorId}> removed the MemberCount of this guild!",

	// Music commands
	// /p, /loop, /nowplaying, /pause, /resume, /skip, /stop, /queue, /shuffle

	music_cannot:
		"${emoji_No} You need to be in the same voice channel as me to use this command!",

	// /p
	p_not_in_voice_channel:
		"You must be connected to a voice channel to use this command!",
	p_embed_title: "No results",
	p_not_allowed:
		"The link you sent is not supported by this bot. Please use authorized music streaming services such as Deezer, Spotify, Soundcloud, etc.",
	p_attachment_too_large:
		"${emoji_No} The attached file exceeds the 10MB limit and cannot be read.",

	// /loop
	loop_no_queue: "There is no queue!",
	loop_command_work: "{mode} | Updated loop mode",

	// /nowplaying
	nowplaying_no_queue: "There is nothing playing",
	nowplaying_message_embed_title: "Now playing",
	nowplaying_resume_button: "${author} **resumed** the music!",
	nowplaying_pause_button: "${author} **paused** the music!",
	nowplaying_lyrics_button: "The lyrics for this song were not found",
	nowplaying_stop_buttom: "${author} **stopped** the music!",
	nowplaying_header: "Now playing in ${channel}",
	nowplaying_requested_by: "Requested by ${user}",
	nowplaying_paused: "Paused",
	nowplaying_live: "Live stream",
	nowplaying_volume: "Volume ${volume}%",
	nowplaying_loop_off: "Loop off",
	nowplaying_loop_track: "Looping track",
	nowplaying_loop_queue: "Looping queue",
	nowplaying_queue_count: "${count} in queue",
	nowplaying_up_next: "Up next: ${track}",
	nowplaying_queue_end: "Last track of the queue",
	nowplaying_ended: "This track is no longer playing.",
	nowplaying_button_pause: "Pause",
	nowplaying_button_resume: "Resume",
	nowplaying_button_skip: "Skip",
	nowplaying_button_stop: "Stop",
	nowplaying_button_lyrics: "Lyrics",
	nowplaying_button_open: "Open",
	nowplaying_skip_button: "${author} **skipped** the track!",
	nowplaying_loop_button: "${author} changed the loop mode: **${mode}**",

	// /pause
	pause_no_queue: "${emoji_Warning_Icon} - You're not in a voice channel!",
	pause_nothing_playing: "There is nothing playing",
	pause_var_paused: "paused",
	pause_var_err: "something went wrong",

	// /resume
	resume_nothing_playing: "There is nothing playing",
	resume_command_work: "resumed successfully",

	// /skip
	skip_not_in_voice_channel:
		"${emoji_Warning_Icon} - You're not in a voice channel!",
	skip_nothing_playing: "There is nothing playing",
	skip_command_work: "Skipped {queue}",

	// /stop
	stop_nothing_playing: "nothing playing",
	stop_command_work: "Queue stopped",

	// /queue
	queue_iam_not_voicec: "I am not in a voice channel",
	queue_no_queue: "There is no queue",
	queue_title: "Queue",
	queue_time_left: "${duration} left",
	queue_now_playing: "Now playing",
	queue_up_next: "Up next",
	queue_page: "Page ${page}/${pages}",
	queue_button_shuffle: "Shuffle",
	queue_button_refresh: "Refresh",
	queue_jump_placeholder: "Skip to a track…",
	queue_shuffled: "${author} **shuffled** the queue!",
	queue_jumped: "${author} skipped to ${track}!",

	// /shuffle
	shuffle_no_queue: "I am not in a voice channel",
	shuffle_no_enought:
		"There aren't **enough tracks** in queue to **shuffle**",
	shuffle_command_work: "I have **shuffled** the queue",

	// /music history
	history_no_entries: "There are no entries in the music history.",
	history_title: "Recently played on ${guild}",
	history_summary:
		"${count} tracks, ${duration} of music over the last 30 days",
	history_top_artist: "Most played artist: **${artist}** (${count} plays)",
	history_top_listener: "Most requests: ${user} (${count})",
	history_legacy_note: "Recorded before track details were kept:",
	history_page: "Page ${page} of ${pages}",
	history_kept: "Kept for 30 days",
	history_button_previous: "Previous",
	history_button_next: "Next",
	history_button_export: "Export",
	history_button_clear: "Clear",
	history_clear_confirm:
		"${emoji} Clear the whole music history of this server? This can't be undone.",
	history_button_confirm_clear: "Clear history",
	history_button_cancel: "Cancel",
	history_cleared: "${emoji} The music history of this server is cleared.",
	history_clear_forbidden:
		"${emoji} You need the Manage Server permission to clear the history.",
	history_not_yours:
		"${emoji} These buttons belong to whoever opened this history. Run /music history to get your own.",
	history_export_ready: "${emoji} The full history, newest first:",

	// /music lyrics
	lyrics_embed_title_unknown: "Unknown title",
	lyrics_embed_author_name_unknown: "Unknown author",
	lyrics_not_found: "No lyrics found",

	// /music clear-queue
	clear_queue_command_ok:
		"${emoji_Security} | The music queue in this discord has been cleared.",

	// /music trackinfo
	music_lyrics: "Lyrics",

	// /music volume
	music_volume_command_ok: "${emoji_Yes} **volume set to** `${query}`%",

	// /music apo
	music_apo_download_failed:
		"${emoji_No} | The file could not be downloaded, try again.",
	music_apo_no_node: "${emoji_No} | No audio node is connected right now.",
	music_apo_unsupported:
		"${emoji_No} | This audio node does not support APO filters (it needs Wavyzon with the `apo` plugin).",
	music_apo_invalid:
		"${emoji_No} | The audio node refused this configuration: `${error}`",
	music_apo_warnings: "Skipped lines (${count}):",

	// Giveaway commands
	// /end, /start, /reroll

	// /end
	end_not_admin:
		"You must have permissions to manage messages to end this giveaway.",
	end_not_find_giveaway: "Could not find a giveaway for `${gw}`.",
	end_confirmation_message:
		"The giveaway will end in less than (${timeEstimate}) seconds...",
	end_logs_embed_title: "Giveaway Logs",
	end_logs_embed_description:
		"<@${authorId}> ended giveaways with this ID: ${messageId}",
	end_command_error: "This giveaway is already finished!",

	// /start
	start_not_perm:
		"You must have permissions to manage messages to start the giveaways.",
	start_is_not_valid: "You must specify a valid number of winners!",
	start_confirmation_command: "Giveaway started in ${giveawayChannel}!",
	start_logs_embed_title: "Giveaway Logs",
	start_logs_embed_description:
		"<@${authorId}> started a giveaway in: ${giveawayChannel}",
	start_time_not_valid:
		"${author}, the giveaway duration you specified is invalid, please try again!",
	start_invalid_invites_req_value:
		"${emoji_No} | The value for 'invites' is invalid! You must specify a number of invites to enter the giveaway!",
	start_invalid_messages_req_value:
		"${emoji_No} | The value for 'messages' is invalid! You must specify a number of messages to enter the giveaway!",
	start_invalid_roles_req_value:
		"${emoji_No} | The role for 'roles' is not found! You must provide a role ID to enter the giveaway!",

	// /reroll
	reroll_not_perm:
		"You must have permissions to manage messages to end this giveaway.",
	reroll_dont_find_giveaway: "Could not find a giveaway for `{args}`.",
	reroll_command_work: "Giveaway relaunched!",
	reroll_logs_embed_title: "Giveaways Logs",
	reroll_logs_embed_description:
		"<@${authorId}> rerolled giveaways with this ID: ${messageId}",
	reroll_command_error: "Error!",
	reroll_giveaway_not_over: "This giveaway is not over!",

	// /get-all
	gw_getall_embed_title: "Giveaway(s) List for ${guildName}",
	gw_getall_embed_fields:
		"${Channel} [See Here](${MessageURL}) \n**Expires In** ${ExpireIn}",

	// /get-data
	gw_getdata_embed_title: "Giveaway Info!",
	gw_getdata_embed_fields_channel: "Channel",
	gw_getdata_embed_fields_amountWinner: "Winners Amount",
	gw_getdata_embed_fields_value_amountWinner: "`${winnerCount}` winner(s)",
	gw_getdata_embed_fields_prize: "Prize",
	gw_getdata_embed_fields_value_prize: "`${prize}`",
	gw_getdata_embed_fields_hostedBy: "Hosted by",
	gw_getdata_embed_fields_isEnded: "Ended?",
	gw_getdata_embed_fields_isValid: "Is Valid?",
	gw_getdata_embed_fields_time: "End at",
	gw_getdata_embed_fields_entriesAmount: "Entries Amount",
	gw_getdata_embed_fields_winners: "Winner(s)",
	gw_getdata_embed_fields_value_entriesAmount:
		"**${entries}** (use `/gw list-entries giveaway-id:${giveawayId}` for more info)",
	gw_getdata_yes: "`Yes`",
	gw_getdata_no: "`No`",
	gw_doesnt_exit: "The giveaway is unreachable, or doesn't exist.",

	// /go
	gw_go_panel_title: "Giveaway Panel",
	gw_go_panel_desc:
		"Prepare your giveaway below, then launch it. Use the menus to edit each setting.",
	gw_go_select_placeholder: "Edit a setting",
	gw_go_opt_prize: "Prize",
	gw_go_opt_duration: "Duration",
	gw_go_opt_winners: "Winners",
	gw_go_opt_requirement: "Entry requirement",
	gw_go_opt_image: "Preview image",
	gw_go_channel_placeholder: "Giveaway channel",
	gw_go_launch_buttontitle: "Launch",
	gw_go_cancel_buttontitle: "Cancel",
	gw_go_req_none: "None",
	gw_go_req_invites: "Invites",
	gw_go_req_messages: "Messages",
	gw_go_req_roles: "Roles",
	gw_go_req_value_dsc: "Require value: **${value}**",
	gw_go_started: "The giveaway has been started in ${channel}!",
	gw_go_cancelled: "Panel closed, nothing has been launched.",
	gw_go_expired: "The panel expired before the giveaway was launched.",
	gw_go_need_prize:
		"${emoji_No} | You must set a prize before launching the giveaway!",
	gw_go_need_duration:
		"${emoji_No} | You must set a valid duration before launching the giveaway!",
	gw_go_need_winners:
		"${emoji_No} | You must set a valid winners count before launching the giveaway!",
	gw_go_channel_error: "${emoji_No} | The selected channel is not sendable!",
	gw_go_invalid_image: "${emoji_No} | This image URL is not valid!",
	gw_go_modal_prize: "Set the prize",
	gw_go_modal_prize_label: "Prize",
	gw_go_modal_duration: "Set the duration",
	gw_go_modal_duration_label: "Duration (for example: 2d or 12h30)",
	gw_go_modal_winners: "Set the winners count",
	gw_go_modal_winners_label: "Number of winners",
	gw_go_modal_req_title: "Entry requirement",
	gw_go_modal_req_type_label: "Requirement type",
	gw_go_modal_req_value_label: "Requirement value (role ID or number)",
	gw_go_modal_image: "Set the preview image",
	gw_go_modal_image_label: "Image URL",

	// Moderation commands
	// /ban, /kick, /clear, /lock, /unlock, /avatar, /lockall,
	// /unban, /tempmute, /unmute

	// /avatar

	// /ban
	ban_not_permission:
		"${emoji_No} | You don't have permission to ban members.",
	ban_dont_found_member: "🔍 | Cannot find this member",
	ban_dont_have_perm_myself:
		"${emoji_No} | I don't have permission to ban members!",
	ban_try_to_ban_yourself: "${emoji_No} | You cannot ban yourself!",
	ban_attempt_ban_higter_member:
		"${emoji_Stop} You cannot ban a user who has a higher role than you...",
	ban_cant_ban_member: "${emoji_No} | I cannot ban that member",
	ban_message_to_the_banned_member:
		"You have been banned from this server: `${guildName}` for the reason: **`${reason}`**",
	ban_command_work: "<@${memberId}> banned by <@${authorId}>",
	ban_logs_embed_title: "Ban Logs",
	ban_logs_embed_description: "<@${memberId}> banned by <@${authorId}>",

	// /kick
	kick_not_permission:
		"${emoji_No} | You don't have permission to kick members.",
	kick_dont_have_permission:
		"${emoji_No} | I don't have permission to kick members!",
	kick_attempt_kick_your_self: "${emoji_No} | You cannot kick yourself!",
	kick_attempt_kick_higter_member:
		"${emoji_Stop} You cannot kick a user who has a higher role than you...",
	kick_message_to_the_banned_member:
		"You have been kicked from this server: **${guildName}** by `${authorUsername}`",
	kick_command_work: "${member} kicked by ${author}",
	kick_logs_embed_title: "Kick Logs",
	kick_logs_embed_description: "${member} kicked by <@${authorId}>",

	// /clear
	clear_dont_have_permission:
		"${emoji_No} | You don't have permission `MANAGE_MESSAGES`.",
	clear_max_message_limit:
		"${emoji_No} | I can't delete more than 99 messages at one time!",
	clear_channel_message_deleted: "${messageCount} messages deleted!",
	clear_confirmation_message: "${messageCount} messages have been deleted!",
	clear_logs_embed_title: "Clear Message Logs",
	clear_logs_embed_description:
		"<@${authorId}> cleared ${messageCount} messages in <#${channelId}>",
	clear_command_no_message: "No messages to delete in this channel",

	// /lock
	lock_embed_message_description:
		"The channel has been locked by <@${authorId}>.",
	lock_dont_have_permission:
		"${emoji_No} | You don't have permission to lock channels.",
	lock_logs_embed_title: "Lock Logs",
	lock_logs_embed_description: "<@${authorId}> locked <#${channelId}>",

	// /unlock
	unlock_embed_message_description:
		"The channel has been successfully unlocked!",
	unlock_dont_have_permission:
		"${emoji_No} | You don't have permission to unlock channels.",
	unlock_logs_embed_title: "Unlock Logs",
	unlock_logs_embed_description: "<@${authorId}> unlocked <#${channelId}>",

	// /lockall
	lockall_dont_have_permission:
		"${emoji_No} | You don't have permission to lock all channels.",
	lockall_embed_message_description:
		"All channels have been locked by <@${authorId}>.",
	lockall_logs_embed_title: "Lockall Logs",
	lockall_logs_embed_description: "<@${authorId}> locked all channels!",

	// /unlockall
	unlockall_embed_message_description:
		"All channels have been unlocked by <@${authorId}>.",
	unlockall_logs_embed_title: "Unlockall Logs",
	unlockall_logs_embed_description: "<@${authorId}> unlocked all channels!",

	// /unban
	unban_dont_have_permission:
		"${emoji_No} | You don't have permission to unban members.",
	unban_bot_dont_have_permission: "${emoji_No} | I don't have permission.",
	unban_there_is_nobody_banned:
		"${emoji_No} | **There is nobody banned from this server!**",
	unban_the_member_is_not_banned:
		"${emoji_No} | **The ID stated is not banned from this server**!",
	unban_is_now_unbanned: "<@${userID}> is now unbanned from this server!",
	unban_logs_embed_title: "Unban Logs",
	unban_logs_embed_description:
		"<@${userID}> is now unbanned from the server by <@${authorId}>!",
	unban_reason: "No reason was provided.",

	// /tempmute
	tempmute_dont_have_permission:
		"${emoji_No} | You don't have permission to tempmute members.",
	tempmute_i_dont_have_permission: "${emoji_No} | I don't have permission.",
	tempmute_cannot_mute_yourself: "${emoji_No} | You cannot mute yourself!",
	tempmute_already_muted: "This user is already muted!",
	tempmute_command_work:
		"<@${tomuteId}> has been muted for ${duration}\n**Reason**: `${reason}`",
	tempmute_unmuted_by_time: "<@${tomuteId}> has been unmuted!",
	tempmute_logs_embed_title: "Tempmute Logs",
	tempmute_logs_embed_description:
		"<@${authorId}> muted <@${tomuteId}> for ${duration}\n**Reason**: `${reason}`",
	tempmute_reason_create_roles: "Create tempmute muted role!",
	tempmute_tomute_is_admin:
		"${emoji_No} | The user has administrator permissions, I cannot mute them.",
	tempmute_tomute_highest_role_or_same:
		"${emoji_No} | **My role on this server is lower or equal to ${tomute}. I cannot moderate this member.**",
	tempmute_cannot_mute_higher_role:
		"${emoji_No} | **${tomute}'s role is higher than or equal to yours. You cannot timeout this member.**",
	tempmute_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} Discord has a limit of 28 days for a mute. I have applied 28 days.",

	// /temprole
	temprole_dont_have_permission:
		"${emoji_No} | You don't have permission to add temporary roles to members.",
	temprole_i_dont_have_permission: "${emoji_No} | I don't have permission.",
	temprole_cannot_add_yourself:
		"${emoji_No} | You cannot add a temporary role to yourself!",
	temprole_already_has_role: "This user already has this temporary role!",
	temprole_command_work:
		"<@${tomuteId}> has been given the role for ${duration}\n**Reason**: `${reason}`",
	temprole_removed_by_time: "<@${tomuteId}> temporary role has been removed!",
	temprole_logs_embed_title: "Temprole Logs",
	temprole_logs_embed_description:
		"<@${authorId}> added temporary role to <@${tomuteId}> for ${duration}\n**Reason**: `${reason}`",
	temprole_tomute_is_admin:
		"${emoji_No} | The user has administrator permissions, I cannot add a temporary role to them.",
	temprole_tomute_highest_role_or_same:
		"${emoji_No} | **My role on this server is lower or equal to ${tomute}. I cannot moderate this member.**",
	temprole_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} The maximum time for a temporary role is 1 year. I have applied 1 year.",

	// /unmute
	unmute_dont_have_permission:
		"${emoji_No} | You don't have permission to tempmute members.",
	unmute_attempt_mute_your_self: "${emoji_No} | You cannot mute yourself!",
	unmute_i_dont_have_permission: "${emoji_No} | I don't have permission.",
	unmute_not_muted: "This user is not muted!",
	unmute_muted_role_doesnt_exist:
		"The `muted` role does not exist. Please mute a user first so that the muted role gets created...",
	unmute_command_work: "<@${tomuteId}> has been unmuted!",
	unmute_logs_embed_title: "Unmute Logs",
	unmute_logs_embed_description: "<@${authorId}> unmuted <@${tomuteId}>",
	unmuteall_no_muted_members: "No muted members were found.",
	unmuteall_audit_reason: "Unmute all",
	unmuteall_command_work: "${unmuted}/${total} members have been unmuted.",
	unmuteall_logs_embed_title: "Unmute All Logs",
	unmuteall_logs_embed_description:
		"<@${authorId}> unmuted ${unmuted}/${total} members.",

	// /warn
	warn_command_work:
		"${emoji_Yes} ${member} has been warned! **Reason**: `${reason}`\n__Warn ID__: `${warnId}`",
	warn_logEmbed_title: "Warn Logs",
	warn_logEmbed_desc: "${author} has warned ${member} for `${reason}`",
	warn_dont_have_permission:
		"${emoji_No} | You don't have permission to warn a member in this Discord server.",

	// /unwarn
	unwarn_cannot_found:
		"${emoji_No} ${member} seems to not have any warns in my database!",
	unwarn_cannot_found_id:
		"${emoji_No} ${member}, the warn ID you have provided is not in my database",
	unwarn_logEmbed_title: "UnWarn Logs",
	unwarn_logEmbed_desc: "${author} has unwarned ${member}",
	unwarn_dont_have_permission:
		"${emoji_No} | You don't have permission to remove a warning from a member in this Discord server.",

	// /warnlist
	warnlist_no_data:
		"${emoji_No} ${member} seems to not have any warns in my database!",
	warnlist_dont_have_permission:
		"${emoji_No} | You don't have permission to manage member warnings in this Discord server.",

	// /clear-allwarns
	clear_allwarns_confirmation_message:
		"**Are you really sure you want to delete all warns data?\nThis action is permanent and you cannot undo it.**\n**This action is destructive!!**",
	clear_allwarns_command_ok:
		"All the warns in this Discord server have been deleted.",

	// /baninfo
	baninfo_not_banned: "User is not banned",
	baninfo_user_not_found: "User not found",
	var_banned_by: "Banned by",
	var_ban_date: "Ban date",

	// /clearwarn
	clearwarn_command_ok:
		"${emoji_Yes} ${author}, **`${allWarnCount}`** warn(s) of ${member} have been cleared.",

	// /tempban
	tempban_dont_have_permission:
		"You don't have permission to temporarily ban members.",
	tempban_i_dont_have_permission: "I don't have permission to ban members.",
	tempban_cannot_ban_yourself: "You cannot ban yourself!",
	tempban_already_banned: "This user is already temporarily banned!",
	tempban_command_work:
		"**<@${userId}>** has been temporarily banned for **${duration}**\n**Reason**: `${reason}`",
	tempban_unbanned_by_time: "**<@${userId}>** has been unbanned!",
	tempban_logs_embed_title: "Tempban Logs",
	tempban_logs_embed_description:
		"**<@${executorId}>** temporarily banned **<@${userId}>** for **${duration}**\n**Reason**: `${reason}`",
	tempban_user_is_admin:
		"The user has administrator permissions, I cannot ban them.",
	tempban_user_highest_role_or_same:
		"My role on this server is lower or equal to **user_mention**. I cannot moderate this member.",
	tempban_max_time_passed:
		"\n*The maximum time for a temporary ban is 1 year. I have applied 1 year.*",
	tempban_user_not_in_guild:
		"This user is not in the server but can still be banned.",

	// Backup commands
	// /backup

	// /backup
	backup_wait_please: "⏲ Wait please...",
	backup_not_admin:
		":x: | You must be an administrator of this server to request a backup!",
	backup_i_dont_have_permission: "I don't have permission `ADMINISTRATOR`",
	backup_command_work_on_creation:
		":white_check_mark: Backup successfully created.",
	backup_command_work_info_on_creation:
		"The backup has been created! ID: `${id}`!",
	backup_logs_embed_title_on_creation: "Backup Logs",
	backup_logs_embed_description_on_creation:
		"<@${authorId}> created a backup!",
	backup_dont_have_perm_on_load:
		":x: | You must be an administrator of this server to load a backup!",
	backup_i_dont_have_perm_on_load: "I don't have permission `ADMINISTRATOR`",
	backup_unvalid_id_on_load: ":x: | You must specify a valid backup ID!",
	backup_waiting_on_load: "${emoji_Yes} - Loading...",
	backup_error_on_load:
		":x: | Sorry, an error occurred... Please check that I have administrator permissions!",
	backup_error_when_fetch_backup_on_load:
		":x: | No backup found for ${backupID}!",
	backup_this_is_not_your_backup: "${emoji_No} | This is not your backup!",
	backup_backup_doesnt_exist: "Error: this backup doesn't exist.",
	backup_string_see_v:
		":placard:・Categories Count: `${categoryCount}`\n:hash:・Channels Count: `${channelCount}`",
	backup_all_of_your_backup: "**All of your backups:**",
	backup_string_see_another_v:
		":placard:・Categories Count: `${categoryCount}`\n:hash:・Channels Count: `${channelCount}`",
	backup_load_confirm:
		"${author},\n# EXTREMELY DANGEROUS ACTION\n# Are you sure you want to load this backup?\nThis will replace all current channels, roles, emojis, bans, configuration... of your server.\nTHIS ACTION IS IRREVERSIBLE!",
	backup_not_load:
		"The backup was not loaded, the action was canceled at your request.",

	// /backup delete
	backup_really_want:
		"${emoji_Warning_Icon} Do you really want to delete this backup?",
	backup_confirm_button: "Yes, delete this backup",
	backup_cancel_button: "Cancel Action",
	backup_embed_title_succefully_deleted:
		"${emoji_Yes} The backup was successfully deleted!",
	backup_embed_title_cancel_deletion: "${emoji_Yes} The backup was kept!",
	backup_embed_title_timesup_deletion:
		"${emoji_No} Time's UP. The backup was kept!",

	// /backup manage
	backup_manage_nique_tes_mort:
		"Access denied. This command is reserved for the server owner.\n# You cannot disable backup protection to compromise the server's security.\n# Any abuse attempt will be reported and blocked.",
	backup_manage_admin: "all administrators",
	backup_manage_owner: "server owner",
	backup_manage_command_ok:
		"The backup module has been updated. From now on, ${allowed_user_string} can perform backup creation/loading on this server.",
	// /backup panels
	backup_component_settings: "Server settings",
	backup_component_settings_desc: "Name, images, levels, system channels, welcome screen",
	backup_component_roles: "Roles",
	backup_component_roles_desc: "Order, colors, icons and permissions",
	backup_component_channels: "Channels",
	backup_component_channels_desc: "Categories, text, voice, forums and threads",
	backup_component_permissions: "Channel permissions",
	backup_component_permissions_desc: "Role and member overrides on each channel",
	backup_component_emojis: "Emojis",
	backup_component_emojis_desc: "Every custom emoji of the server",
	backup_component_stickers: "Stickers",
	backup_component_stickers_desc: "Static and animated server stickers",
	backup_component_bans: "Bans",
	backup_component_bans_desc: "Banned users and the reasons",
	backup_component_automod: "AutoMod rules",
	backup_component_automod_desc: "Discord's native moderation rules",
	backup_component_events: "Events",
	backup_component_events_desc: "Scheduled server events",
	backup_component_messages: "Messages",
	backup_component_messages_desc: "The last 100 messages of each channel",
	backup_component_members: "Members",
	backup_component_members_desc: "Nicknames and roles of current members",
	backup_select_placeholder: "Choose what to include",
	backup_usage: "${count}/${max} backups used",
	backup_limit_reached: "You have reached the limit of **${max} backups**. Delete one with `/backup delete` first.",
	backup_busy: "A backup operation is already running, try again in a moment.",
	backup_panel_expired: "This panel has expired, run the command again.",
	backup_btn_create: "Create the backup",
	backup_btn_all: "Select everything",
	backup_btn_load: "Wipe and restore",
	backup_btn_schedule_save: "Save the schedule",
	backup_btn_schedule_disable: "Turn off",
	backup_create_title: "New backup",
	backup_create_desc: "Choose what to save from **${guildName}**.",
	backup_create_progress: "${emoji} Creating the backup, this can take a while...",
	backup_create_cancelled: "Backup cancelled.",
	backup_create_failed: "The backup could not be saved. Nothing was added to your list.",
	backup_created_title: "Backup created",
	backup_created_desc: "Your backup ID is `${id}`. Use it with `/backup load`.",
	backup_created_partial: "**Could not be saved, so it will not be restored:** ${parts}",
	backup_load_title: "Restore a backup",
	backup_load_desc: "Backup of **${guildName}**, made on ${date}.",
	backup_load_warning: "**This cannot be undone.** Everything selected is deleted from this server, then restored. Roles are matched by name and updated, so members keep them; roles missing from the backup are removed only when channels are restored too.",
	backup_load_progress: "${emoji} Restoring, this can take several minutes...",
	backup_load_done_title: "Backup restored",
	backup_load_done_desc: "**${guildName}** has been restored.",
	backup_load_report_line: "${emoji} **${label}**: ${okCount} restored",
	backup_load_report_failed: "(${failedCount} failed)",
	backup_list_title: "Your backups",
	backup_list_empty: "You have no backup yet. Create one with `/backup create`.",
	backup_list_entry: "**${guildName}** · ${mode} · ${date}\n`${id}`\n${categoryCount} categories, ${channelCount} channels",
	backup_list_manual: "Manual",
	backup_list_auto: "Automatic",
	backup_delete_title: "Delete this backup?",
	backup_delete_desc: "**${guildName}** `${id}`\n${categoryCount} categories, ${channelCount} channels",
	backup_delete_done: "The backup was deleted.",
	backup_delete_cancelled: "The backup was kept.",
	backup_schedule_title: "Automatic backups",
	backup_schedule_desc: "They are saved to your account and count toward your limit. Only the latest ${maxAuto} automatic backups of this server are kept.",
	backup_schedule_owner_only: "Only the server owner can schedule automatic backups.",
	backup_schedule_status_on: "Active: **${frequency}**, next backup ${next}",
	backup_schedule_status_off: "No automatic backup is scheduled.",
	backup_schedule_frequency_placeholder: "Choose how often",
	backup_frequency_1d: "Every day",
	backup_frequency_3d: "Every 3 days",
	backup_frequency_1w: "Every week",
	backup_frequency_2w: "Every 2 weeks",
	backup_frequency_1m: "Every month",
	backup_frequency_3m: "Every 3 months",
	backup_frequency_6m: "Every 6 months",
	backup_frequency_12m: "Every year",
	backup_schedule_dm_limit: "The automatic backup of **${guildName}** was skipped: you have reached the limit of ${max} backups. Delete one with `/backup delete`.",
	backup_schedule_dm_failed: "The automatic backup of **${guildName}** failed. It will be tried again at the next scheduled time.",

	// Role Reactions
	// /reactionroles

	// /reactionroles
	reactionroles_dont_admin_added:
		":x: | You must be an administrator of this server to request this command!",
	reactionroles_embed_message_description_added:
		"__How to use?__\n/rolesreaction add `<message id>` `<reaction>` `<rolesid>`\n/rolesreaction remove `<message id>` `<reaction>`\n/rolesreaction list `<message id>`",
	reactionroles_missing_reaction_added: "Missing argument: Reaction's Emoji",
	reactionroles_invalid_emote_format_added:
		"${emoji_No} | You can't send me a `CUSTOM_EMOJI` in format `<::xxx>`! I only need its ID!",
	reactionroles_logs_embed_title_added: "ReactionRoles Logs",
	reactionroles_logs_embed_description_added:
		"<@${authorId}> set a reaction role: Message: `${messagei}` | Reaction: `${reaction}` | Role: ${role}",
	reactionroles_command_work_added:
		"${reaction} has been added to message ${messagei} to give ${role}",
	reactionroles_missing_remove: "Missing argument: Reaction's Emoji",
	reactionroles_missing_reaction_remove:
		"Reaction Roles were not found in my database...",
	reactionroles_cant_fetched_reaction_remove:
		"Can't fetch targeted reaction on this message!",
	reactionroles_logs_embed_title_remove: "ReactionRoles Logs",
	reactionroles_logs_embed_description_remove:
		"<@${authorId}> deleted a reaction role: Message: `${messagei}` | Reaction: `${reaction}`",
	reactionroles_command_work_remove:
		"${reaction} has been deleted from message ${messagei}",
	reactionroles_dont_message_found:
		"I can't retrieve the message with your current message ID, or the emoji you selected is not on a server where I am!",

	// /buttonreaction
	buttonreaction_logs_embed_title_added: "ButtonReaction Logs",
	buttonreaction_logs_embed_description_added:
		"<@${authorId}> set a reaction with button: Message: `${messagei}` | Reaction: `${reaction}` | Role: ${role}",
	buttonreaction_dont_message_found:
		"Can't add this button, the roles seem to be already set in one of the existing buttons!",
	buttonreaction_roles_not_found:
		"Missing arguments: You haven't specified the roles to set!",
	buttonreaction_message_other_user_error:
		"I can't modify the components of another user's message. You need to choose a message sent by myself. Tip: Do `/utils embed` to create your own beautiful embed!",

	// /roleselect
	roleselect_invalid_message_id:
		"Invalid message ID provided. Please provide a valid message ID.",
	roleselect_message_not_found: "Message not found in the specified channel.",
	roleselect_default_placeholder: "Select configured roles",
	roleselect_menu1_placeholder: "Choose an action",
	roleselect_menu1_add: "Add Role Option",
	roleselect_menu1_remove: "Remove Role Option",
	roleselect_menu1_change_placeholder: "Change Select Menu Placeholder",
	roleselect_menu1_save: "Save and Apply Configuration",
	roleselect_menu1_cancel: "Cancel",
	roleselect_menu1_embed_title: "RoleSelect Configuration",
	roleselect_menu1_embed_description:
		"When the user selects fields in the select menu, they will get the specified set role",
	roleselect_modal1_title: "Add Role Option",
	roleselect_modal1_fields1_label: "Emoji",
	roleselect_modal1_fields1_placeholder:
		"Select an emoji for this role option (optional)",
	roleselect_modal1_fields2_label: "Option Title",
	roleselect_modal1_fields2_placeholder: "Short title for the role option",
	roleselect_modal1_fields3_label: "Description",
	roleselect_modal1_fields3_placeholder:
		"Describe the role option (optional)",
	roleselect_awaiting1_msg: "Select a role for this option",
	roleselect_awaiting1_menu_placeholder: "Choose a role",
	roleselect_role_already_exist: "Role already exists in the configuration.",
	roleselect_no_role_found: "No role options to remove.",
	roleselect_all_role_removed: "All role options have been removed.",
	roleselect_last_role_removed: "Last role option removed successfully.",
	roleselect_save_command_ok:
		"Role selection configuration saved successfully!",
	roleselect_failed_to_save_config:
		"Failed to save configuration. Please try again.",
	roleselect_canceled_command_ok: "Role selection configuration canceled.",
	roleselect_modal2_title: "Select Menu Placeholder",
	roleselect_modal2_label: "Placeholder",
	roleselect_modal2_placeholder: "Select menu placeholder",

	// New feature commands
	// /punishpub, /report, /support

	// /punishpub
	punishpub_not_admin:
		":x: | You must be an administrator of this server to request this command!",
	punishpub_too_hight_enable: "The amount is too high! It's not recommended!",
	punishpub_negative_number_enable: "You can't enter a negative number!",
	punishpub_zero_number_enable: "The number 0 is not possible!",
	punishpub_confirmation_message_enable:
		"You have successfully **enabled** PunishPub with a maximum flag count of **${amount}** and the following punishment: **${punishement}**!",
	punishpub_logs_embed_title: "PunishPub Logs",
	punishpub_logs_embed_description:
		"<@${authorId}> set the PunishPUB to on with an amount of ${amount} max flags with ${punishement} punishment!",
	punishpub_confirmation_disable:
		"You have successfully switched the PunishPub to off",
	punishpub_logs_embed_title_disable: "PunishPub Logs",
	punishpub_logs_embed_description_disable:
		"<@${authorId}> set the PunishPUB to off!",

	// /report
	report_cooldown_command:
		"Sorry, you must wait **${time}** before running this command!",
	report_owner_need:
		":x: | **You must be the owner of the server to be able to run this command!**",
	report_specify:
		"Please specify the bug. Please make good and full sentences!",
	report_command_work: "**Thanks for submitting a bug!**",

	// /support
	support_not_admin:
		":x: | You must be an administrator of this server to use these commands!",
	support_command_work:
		"You have set up the support module for **${guildName}**.\nWhen users have this in their bio:\n**${input}**.\nI should give the <@&${rolesId}> role to them!",
	support_command_work_on_disable:
		"You have set up the support module for **${guildName}**.\nNobody will receive a role now!",
	support_command_not_role: ":x: | You have not specified the role!",
	support_command_not_type:
		":x: | You did not specify the type of support you want in the user profile (bio = the bio, e.g. server link; tag = the server’s Discord tag)!",
	support_command_guild_not_have_tag:
		":x: | The server currently has no tags.",
	support_command_work_2:
		"You have configured the support module for ${guildName}.\nWhen a user sets the server tag,\nI will give them the role <@&${rolesId}>!",

	// /setserverlang

	updates_embed_title: "iHorizon Updates",
	updates_embed_description:
		"Here are the latest changes and updates for iHorizon.",
	updates_field_version: "Version",
	updates_field_commit: "Latest Commit",
	updates_field_branch: "Branch",
	updates_field_links: "Links",
	updates_changelog_attached: "The full changelog is attached as PDF.",
	newsletter_dm_title: "iHorizon {version} - Release Notes",
	newsletter_dm_body:
		"Hello {owner},\n\nA new major version of iHorizon has been deployed.\n\n**Version**: {version}\n**Release**: {releaseUrl}\n\nYou can find the full changelog attached as PDF.\n\nNeed help? Join our support server: https://discord.gg/ihorizon\n-# Use +updates to manage your subscription or the button below to unsubscribe.",
	newsletter_btn_unsubscribe: "Unsubscribe from newsletter",
	newsletter_btn_subscribe: "Subscribe to newsletter",
	newsletter_not_owner:
		"Ahah, glad to know you care enough to want my code changes in real-time :3\n\n**But hey, you need to add me to a Discord server first:**\n\n<https://discord.com/oauth2/authorize?client_id=${clientId}>\n**I will keep you posted on the news that way.**\n\n> Another alternative: you can join discord.gg/ihorizon. My founders ping with the changelog on every update. Your call :3",
	newsletter_toggle_enabled: "Newsletter notifications enabled.",
	newsletter_toggle_disabled: "Newsletter notifications disabled.",
	setserverlang_not_admin:
		":x: | You must be an administrator of this server to request this command!",
	setserverlang_logs_embed_title_on_enable: "SetServerLang Logs",
	setserverlang_logs_embed_description_on_enable:
		"<@${authorId}> set the language of iHorizon to **${type}**!",
	setserverlang_already: "I'm already on this language!",
	setserverlang_command_work_enable: "My language is now on **${type}**",
	setserverlang_panel_title: "Language Selection",
	setserverlang_panel_description:
		"Select the language you want iHorizon to use on this server.",
	setserverlang_panel_current: "Current language",
	setserverlang_panel_select: "Choose a language...",
	setserverlang_panel_saved: "The language has been successfully changed!",
	setserverlang_command_error_enable: "Error!",

	// /embed
	embed_placeholder_string_select_menu_builder: "What do you want to do?",
	embed_placeholder_option_copy_embed: "Copy an embed",
	embed_placeholder_option_edit_title: "Edit the title",
	embed_placeholder_option_delete_title: "Delete the title",
	embed_placeholder_option_edit_description: "Edit the description",
	embed_placeholder_option_delete_description: "Delete the description",
	embed_placeholder_option_edit_author: "Edit the author",
	embed_placeholde_option_change_footer_image: "Change footer icon",
	embed_placeholder_option_delete_author: "Delete the author",
	embed_placeholder_option_edit_footer: "Edit the footer",
	embed_placeholder_option_delete_footer: "Delete the footer",
	embed_placeholder_option_edit_thumbnail: "Edit the thumbnail",
	embed_placeholder_option_edit_image: "Edit the image",
	embed_placeholder_option_edit_titleurl: "Edit the title URL",
	embed_placeholder_option_edit_color: "Edit the color",
	embed_placeholder_option_delete_color: "Delete the color",
	embed_btn_save: "Save Embed",
	embed_btn_send: "Send Embed",
	embed_btn_cancel: "Cancel",
	embed_interaction_not_for_you: "This interaction is not for you",
	embed_first_message: "What do you want to do?",
	embed_save_message:
		"<@${authorId}>, **You have decided to save the Embed configuration!**```Embed ID: ${embedId}```",
	embed_cancel_message:
		"<@${authorId}>, **You have decided to abandon the Embed configuration!**",
	embed_send_message:
		"<@${authorId}>, **In which channel should I send this embed?**",
	embed_timeout_getbtn:
		"<@${authorId}>, **You took too long to respond, I'm aborting the ongoing operation!**",
	embed_choose_0: "What message do you want to include in your Embed?",
	embed_choose_1: "What title do you want to include in your Embed?",
	embed_choose_2: "The title of the Embed has been successfully deleted!",
	embed_choose_3: "What description do you want to include in your Embed?",
	embed_choose_4:
		"The description of the Embed has been successfully deleted!",
	embed_choose_5: "What author do you want to include in your Embed?",
	embed_choose_6: "The author of the Embed has been successfully deleted!",
	embed_choose_7: "What footer do you want to include in your Embed?",
	embed_choose_7bis: "What footer icon do you want to include in your embed?",
	embed_choose_8: "The footer of the Embed has been successfully deleted!",
	embed_choose_9:
		"What thumbnail image do you want to include in your Embed?",
	embed_choose_10: "What image do you want to include in your Embed?",
	embed_choose_11: "What title URL do you want to include in your Embed?",
	embed_choose_12:
		"What color do you want to include in your Embed? **www.color-hex.com**",
	embed_choose_12_error:
		"${emoji_No} | Invalid color! Please check **www.color-hex.com**",
	embed_choose_13: "The color of the Embed has been successfully deleted!",
	embed_send_embed_work:
		"<@${authorId}>, **You have successfully sent the Embed to the <#${messageContent}> channel!**",
	embed_copy_bad_guild_msg:
		"The message's guild is not the same as ${guildName}",
	embed_copy_bad_channel_msg: "The message's channel is unreachable!",
	embed_copy_bad_message_msg: "The message is unreachable!",
	embed_copy_bad_embed_message_msg: "The message doesn't have an embed!",
	embed_copy_bad_url_msg:
		"Invalid URL, please retry. The correct format is: https://discord.com/channels/${messageGuildId}/${channelId}/${id}",
	embed_btn_replace: "Replace embed",
	embed_replace_question_msg:
		"What is the new URL of the message where the embed needs to be replaced?",
	embed_replace_message:
		"{user}, the new embed has replaced the {messageUrl}'s embed",

	// /rolesaver
	rolesaver_embed_title: "RoleSaver Module",
	rolesaver_embed_desc:
		"When guild members leave the server, their roles are saved in the database. When they rejoin, iHorizon gives their roles back.",
	rolesaver_embed_fields_1_name: "Enable",
	rolesaver_embed_fields_2_name: "Restore Admin Roles",
	rolesaver_embed_fields_3_name: "Timeout",
	rolesaver_on_off_already_set: "The module is already disabled!",
	rolesaver_on_off_embed_title: "RoleSaver Module",
	rolesaver_on_off_embed_desc:
		"When guild members leave the server, their roles will not be saved in the database. Now, iHorizon no longer restores the old roles to members when they come back to the server.",
	rolesaver_on_off_embed_fields_1_name: "Enable",

	// /nigthmode
	var_nm_role_app_dont_exist:
		"${emoji_Warning_Icon} The bot does not have an application role. Please re-add the bot correctly.\n",
	var_nm_role_app_not_high:
		"${emoji_Warning_Icon} The bot's role is not the highest. Please put it at the top.\n",
	var_nm_role_app_not_admin:
		"${emoji_Warning_Icon} The bot's role does not have administrator permissions.\n",
	var_nm_end_main: "Night mode is ending.\n\n",
	var_nm_start_main: "Night mode is about to start.\n\n",
	var_nm_edited_roles: "The following roles have been modified:",
	var_nm_running: "startup",
	var_nm_stopping: "shutdown",
	var_nm_running2: "starts",
	var_nm_stopping2: "ends",
	var_nm_title: "Night Mode",
	var_nm_ping_embed_title: "Night mode ${type}",
	var_nm_ping_embed_fields_0_name: "Time Range",
	var_nm_error_occured: "# A problem occurred during night mode ${type}.\n",
	nightmode_embed_desc:
		"# ⭐️ Night Mode\n> *What is night mode?* Night mode is a security feature **[made by iHorizon](https://www.ihorizon.org)** that allows you to disable all administrator permissions on a Discord server during a given period.\n> *For example, you are on a Discord server with a lot of staff on it, you want to remove all admin permissions at night to avoid a raid, Discord vanity snipe, etc*\n> *You are in the right place my dear. **iHorizon will always be the solution.***\n\n---\n",
	nightmode_embed_fields_0_name: "Enable Module",
	nightmode_embed_fields_1_name: "Notify server owner",
	nightmode_embed_fields_2_name: "Derank bots?",
	nightmode_embed_fields_3_name: "Whitelisted bots",
	nightmode_embed_fields_4_name: "Time Range",
	nightmode_select_placeholder: "Configure night mode on the server.",
	nightmode_select_0_label: "Enable night mode",
	nightmode_select_0_desc: "Enable/Disable night mode.",
	nightmode_select_1_label: "Warn server owner",
	nightmode_select_1_desc:
		"Notify the server owner when activating/deactivating",
	nightmode_select_2_label: "Configure night mode time range",
	nightmode_select_2_desc:
		"Time range where admin permissions are automatically removed.",
	nightmode_select_3_label: "Derank bots",
	nightmode_select_3_desc: "Should bots be deranked during the night?",
	nightmode_select_4_label: "Change timezone (UTC)",
	nightmode_select_4_desc:
		"If you have a specific time, you must set it (UTC number format)",
	nightmode_select1_placeholder:
		"Bots authorized to be admin during the night",
	nightmode_change_timezone_question: "Choose UTC for your Discord server",
	nightmode_modal_hours_window_fields0_label:
		"Start Time (ex: 21:30 or 2130)",
	nightmode_modal_hours_window_fields1_label: "End Time (ex: 06:15 or 0615)",
	nightmode_modal_hours_window_title:
		"NightMode - Time Range (24h format with minutes)",
	nightmode_invalid_hour_morning:
		"${emoji_No} Start time is not valid. Use format: 21:30 or 2130",
	nightmode_invalid_hour_night:
		"${emoji_No} End time is not valid. Use format: 06:15 or 0615",
	nightmode_utc_timezone_on: "UTC timezone on",

	// /git lines
	git_lines_avoiding_spam:
		"Sorry, but to prevent spam, we limit the number of lines displayed to 50",
	git_lines_avoiding_limit:
		"Sorry but there is a 2000 character limit on Discord, so we were unable to display the desired snippet",
	git_lines_work: "✅ Git Lines is now enabled.",
	git_lines_work_disabled: "❌ Git Lines is now disabled.",
	git_lines_borred_warning:
		"\n-# ${emoji_VC_OpenChat} Am I bothering you? You can use `/git lines` to disable this module!",

	// /counter config
	counter_config_command_action_on:
		"${author}, you have set to `Power On` the Counter Module.\nIf the channel doesn't exist, configure it with the command: **/counter channel**.",
	counter_config_command_action_off:
		"${author}, you have set to `Power Off` the Counter Module.",

	// /counter channel
	counter_channel_embed_title: "Counter Module set Here!",
	counter_channel_embed_desc:
		"${author} has set the Counter module here!\nUsers can now count numbers here!",
	counter_channel_command_work:
		"${author}, you have successfully set the Counter module to the channel ${channel}!",
	counter_channel_command_error:
		"${author}, the command returned an error. Please verify the channel you specified exists, and verify the Counter Module has been enabled!",

	counter_actual_number: "✨ **Current Number:** {number}",

	// Suggestion commands
	// /setsuggest, /suggest

	// /suggest accept
	suggest_accept_not_admin: "You are not an admin!",
	suggest_acceptnot_good_channel:
		"This command needs to be run in the Suggestion Module's channel (<#${channel}>)!\nPlease verify the Suggestion Module is not disabled!",
	suggest_accept_not_found_db: "The suggestion is not found in my DB!",
	suggest_accept_already_replied:
		"This suggestion has already been replied to!",
	suggest_accept_embed_fields_to_put:
		"Response of ${authorUsername} (Accepting)",
	suggest_acceptembed_title_to_put: "[Accepting] ${title}",
	suggest_accept_command_work:
		"You have accepted the suggestion!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_accept_command_error:
		"The suggestion is not found in the Discord channel!",

	// /suggest deny
	suggest_deny_not_admin: "You are not an admin!",
	suggest_deny_not_good_channel:
		"This command needs to be run in the Suggestion Module's channel (<#${channel}>)!\nPlease verify the Suggestion Module is not disabled!",
	suggest_deny_not_found_db: "The suggestion is not found in my DB!",
	suggest_deny_already_replied:
		"This suggestion has already been replied to!",
	suggest_deny_embed_fields_to_put: "Response of ${authorUsername} (Denying)",
	suggest_deny_embed_title_to_put: "[Denying] ${title}",
	suggest_deny_command_work:
		"You denied the suggestion!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_deny_command_error:
		"The suggestion is not found in this Discord channel!",

	// /suggest reply
	suggest_reply_not_admin: "You are not an admin!",
	suggest_reply_not_good_channel:
		"This command needs to be run in the Suggestion Module's channel (<#${channel}>)!\nPlease verify the Suggestion Module is not disabled!",
	suggest_replynot_found_db: "The suggestion is not found in my DB!",
	suggest_reply_already_replied:
		"This suggestion has already been replied to!",
	suggest_reply_embed_fields_to_put: "Response of ${authorUsername}",
	suggest_reply_embed_title_to_put: "[Replied] ${title}",
	suggest_reply_command_work:
		"You have sent a response to the suggestion!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_reply_command_error:
		"The suggestion was not found in the Discord channel!",

	// /suggest delete
	suggest_delete_not_delete: "You are not an admin!",
	suggest_delete_not_good_channel:
		"This command needs to be run in the Suggestion Module's channel (<#${channel}>)!\nPlease verify the Suggestion Module is not disabled!",
	suggest_delete_not_found_db: "The suggestion is not found in my DB!",
	suggest_delete_command_work: "You have deleted the suggestion!",
	suggest_delete_command_error:
		"The suggestion is not found in this Discord channel!",

	// /setsuggest disable
	setsuggest_disable_not_admin: "You are not an admin!",
	setsuggest_disable_pw_on:
		"${author}, you have enabled the Suggestion Module!",
	setsuggest_disable_pw_off:
		"${author}, you have disabled the Suggestion Module!",

	// /setsuggest channel
	setsuggest_channel_not_admin: "You are not an admin!",
	setsuggest_channel_already_set_with_that:
		"${author}, the Suggestion Module's channel is already set in ${channel}!",
	setsuggest_channel_embed_title: "Suggestion Module has been set here!",
	setsuggest_channel_embed_desc:
		"Now, all users who are permitted to send messages here can suggest something by simply sending a message!",
	setsuggest_channel_command_work:
		"${author}, you have set the Suggestion Module's channel to ${channel}!",

	// Security Command
	// /security

	// /security disable
	security_disable_not_admin: "You are not an admin!",
	security_disable_pw_on:
		"${author}, you have turned on the Security Module!",
	security_disable_pw_off:
		"${author}, you have turned off the Security Module",

	// /security role-to-give
	security_role_to_give_not_admin: "You are not an admin!",
	security_role_to_give_command_work:
		"${author}, you have set the role to ${role} for the Security Module!",

	// /security channel
	security_channel_not_admin: "You are not admin!",
	security_channel_command_work:
		"${author}, you have set the channel to ${channel} for the Security Module!",

	// Schedule Command
	// /schedule

	// /schedule
	schedule_menu_placeholder: "What do you want to do?",
	schedule_menu_choice_0: "Create Schedule",
	schedule_menu_choice_1: "Delete Schedule",
	schedule_menu_choice_2: "Delete All Schedules",
	schedule_menu_choice_3: "List All Schedules",
	schedule_modal_title: "Schedule Manager",
	schedule_modal_fields_1_label: "The Schedule name?",
	schedule_modal_fields_2_label: "The Schedule description?",
	schedule_delete_question:
		"What is the ID of the Schedule you want to delete?",
	schedule_deleteall_question:
		"Are you sure to delete all of your schedules? (Y/n)",
	schedule_delete_not_found:
		"There are no SCHEDULES (${arg0}) for this member!",
	schedule_delete_title_embed: "Deleting a Schedule (${arg0})",
	schedule_delete_confirm: "Schedule deleted!",
	schedule_deleteall_title_embed: "Deleting all Schedules",
	schedule_deleteall_desc_embed: "All of your schedules have been deleted!",
	schedule_deleteall_confirm: "All of your schedules have been deleted!",
	schedule_deleteall_cancel: "The `DELETE_ALL` action has been cancelled!",
	schedule_list_not_schedule: "There are no SCHEDULES for this member!",
	schedule_list_title_embed: "Listing all Schedules",
	schedule_list_fields_embed:
		"**Ends at**: ${expiresAt}```${title}``````${description}```\n",
	schedule_list_content_message: "Here's your schedule list!",
	schedule_create_title_embed: "Creating a Schedule",
	schedule_create_when_question:
		"When do you want to be notified about this schedule? (Example: 6d = 6 days, 2h = 2 hours, 10m = 10 minutes, 10s = 10 seconds)",
	schedule_create_not_number_time:
		"${author}, your response (the time you want to be notified about this schedule) is not a number!",
	schedule_create_embed_fields_name_confirm: "Notified Date",
	schedule_create_embed_title_confirm: "#${scheduleCode} Schedule Created!",
	schedule_create_confirm_msg:
		"${author}, your schedule has been created!\nCode: `${scheduleCode}`",

	// PFPS Command
	// /pfps channel, /pfps config

	// /pfps config
	pfps_config_not_admin:
		":x: You don't have Administrator Permissions to execute this command",
	pfps_config_command_action_on:
		"${author}, you have set to `Power On` the PFPS Module.\nIf the channel doesn't exist, configure it with the command: **/pfps channel**.",
	pfps_config_command_action_off:
		"${author}, you have set to `Power Off` the PFPS Module.",

	// /pfps channel
	pfps_channel_not_admin:
		":x: You don't have Administrator Permissions to execute this command",
	pfps_channel_embed_title: "PFPS Module set Here!",
	pfps_channel_embed_desc:
		"${author} has set the PFPS module here!\nNow every 30 seconds, iHorizon sends a random user avatar in this guild!\nI will try to do my best!",
	pfps_channel_command_work:
		"${author}, you have successfully set the PFPS module to the channel ${channel}!",
	pfps_channel_command_error:
		"${author}, the command returned an error. Please verify the channel you specified exists, and verify the PFPS Module has been enabled!",

	// Protection Module
	// /protect, /allowlist add, /allowlist remove, /allowlist show

	// /protect panel
	authorization_actions_not_permited:
		"Only the Owner of the server can edit the authorization rule about the protection module!",
	authorization_actions_everyone: "Everyone",
	authorization_actions_allowlist: "Member(s) of allowlist",
	authorization_actions_nobody: "Nobody. (Except server owner)",
	protect_panel_title: "Protect Control Panel",
	protect_panel_desc:
		"Configure every protection rule: enable or disable it, choose who bypasses it and pick the sanction applied to the member responsible.",
	protect_panel_global_label: "Global sanction",
	protect_panel_global_hint: "Applied to every rule without its own sanction",
	protect_panel_select_placeholder: "Select a rule to configure",
	protect_panel_mode_placeholder: "Select who can bypass this rule",
	protect_panel_sanction_placeholder: "Select the sanction to apply",
	protect_panel_bypass_label: "Bypass",
	protect_panel_sanction_label: "Sanction",
	protect_panel_rule_help:
		"When this rule is triggered, the action is automatically undone and the sanction is applied to the member responsible.",
	protect_panel_enable_button: "Enable",
	protect_panel_disable_button: "Disable",
	protect_panel_all_rules: "All rules",
	protect_panel_all_rules_desc: "Change every rule at once",
	protect_panel_all_status: "${enabledCount}/${ruleCount} rules enabled",
	protect_panel_all_help:
		"The bypass and the sanction apply to every enabled rule at once.",
	protect_panel_all_mixed: "Mixed",
	protect_panel_enable_all_button: "Enable all",
	protect_panel_disable_all_button: "Disable all",
	protect_panel_all_mode_saved:
		"**${ruleCount}** rules now bypass: **${mode}**.",
	protect_panel_all_sanction_saved:
		"The sanction of **${ruleCount}** rules is now: **${sanction}**.",
	protect_panel_all_enabled: "**${ruleCount}** rules are now enabled!",
	protect_panel_all_disabled: "**${ruleCount}** rules are now disabled!",
	protect_panel_back_button: "Back",
	protect_panel_refresh_button: "Refresh",
	protect_panel_close_button: "Close panel",
	protect_panel_rule_enabled: "The rule **${rule}** is now enabled!",
	protect_panel_rule_disabled: "The rule **${rule}** is now disabled!",
	protect_panel_mode_saved: "The rule **${rule}** now bypasses: **${mode}**.",
	protect_panel_sanction_saved:
		"The sanction of **${rule}** is now: **${sanction}**.",
	protect_panel_global_saved: "The global sanction is now: **${sanction}**.",
	protect_panel_api_error:
		"I couldn't apply this change, make sure I have the `Administrator` permission, then try again.",
	protect_panel_sanction_global: "Global default",
	protect_panel_sanction_cancel: "Cancel the actions only",
	protect_panel_sanction_derank: "Cancel + Derank",
	protect_panel_sanction_ban: "Cancel + Ban",
	protect_panel_sanction_kick: "Cancel + Kick",
	protect_panel_sanction_mute: "Cancel + Mute (10 min)",
	protect_panel_group_server: "Server & webhooks",
	protect_panel_group_channels: "Channels",
	protect_panel_group_roles: "Roles",
	protect_panel_group_members: "Members",
	protect_panel_rule_webhook_name: "Webhooks",
	protect_panel_rule_updateguild_name: "Server edits",
	protect_panel_rule_createchannel_name: "Channel creation",
	protect_panel_rule_updatechannel_name: "Channel edits",
	protect_panel_rule_deletechannel_name: "Channel deletion",
	protect_panel_rule_createrole_name: "Role creation",
	protect_panel_rule_deleterole_name: "Role deletion",
	protect_panel_rule_updaterole_name: "Role edits",
	protect_panel_rule_updatemember_name: "Member role edits",
	protect_panel_rule_banmembers_name: "Ban members",
	protect_panel_rule_kickmember_name: "Kick members",
	protect_panel_rule_unbanmembers_name: "Unban members",
	protect_panel_rule_add_admin_roles_name: "Admin role grants",
	// /allowlist show
	allowlist_show_not_permited:
		"You are not allowed to use this command! You need to be in the allowlist!",
	allowlist_show_embed_author: "Allowlist",

	// /allowlist add
	allowlist_add_not_permited:
		"You are not authorized to use this command! You must be in the allowlist!",
	allowlist_add_not_owner:
		"Only the owner of the server can add/remove users in the allowlist!",
	allowlist_add_already_in:
		"The member you want to add to the allowlist is already in it!",
	allowlist_add_command_work: "${member} has been added to the allowlist!",

	// /allowlist delete
	allowlist_delete_not_permited:
		"You are not authorized to use this command! You must be in the allowlist!",
	allowlist_delete_not_owner:
		"Only the owner of the server can add/remove users in the allowlist!",
	allowlist_delete_member_unreachable:
		"The member you wanted to remove from the allowlist is unreachable!",
	allowlist_delete_cant_remove_owner:
		"It is not possible to remove the server owner from the allowlist!",
	allowlist_delete_isnt_in:
		"The member you want to remove from the allowlist isn't in it!",
	allowlist_delete_command_work:
		"${member} has been removed from the allowlist!",

	// Custom Tag Module
	// /tag create, ... delete, ... edit, ... list, ... info

	tag_name: "Tag",
	tag_embed_created_at: "Created At",
	tag_embed_last_update: "Last Update",
	tag_embed_last_updated_by: "Last Updated By",

	// /tag create
	tag_create_not_permited:
		"You are not allowed to create a tag.\nYou need the Administrator permission or you need to be in the whitelist (`/tag wlroles-create`).",
	tag_create_not_good_name:
		"The tag name must not include spaces or dots and must not exceed 16 characters.",
	tag_create_command_work: "The tag `${tag_name}` has been created.",
	tag_create_already_exist: "The tag already exists.",
	tag_create_embed_doesnt_exist: "The embed doesn't exist.",

	// /tag delete
	tag_no_one_found: "There are no tags saved on this guild!",
	tag_delete_dnt_exist: "The tag `${tag_name}` doesn't exist.",
	tag_delete_command_ok: "The tag `${tag_name}` has been deleted.",

	// /tag info
	tag_doesnt_exist: "The tag `${tag_name}` doesn't exist!",

	// /tag wlcreate
	tag_wlcreate_embed_title: "Whitelist create - Tags",
	tag_wlcreate_embed_desc: "All roles that are allowed to create tags.",

	// /tag wluse
	tag_wluse_embed_title: "Whitelist use - Tags",
	tag_wluse_embed_desc: "All roles that are allowed to use tags.",

	// /tag list
	tag_list_no_anything: "There are no tags saved on this guild!",

	// /tag use
	tag_use_not_allowed:
		"You are not allowed to use the tag `${tag_name}`.\nYou need the Administrator permission, or you can ask the tag owner <@${createBy}> to add you to the whitelist (`tag wlroles-use`).",
	tag_use_empty: "The tag `${tag_name}` is empty: it has no text and no embed.",
	tag_use_command_work: "Tag `${tag_name}` has been sent.",

	// /tag edit
	tag_edit_error_perm:
		"To modify the tag, you need to have Administrator permissions or be the tag's owner.",
	tag_edit_command_ok:
		"The current tag name is now modified from **`${current_tag_name}`** to **`${new_tag_name}`**",

	// TempVoice Module
	// /text, /voice, /status, /staff

	// /voice interface set-text-channel
	tempvoice_if_text_not_admin:
		"<@${authorId}>, you are not authorized to use this command!",
	tempvoice_if_text_desc_embed:
		"## TempVoice Interface\nThis **interface** can be used to manage temporary voice channels.\n",
	tempvoice_if_text_fields_value_limit: "${emoji_VC_Limit} **Change limit**",
	tempvoice_if_text_fields_value_name: "${emoji_VC_Name} **Change Name**",
	tempvoice_if_text_fields_value_region:
		"${emoji_VC_Region} **Change Region**",
	tempvoice_if_text_fields_value_trust: "${emoji_VC_Trust} **Trust**",
	tempvoice_if_text_fields_value_untrust: "${emoji_VC_Untrust} **Untrust**",
	tempvoice_if_text_fields_value_block: "${emoji_VC_Block} **Block**",
	tempvoice_if_text_fields_value_unblock: "${emoji_VC_Unblock} **Unblock**",
	tempvoice_if_text_fields_value_claim: "${emoji_VC_Claim} **Claim**",
	tempvoice_if_text_fields_value_privacy: "${emoji_VC_Privacy} **Privacy**",
	tempvoice_if_text_fields_value_transfer:
		"${emoji_VC_Transfer} **Transfer**",
	tempvoice_if_text_fields_value_delete: "${emoji_VC_Delete} **Delete**",

	// /voice inteface set-voice-channel
	tempvoice_vc_not_admin:
		"<@${authorId}>, you are not authorized to use this command!",

	// /voice interface set-staff-role
	tempvoice_staff_not_admin:
		"<@${authorId}>, you are not authorized to use this command!",
	tempvoice_staff_desc_embed:
		"## TempVoice Staff Role\nRoles listed here can now join and moderate the channel!\n",

	// Confession Module
	// /cooldown, /disable, /channel

	// /confession channel
	confession_channel_command_work:
		"The confession panel has been sent to ${channel}",
	confession_channel_panel_embed_desc:
		"# **Anonymous Confessions**\n\nClick the button below to open the confession form. You can write what you need to confess. If you wish, you can choose to make your confession private.\nKeep in mind that confessions may not remain anonymous—server owners or anyone with access to confession logs can identify users if logging is enabled.\n\n## **Make a Confession**\n\n*Note: To make your confession private, write the corresponding option in the form.*",
	confession_channel_log_embed_title: "SetChannel Confession Module",
	confession_channel_log_embed_desc:
		"${author} has set the channel to ${channel}",

	// /confession cooldown
	confession_coolodwn_command_work:
		"${author}, the Confession's cooldown time is now **${time}**!",
	confession_cooldown_log_embed_title: "SetCooldown Confession Module",
	confession_cooldown_log_embed_desc:
		"${author} has set the timeout to `${time}`",

	// /confession disable
	confession_disable_command_work_on: "The confession module is now enabled.",
	confession_disable_command_work_off:
		"The confession module is now disabled.",
	confession_log_embed_title_on_enable: "Confession Enable/Disable",
	confession_log_embed_desc_on_enable:
		"${author} has enabled the Confession Module!",
	confession_log_embed_desc_on_disabled:
		"${author} has disabled the Confession Module!",

	// /confession thread
	confession_thread_enabled:
		"From now on, when someone confesses, I create a discussion thread below the embed.",
	confession_thread_disabled:
		"I don't create a discussion thread below the embed.",

	// AntiSpam Module
	// /antispam manage

	// /antispam manage
	antispam_manage_embed_title: "AntiSpam Module Configurations",
	antispam_manage_choices_1_label: "Enable module",
	antispam_manage_choices_1_desc: "Enable or disable the antispam module",
	antispam_manage_choices_2_label: "Ignore Bots",
	antispam_manage_choices_2_desc: "Ignore the spamming of bots in the guild",
	antispam_manage_choices_3_label: "Punishment type",
	antispam_manage_choices_3_desc:
		"What type of sanction I will give to users",
	antispam_manage_choices_4_label: "Punishment Time",
	antispam_manage_choices_4_desc: "How long the sanction is",
	antispam_manage_choices_5_label: "Punishment Time Multiplier",
	antispam_manage_choices_5_desc:
		"If the duration of the sanction is multiplied for each punishment",
	antispam_manage_choices_6_label: "Remove messages",
	antispam_manage_choices_6_desc: "Delete the spam message",
	antispam_manage_choices_7_label: "Max interval messages",
	antispam_manage_choices_7_desc:
		"Max interval between messages to consider it spam",
	antispam_manage_choices_8_label: "Max duplicate messages",
	antispam_manage_choices_8_desc:
		"Amount of max duplicate messages before sanction",
	antispam_manage_choices_9_label: "Max duplicate interval",
	antispam_manage_choices_9_desc:
		"The interval between duplicate messages for flagging users",
	antispam_manage_choices_10_label: "Max Similar Messages",
	antispam_manage_choices_10_desc:
		"Amount of max similar messages before sanction",
	antispam_manage_choices_12_label: "Threshold before punishment",
	antispam_manage_choices_12_desc: "The maximum threshold before punishment",
	antispam_manage_select_menu_punish_mute_label: "Mute Members",
	antispam_manage_modal_title: "AntiSpam Modal",
	antispam_manage_button_label: "Save config",
	antispam_manage_preset_level1_name: "Chill Mode",
	antispam_manage_preset_level2_name: "Guard Mode",
	antispam_manage_preset_level3_name: "Extreme Protection Mode",
	antispam_manage_button_preset_label: "Load Preset",
	antispam_manage_selectstring_preset_label: "Preset Configurations",

	// /antispam bypass-roles
	antispan_bypassroles_embed_desc:
		"All of the roles below can bypass the antispam module",

	// /antispam bypass-roles
	antispam_ignorechannels_embed_desc:
		"Messages sent in any of the channels below bypass the antispam module",

	// Stats Module
	// /stats ustats

	// /stats ustats
	header_h1_value: "{author_username}'s Messages Stats",
	messages_word: "Messages",
	voice_activity: "Voice Activity",
	minutes_word: "Minutes",
	top_voice: "Top Voice Channels",
	top_message: "Top Message Channels",
	var_members: "member(s)",

	// Starboard Module
	// lazy

	// /starboard channel
	starboard_channel_command_ok:
		"${emoji_Yes} | **Starboard channel is now defined to be: ${channel}**. Now, when server members react '⭐' to messages and the threshold of **`${threshold}`** is exceeded, the message is sent to the ${channel}!",

	// /starboard config
	starboard_config_command_ok:
		"${emoji_Yes} | **Starboard module is now ${action}**",

	// /starboard threshold
	starboard_threshold_command_ok:
		"${emoji_Yes} | Now, when server members react '⭐' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel!",

	// /starboard create-thread
	starboard_create_thread_command_ok:
		"${emoji_Yes} | Now, when server members react '⭐' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel **`${action}`**",
	starboard_create_thread_yes: "and a discussion thread will be created",
	starboard_create_thread_no: "and a discussion thread will not be created",

	// /skullboard channel
	skullboard_channel_command_ok:
		"${emoji_Yes} | **Skullboard channel is now defined to be: ${channel}**. Now, when server members react '💀' to messages and the threshold of **`${threshold}`** is exceeded, the message is sent to ${channel}!",

	// /skullboard config
	skullboard_config_command_ok:
		"${emoji_Yes} | **Skullboard module is now ${action}**",

	// /skullboard threshold
	skullboard_threshold_command_ok:
		"${emoji_Yes} | Now, when server members react '💀' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel!",

	// /skullboard create-thread
	skullboard_create_thread_command_ok:
		"${emoji_Yes} | Now, when server members react '💀' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel **`${action}`**",

	// Notifier Module
	// notifier author, notifier config

	// /notifier author add
	notifier_author_add_author_doesnt_exist:
		"Author doesn't exist. Please verify the ID.",

	// /notifier config channel
	notifier_config_channel_logsEmbed_title: "Notifier Channel Module",
	notifier_config_channel_logsEmbed_desc:
		"<@${authorId}> has set the Notifier Channel module to ${channel}",
	notifier_config_message_command_ok:
		"Now, when a streamer or YouTuber publishes a video, I will send a message in ${channel}",

	// /notifier config message
	notifier_config_message_helpEmbed_title: "Custom Notify Message",
	notifier_config_message_helpEmbed_desc:
		"{artistAuthor} => The username of the Streamer/Youtuber\n{artistLink} => The link of the Streamer/Youtuber\n{mediaURL} => The video URL of the Streamer/Youtuber",
	notifier_config_message_embed_fields_notifyMessage: "Notify Message",
	notifier_config_message_awaiting_response: "Write the notify message.",
	notifier_config_message_command_work_on_enable:
		"${emoji_GreenTick} | Successfully set notify message.",

	// Blogger Module

	// blogger
	blogger_generateBlogsEmbed_embed_desc: "List of configured RSS feeds:\n\n",
	blogger_generateBlogsEmbed_embed_title: "📰 RSS Blogs Configuration",
	blogger_generateConfigurationEmbed_embed_title: "📰 Blogger Configuration",
	blogger_no_rss: "No RSS feeds configured.",
	blogger_generateConfigurationEmbed_embed_fields_1_name: "Status",
	blogger_generateConfigurationEmbed_embed_fields_2_name: "Total Blogs",
	blogger_unknown_blog: "Unknown Blog",
	blogger_on_new_article_default_message:
		"📰 New article published!\n**{articleTitle}** by {articleAuthor}\n{articleLink}",
	blogger_config_status_enabled:
		"✅ Blogger module has been **enabled**. RSS feeds will be monitored.",
	blogger_config_status_disabled:
		"❌ Blogger module has been **disabled**. RSS feeds will not be monitored.",
	blogger_read_article: "Read Article",
	blogger_blog_add_invalid_channel:
		"Invalid channel type. Please select a text channel.",
	blogger_blog_add_success:
		"✅ RSS feed **${validationName}** has been added! Notifications will be sent to ${channel} (ID: `${blogId}`)",
	blogger_blog_add_invalid_rss:
		"❌ The provided RSS feed is invalid or unreachable. Please check the URL and try again.",
	blogger_blog_remove_success:
		"✅ RSS feed with ID `${blogId}` has been removed.",
	blogger_blog_remove_not_found: "❌ No RSS feed found with this ID.",
	lastfm_module_not_configured:
		"${emoji_No} | The Last.fm module is not configured on the bot. Set `LASTFM_API_KEY` and `LASTFM_SHARED_SECRET` in the bot's `.env`.",
	lastfm_config_login_required:
		"${emoji_No} | You need to use `/lastfm login` before enabling the module.",
	lastfm_config_enabled:
		"${emoji_Yes} | Last.fm scrobbling is now enabled for your account.",
	lastfm_config_disabled:
		"${emoji_Yes} | Last.fm scrobbling is now disabled for your account.",
	lastfm_login_invalid_session:
		"${emoji_No} | Last.fm did not return a valid session.",
	lastfm_login_success:
		"${emoji_Yes} | Your Last.fm account `${username}` is now connected and scrobbling has been enabled.",
	lastfm_embed_title: "Last.fm configuration for ${userLabel}",
	lastfm_embed_field_status: "Status",
	lastfm_embed_field_account: "Connected account",
	lastfm_embed_field_connected_at: "Connected on",
	lastfm_api_error_login:
		"${emoji_No} | Unable to connect to Last.fm: ${error}",
	lastfm_api_error_nowplaying:
		"${emoji_No} | Unable to notify Last.fm about now playing: ${error}",
	lastfm_api_error_scrobble:
		"${emoji_No} | Unable to scrobble this track: ${error}",
	lastfm_api_error_unknown: "unknown error",

	// AuthRestore Module
	// role, set, delete, get, force-join

	rc_key_doesnt_exist:
		"${emoji_No} The AuthRestore module with the following key: **${secretCode}** doesn't exist!",
	rc_verify: "Verify",

	// /authrestore role
	rc_role_embed_title: "AuthRestore New Modification",
	rc_role_embed_field1_name: "New Given role after verify",

	// /authrestore set
	rc_command_ok:
		'${author}, you have just set up the "AuthRestore" module. Now, when a member of the Discord server clicks on the button and logs in via OAuth2, they will be added to the database. They will eventually be able to automatically join the server with OAuth2.\n# READ CAREFULLY\nThe message ${msgLink} now has a button that will serve as a verification.\nHERE IS THE PRIVATE CODE THAT MUST NOT BE DISCLOSED TO ANYONE. A PERSON WITH THIS CODE COULD DELETE IT, ADD MEMBERS TO THEIR SERVER... KEEP IT SOMEWHERE SAFE. iHorizon WILL NEVER GIVE IT TO YOU AGAIN:\n```${secretCode}```',
	rc_command_ok_dm:
		"# The AuthRestore code for ${guildName}\n```${secretCode}```",
	rc_command_dm_failed:
		"I tried to send you the code in a private message, but you have blocked your DMs :/",
	rc_command_dm_ok:
		"In case you missed it, I sent you the code in a private message!",
	rc_command_horizongw_down: "Error: HorizonGateway maybe down",

	// /authrestore delete
	rc_delete_config_not_found:
		"The module configuration on this server could not be found!",
	rc_delete_command_ok:
		'${author}, you have just deleted the configuration of the "AuthRestore" module. For security (data) reasons, I will only delete the button, but the oauth2 data and the secret code will be deleted in 48 hours!',

	// /authrestore get
	rc_get_mainEmbed_title: "AuthRestore General Infos",
	rc_get_mainEmbed_field1_name: "Server ID",
	rc_get_mainEmbed_field2_name: "Given role after verify",
	rc_get_mainEmbed_field3_name: "Created at",
	rc_get_mainEmbed_field3_value: "*the date is in MM/DD/YYYY HH:mm format*",
	rc_get_mainEmbed_field4_name: "Key Used Count",
	rc_get_mainEmbed_field5_name: "Configuration Author",
	rc_get_secondEmbed_title: "Stored user(s)",
	rc_get_secondEmbed_footer: "Page ${from} / ${to}",
	rc_get_locale: "Locale",
	rc_get_username: "Username",
	rc_get_unkwnon_user: "Unknown user (${authorId})",

	// /authrestore force-join
	rc_forceJoin_embed_title: "AuthRestore - Force Join",
	rc_forceJoin_embed_desc:
		"## Are you sure to force-join members in this guild?\n### READ CAREFULLY:\nIF YOU CONFIRM THIS ACTION, THE CURRENT PRIVATE KEY WILL BE DESTROYED. A NEW KEY WILL BE PROVIDED TO YOU.\n\n\n",
	rc_forceJoin_embed_field1: "Members found",
	rc_forceJoin_embed_field2: "Members already here",
	rc_forceJoin_embed_field3: "Possible join",
	rc_forceJoin_embed_2_field1: "Possible join",
	rc_forceJoin_embed_2_field2: "Joined",
	rc_forceJoin_ws_size:
		"# Preparing to add **${value2}** members to the guild.",
	rc_forceJoin_ws_start: "# Force-joining in progress...",
	rc_forceJoin_ws_end: "# Force-joining process completed.",
	rc_forceJoin_ws_end_renew_msg:
		"# READ CAREFULLY\nHERE IS THE PRIVATE CODE THAT MUST NOT BE DISCLOSED TO ANYONE. A PERSON WITH THIS CODE COULD DELETE IT, ADD MEMBERS TO THEIR SERVER... KEEP IT SOMEWHERE SAFE. iHorizon WILL NEVER GIVE IT TO YOU AGAIN:\n```${value2}```",

	// Misc category
	// media manipulation

	// media cooldown
	media_gen_cooldown:
		"You need to wait `1 minute & 30 seconds` between media generations!",
	media_gen_error_args: "Please provide two valid image URLs.",

	// Batch processing message
	batch_ban_process:
		"🔄 Banning ${memberUsername} in progress on ${guildCount} servers...",
	batch_unban_process:
		"🔄 Unbanning ${bannedMemberCount} members in progress...",
	batch_unblacklist_process:
		"🔄 Unblacklisting ${bannedMemberUsername} from ${guildObjectCount} servers in progress...",
	unbanall_undo_command_err:
		"No members to re-ban. Use the unban all command first.",

	// -----------------------------/ \-----------------------------
	// Confession Module Events
	confession_module_modal_title: "Send a confession",
	confession_module_modal_components1_label: "What do you want to confess?",
	confession_module_modal_components1_placeholder: "Mmhh",
	confession_module_modal_components2_label: "Is this private?",

	// Music Player Events

	even_mp_playerStart_tip:
		"> ${emoji_LastFM_Logo} Did you know that you can scrobble your music with `/lastfm` on iHorizon? ${emoji_Sunglass}",
	event_mp_audioTrackAdd:
		"${emoji_Player_Queue_Add} - ${trackTitle} has been added to the queue!",
	event_mp_playerError: "I'm having trouble connecting => ${errorMessage}",
	event_mp_error:
		"There was a problem with the song queue => ${errorMessage}",
	event_mp_emptyChannel:
		"${emoji_No} | Nobody is in the voice channel, leaving...",
	event_mp_playerSkip: "${emoji_Music_Icon} - Skipping **${trackTitle}**!",
	event_mp_emptyQueue:
		"${emoji_Warning_Icon} - Music stopped as there is no more music in the queue!",

	// Channel Create Events
	event_channel_create_message_embed_title: "Successfully set up!",
	event_channel_create_message_embed_description:
		"The bot has been set up perfectly. You don't need to do anything (zen) anymore.\n\nAll moderation logs related to iHorizon will be displayed here",

	// Welcome Message Events
	event_welcomer_inviter:
		"{memberMention} (account created at {accountCreationTimestamp}) joined the guild. They were invited by **{inviterUsername}** (**{invitesCount}** Invites), we are now {memberCount} members in {guildName}",
	event_welcomer_default:
		"{memberMention} (account created at {accountCreationTimestamp}) joined the guild. We are now {memberCount} members in {guildName}",

	// Goodbye Message Events
	event_goodbye_inviter:
		"`{memberUsername}` (account created at {accountCreationTimestamp}) left the guild. They were invited by **{inviterUsername}** (**{invitesCount}** Invites), we are now {memberCount} members in {guildName}",
	event_goodbye_default:
		"`{memberUsername}` (account created at {accountCreationTimestamp}) left the guild. We are now {memberCount} members in {guildName}",

	// XP Level Events
	event_xp_level_earn:
		"**GG**, {memberMention} you have leveled up! (Level: **{xpLevel}**)",
	event_xp_level_additional_info:
		"\n-# ${emoji_VC_OpenChat} Do you find this message annoying? You can disable this message by disabling the leveling system with the `/ranks config` command.",

	// Ticket Module Events:
	event_ticket_embed_description:
		"Hi ${userUsername}, welcome to your ticket! Please be patient, we will be with you shortly. If you would like to close this ticket please run the command `/ticket close`",
	event_ticket_add_member:
		"${author}, you have **added** ${addedMembers} to the ticket ${channel}!",
	event_ticket_del_member:
		"${author}, you have **removed** ${removedMembers} from the ticket ${channel}!",
	event_ticket_button_name: "Create Ticket",
	event_ticket_category_awaiting_response:
		"Which category [${emoji}] >> ${name}",
	event_ticket_reason_awaiting_response:
		"${author}, should users be required to give a reason before creating a ticket?",
	event_ticket_create_reason_modal_title:
		"What's the reason for your ticket?",
	event_ticket_create_reason_modal_fields_1_label: "Ticket's reason",
	event_ticket_reason_embed_desc: "# Ticket Reason\n```${reason}```",

	// interactionCreate Events:
	iC_event_cooldown: "Cooldown, please wait a bit between commands!",
	iC_event_connection_error: "Connection error!",

	// Cooldown
	Msg_cooldown: "Can you please wait a second before executing the command?",

	// Ticket Module
	ticket_module_button_delete: "Delete Ticket",
	ticket_module_button_transcript: "Transcript Ticket",
	ticket_module_button_addmember: "Add Member",
	ticket_module_button_removemember: "Remove Member",
	ticket_module_add_question:
		"Who do you want to add to your ticket? (Specify their User ID)!",
	ticket_module_remove_question:
		"Who is the user you want to remove from your ticket? (Specify their User ID)!",
	ticket_transcript_failed_to_send:
		"I tried to send you the file in a private message, but you have blocked your DMs :/",

	// Server Logs
	event_srvLogs_banAdd_description:
		"<@${executorId}> **banned** <@${targetId}>",
	event_srvLogs_banAdd_fields_name: "Reason",
	event_srvLogs_banAdd_fields_value: "```{reason}```",
	event_srvLogs_banRemove_description:
		"<@${executorId}> **revoked the ban** on ${targetUsername}",
	event_srvLogs_guildMemberRemove_description:
		"<@${executorId}> **kicked** <@${targetId}>",
	event_srvLogs_guildMemberUpdate_description:
		"📤 <@${executorId}> removed the ${removedRoles} role from ${oldMemberUserUsername}",
	event_srvLogs_guildMemberUpdate_2_description:
		"📥 <@${executorId}> added the ${addedRoles} role to ${oldMemberUserUsername}",
	event_srvLogs_messageDelete_description:
		"**Message deleted in <#${messageChannelId}>**\n${messageContent}",
	event_srvLogs_messageUpdate_description:
		"**Message edited** [in](xxx) **<#${oldMessageChannelId}>**",
	event_srvLogs_messageUpdate_footer_1: "Before",
	event_srvLogs_messageUpdate_footer_2: "After",
	event_srvLogs_voiceStateUpdate_description:
		"📤 <@${targetUserId}> left the <#${OchannelID}> channel",
	event_srvLogs_voiceStateUpdate_2_description:
		"📥 <@${targetUserId}> joined the <#${channelID}> channel",
	event_srvLogs_voiceStateUpdate_3_description:
		"<@${targetUserId}> deafened themselves in the <#${channelID}> channel",
	event_srvLogs_voiceStateUpdate_4_description:
		"<@${targetUserId}> undeafened themselves in the <#${channelID}> channel",
	event_srvLogs_voiceStateUpdate_5_description:
		"<@${targetUserId}> muted themselves in the <#${channelID}> channel",
	event_srvLogs_voiceStateUpdate_6_description:
		"<@${targetUserId}> unmuted themselves in the <#${channelID}> channel",
	event_srvLogs_channelUpdate_disabled_for:
		"-    ❌ ${perm} disabled for ${target}\n",
	event_srvLogs_channelUpdate_enabled_for:
		"-    ✅ ${perm} enabled for ${target}\n",
	event_srvLogs_channelUpdate_allowed_for:
		"-    ✅ ${perm} allowed for ${target}\n",
	event_srvLogs_channelUpdate_unallowed_for:
		"-    ❌ ${perm} not allowed for ${target}\n",
	event_srvLogs_channelUpdate_field_name: "🎫 Name: ${newChannelName}\n",
	event_srvLogs_channelUpdate_perm_added:
		"🛡 Added permissions for ${target}:\n",
	event_srvLogs_channelUpdate_embed_desc: "${newChannel} has been updated",

	// RankUp event
	event_rank_role: "<@${messageAuthorId}>, you now have the role <@&${id}>",

	// Suggestion Event
	event_suggestion_too_short:
		"<@${authorId}>, a suggestion must contain at least 5 words. Your message will be deleted in 10 seconds, copy it if you want to rewrite it.",
	event_suggestion_embed_author:
		"New suggestion from ${messageAuthorUsername}",

	// Security Event
	event_security_title: "Welcome to ${guild}!",
	event_security: "${member}, please type the captcha shown in this message.",
	event_security_expiry:
		"{emoji} Automatic kick ${timestamp} (**${attempts}** attempt(s) remaining).",
	event_security_footer:
		"This only takes a few seconds and helps keep our community safe.",
	event_security_kick_reason: "Security process failed",

	// Ticket Event
	event_ticket_whenCreated_msg:
		"${author}, your ticket has been created, visit <#${channelId}>!",
	event_ticket_logsChannel_onCreation_embed_title:
		"TicketLog - Panel Creation",
	event_ticket_logsChannel_onCreation_embed_desc:
		"Ticket Panel called `${name}` in ${interaction} has been created!",
	event_ticket_logsChannel_onCreationChannel_embed_title:
		"TicketLog - Ticket creation",
	event_ticket_logsChannel_onCreationChannel_embed_desc:
		"A Ticket has been created: ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onClose_embed_title: "TicketLog - Ticket closure",
	event_ticket_logsChannel_onClose_embed_desc:
		"Ticket is now closed by ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onRemoveMember_embed_title:
		"TicketLog - Member removed from a Ticket",
	event_ticket_logsChannel_onRemoveMember_embed_desc:
		"${member} has been removed from the ticket by ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onAddMember_embed_title:
		"TicketLog - Member added in a ticket",
	event_ticket_logsChannel_onAddMember_embed_desc:
		"${member} has been added to the ticket by ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onReopen_embed_title:
		"TicketLog - Ticket re-opened",
	event_ticket_logsChannel_onReopen_embed_desc:
		"${author} re-opened a ticket (<#${channelId}>)!",
	event_ticket_logsChannel_onDelete_embed_title:
		"TicketLog - Ticket deletion",
	event_ticket_logsChannel_onDelete_embed_desc:
		"${author} has deleted a ticket (#${channelName})!",
	event_ticket_logsChannel_onAddMember2_embed_title:
		"TicketLog - Add/Remove Members of a Ticket",
	event_ticket_logsChannel_onAddMember2_embed_desc:
		"${author}\nRemoved: ${removedMembers}.\nAdded: ${addedMembers}.\n in the ticket (${channel})!",
	event_ticket_already_opened:
		"Uh oh, you already have a ticket open (<#${channelId}>)! Please close it before opening a new one.",

	// Giveaway Event
	event_gw_reroll_win_msg:
		"Congratulations ${winners}! You won the **${prize}**!",
	event_gw_reroll_cannot_win_msg:
		"No valid entrants, so a winner could not be determined!",
	event_gw_finnish_msg:
		"Congratulations ${winners}! You won the **${prize}**!",
	event_gw_finnish_cannot_msg:
		"No valid entrants, so a winner could not be determined!",
	event_gw_finnish_button_title: "Giveaway Finished",
	event_gw_entries_button_title: "Participants List",
	event_gw_removeentries_msg: "${author}, you have left this giveaway!",
	event_gw_leave_button_placeholder: "Leave Giveaway",
	event_gw_confirm_leave_msg:
		"${author} are you sure you want to leave this giveaway?",
	event_gw_embed_desc:
		"Ends: ${end_string} (${end_string2})\nHosted by: <@${hostedBy}>\nEntries: **0**\nWinners: **${winners_amount}**",
	event_gw_ended_embed_desc:
		"Ended: ${time1} (${time2})\nHosted by: <@${hostedBy}>\nEntries **${entrieCount}**\nWinners: ${winners}",
	event_gw_entries_words: "Entries",
	event_gw_ended_word:
		"Ended: ${ended} (${time2})\nHosted by: <@${hostedBy}>\nEntries **${entries}**\nWinners: ${winners}",
	event_gw_break_req:
		"${emoji_No} You don't meet the required conditions to enter this giveaway.\nType: `${requirementType}`\nValue: `${requirementValue}`",

	// Boost Logs Event
	event_boostlog_add:
		"<@${newMemberUserId}> **just boosted** the server! (**${boostCount}** total boosts)",
	event_boostlog_sub:
		"<@${newMemberUserId}> **just removed their boost** from the server! (**${boostCount}** total boosts)",

	// Economy Module
	economy_disable_msg:
		"<@${authorId}>, the `Economy Module` in this guild is **disabled**. You can't use the economy module anymore!",

	// Permission Event
	event_permission_wrong:
		"${author}, you are not allowed to use this command! You need this permission: ${neededPerm}",

	// TempVoice Module
	// All components, globalVar...

	// GlobalVariable

	temporary_voice_title_embec:
		"## Modifications about your temporary voice channel",
	temporary_voice_unblocked_member: "Unblocked members",
	temporary_voice_blocked_mmeber: "Blocked members",
	temporary_voice_no_one: "No one",
	temporary_voice_new_member: "New owner",
	temporary_voice_old_member: "Old owner",
	temporary_voice_modal_title: "iHorizon's VoiceDashboard",
	temporary_voice_new_userlimit: "New UserLimit",
	temporary_voice_new_name: "New name",
	temporary_voice_new_region: "New region",
	temporary_voice_untrusted_member: "Untrusted members",
	temporary_voice_trusted_member: "Trusted members",

	// Buttons
	temporary_voice_block_button_menu_placeholder:
		"Selected users will be untrusted to join",

	temporary_voice_delete_button_desc_embed:
		"## Channel deletion\nThe channel has been successfully deleted!",

	temporary_voice_limit_button_menu_label: "What's the channel user limit?",
	temporary_voice_limit_button_not_integer:
		"${emoji_No} | The input is not a number",

	temporary_voice_name_button_menu_label: "What's the channel name?",

	temporary_voice_privacy_menu_placeholder: "Select a Privacy Option",
	temporary_voice_privacy_menu_lock_label: "Lock channel",
	temporary_voice_privacy_menu_lock_desc:
		"Only trusted users will be able to join your voice channel",
	temporary_voice_privacy_menu_unlock_label: "Unlock channel",
	temporary_voice_privacy_menu_unlock_desc:
		"Everyone will be able to join your voice channel",
	temporary_voice_privacy_menu_invisible_label: "Invisible",
	temporary_voice_privacy_menu_invisible_desc:
		"Only trusted users will be able to view your voice channel",
	temporary_voice_privacy_menu_visible_label: "Visible",
	temporary_voice_privacy_menu_visible_desc:
		"Everyone will be able to view your voice channel",
	temporary_voice_privacy_menu_closechat_label: "Close chat",
	temporary_voice_privacy_menu_closechat_desc:
		"Only trusted users will be able to text in your chat",
	temporary_voice_privacy_menu_openchat_label: "Open chat",
	temporary_voice_privacy_menu_openchat_desc:
		"Everyone will be able to text in your chat",

	temporary_voice_region_menu_placeholder: "Select a Region",

	temporary_voice_transfer_menu_placeholder:
		"Selected user to transfer the voice channel",

	temporary_voice_transfer_trust_placeholder:
		"Selected users will be trusted to join",

	temporary_voice_transfer_unblocked_placeholder:
		"Selected users will be unblocked to join",

	temporary_voice_transfer_untrust_placeholder:
		"Selected users will be untrusted for joining",

	temporary_voice_channel_name: "{nickname}'s Channel",

	tempvoice_v2_embed_title: "## ${emoji_VC_Name} ${channelName}",
	tempvoice_v2_embed_desc:
		"Welcome to your temporary voice channel, ${owner}!\nManage it with the buttons below.",
	tempvoice_v2_hint: "-# Only the channel owner can use this menu.",
	tempvoice_v2_select_placeholder: "Manage your voice channel...",

	tempvoice_cfg_panel_title: "TempVoice configuration",
	tempvoice_cfg_panel_desc:
		"Configure the TempVoice module below. Every change applies immediately, and each created voice channel gets its own control panel.",
	tempvoice_cfg_hub: "Join-to-create channel",
	tempvoice_cfg_category: "Channels created in",
	tempvoice_cfg_name: "Channel name",
	tempvoice_cfg_position: "Position in category",
	tempvoice_cfg_position_top: "Top",
	tempvoice_cfg_position_bottom: "Bottom",
	tempvoice_cfg_staff: "Staff roles (bypass permissions)",
	tempvoice_cfg_select_placeholder: "More settings...",
	tempvoice_cfg_opt_name: "Change the channel name",
	tempvoice_cfg_opt_position_top: "Set position: Top",
	tempvoice_cfg_opt_position_bottom: "Set position: Bottom",
	tempvoice_cfg_done: "Done",
	tempvoice_cfg_remove_hub: "Remove the join-to-create channel",
	tempvoice_cfg_saved: "TempVoice settings saved!",
	tempvoice_cfg_expired: "Configuration panel expired. Run /tempvoice again.",
	tempvoice_cfg_modal_title: "Set the channel name",
	tempvoice_cfg_modal_label: "Name | Variable: {Username}",
	// Protection Module
	// Event message

	protection_avoid_channel_delete:
		"**PROTECT MODE ON**\n<@${channelGuildOwnerId}>, the channel has been re-created, <@${executorId}> attempted to delete the channel!",
	protection_blockbot_embed_title: "⚠️ Danger in ${memberGuildName} ⚠️",
	protection_blockbot_embed_desc:
		"# BotAdd Warning\nSomeone has tried to add a Discord bot.",
	var_target_bot: "Target bot",
	var_not_detected: "Not detected",

	// AntiSpam Module
	// Event message

	// Base warning message
	antispam_base_warn_message:
		"Warning ${mentionedMembers}, you are spamming and may be punished.",

	// Additional warning messages based on punishment type
	antispam_more_ban_msg:
		"If you continue, you will be banned from the server.",
	antispam_more_mute_msg: "If you continue, you will be muted.",
	antispam_more_kick_msg:
		"If you continue, you will be kicked from the server.",

	// Embed Logs of AntiSpam
	antispam_log_embed_title: "[AntiSpam] New ${actionType}",
	antispam_log_embed_desc: "${bot} has **${actionType}** ${user}",

	// Hybrid Commands
	// Event Message

	hybridcommands_global_prefix_mention: "`@Ping-Me`",
	hybridcommands_global_prefix_cleaned_mention: "@Ping-Me ",
	hybridcommands_args_error_embed_desc:
		'```ts\nCommand Name: ${currentCommandName}\n```\n```cs\n${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\nError when sending "${wrongArgumentName}" argument.\n```',
	hybridcommands_embed_help_title: "${commandName} Help Embed",
	hybridcommands_embed_help_fields_value:
		"**Aliases:** ${aliases}\n**Use:** ${use}",
	hybridcommands_embed_footer_text:
		"Options within [...] are required, while those within <...> are optional.\nUse the command: ${botPrefix}help [command] for more information.",

	ping_bot_show_info_msg:
		"Hey ${messageAuthor}, I am 100% in `Slash Command` (${emoji_Slash_Bot_Badge}) and usable over 85% in prefix command. My prefix on **this server** is `${prefix}`!\n",
	ping_bot_show_info_msg_about_change_prefix:
		"\n-# ${emoji_VC_OpenChat} Don’t like my prefix? Use **`/guildconfig bot prefix`** to change it!",

	// Notifier Module
	notifier_on_new_media_default_message:
		"@everyone **[{artistAuthor}](<{artistLink}>)** has published a new video [Click Here]({mediaURL})",
	notifier_on_new_media_default_button_label: "Check out!",
	notifier_generateAuthorsEmbed_embed_desc:
		"This is the list of all Streamers/Youtubers:\n",
	notifier_generateAuthorsEmbed_embed_title:
		"All Streamers/Youtubers in the guild",
	notifier_generateConfigurationEmbed_embed_title:
		"Notifier Module Configuration",
	notifier_generateConfigurationEmbed_embed_fields_1_name: "Notify Channel",
	notifier_generateConfigurationEmbed_embed_fields_2_name: "Notify Message",

	// ButtonReaction
	buttonreaction_role_doesnt_exit:
		"The role in my database no longer exists in the guild!",
	buttonreaction_role_too_high:
		"The role is too high, I can't give/remove the role. You need to change my permissions!",
	buttonreaction_role_add: "You now have the role ${role} :tada:",
	buttonreaction_role_remove: "You no longer have the ${role} role ✅",
	rolepanel_setup_embed_title: "Role panel setup",
	rolepanel_setup_embed_desc:
		"Select roles to add or remove from ${member}. If ${member} already has a selected role, it will be removed. Unauthorized roles will be ignored.",
	rolepanel_setup_embed_roles_field: "Allowed roles",
	rolepanel_setup_embed_refused_field: "Refused roles",
	rolepanel_setup_select_placeholder: "Select roles to offer",
	rolepanel_setup_apply_button: "Create panel",
	rolepanel_setup_no_roles: "No valid role has been selected.",
	rolepanel_setup_saved: "The role panel has been sent.",
	rolepanel_panel_embed_title: "Role panel",
	rolepanel_panel_embed_desc:
		"Choose the roles to add or remove from your profile.",
	rolepanel_panel_select_placeholder: "Choose your roles",
	rolepanel_role_managed_or_everyone: "System role or @everyone",
	rolepanel_role_too_high_bot: "Role higher than the bot",
	rolepanel_role_too_high_user: "Role higher than you",
	rolepanel_role_missing_permissions: "Missing permissions: ${permissions}",
	rolepanel_logs_embed_title_create: "Role panel logs",
	rolepanel_logs_embed_desc_create:
		"<@${authorId}> created a role panel (${messageId}) with: ${roles}",
	rolepanel_logs_embed_title_apply: "Role panel usage logs",
	rolepanel_logs_embed_desc_apply:
		"<@${authorId}> changed roles for <@${memberId}> through a panel. Added: ${addedRoles} | Removed: ${removedRoles}",

	// AuthRestore HTML
	rc_created_by: "Created by:",
	rc_created_on: "Created on:",
	rc_total_membres: "Total Members",
	rc_total_verification: "Total Verifications",
	rc_total_key_used_count: "Key Used Count",
	rc_recent_locales_distribution: "Member Locales Distribution",
	rc_recent_verifications: "Recent Verifications",
	rc_registration_over_time: "Registrations Over Time",

	// PicOnly Module
	piconly_module_punish_msg:
		"${messageAuthor}, you have been timed out for 10 minutes for sending too many messages without pictures in a pictures-only channel.",
	piconly_module_warn_msg:
		"${messageAuthor}, this channel only accepts messages containing pictures (accepted formats: JPG, PNG, GIF, WEBP, BMP, TIFF). Warning ${userWarningCount}/${threshold}",
	piconly_module_timeout_reason:
		"Spamming messages without pictures in a pictures-only channel",

	// Nick Kicker Event
	event_nick_kicker_kick_reason: "Blacklisted word in username - Nick Kicker",
	event_nick_kicker_kick_msg:
		"In the guild `${memberGuildName}`, your username contains a blacklisted word. You have been kicked from the guild.",

	// Pfps Module
	pfps_embed_user_title: "${username}'s **User** avatar",
	pfps_embed_guild_title: "${username}'s **Guild** avatar",
	pfps_download_user_button: "Download User Avatar",
	pfps_download_guild_button: "Download Guild Avatar",
	// -----------------------------\ /-----------------------------

	// AddRoleReact Command
	addrolereact_role_not_found: "Role not found.",
	addrolereact_cannot_check_permissions: "Cannot check your permissions.",
	addrolereact_role_too_high:
		"You cannot add a role higher than or equal to your highest role.",
	addrolereact_must_be_text_channel:
		"This command must be executed in a text channel.",
	addrolereact_message_not_found: "Message not found.",
	addrolereact_no_reactions: "This message has no reactions.",
	addrolereact_adding_role: "Adding role {role} in progress...",
	addrolereact_adding_role_progress:
		"Adding role {role} in progress for {count} users...",
	addrolereact_role_added:
		"Role {role} added. {count} users received the role.",
	addrolereact_error: "Error executing the command.",

	// Channel hide/unhide commands
	channel_hide_in_progress: "Hiding the current channel...",
	channel_hide_success: "Channel has been hidden from @everyone",
	channel_hide_already_hidden:
		"This channel is already hidden from @everyone",
	channel_unhide_in_progress: "Unhiding the current channel...",
	channel_unhide_success: "The channel is now visible to @everyone",
	channel_unhide_already_visible:
		"This channel is already visible to @everyone",
	channel_hideall_in_progress: "Hiding all channels in progress...",
	channel_hideall_success:
		"**Hiding completed!**\n**Statistics:**\n• **{hiddenCount}** channels hidden\n• **{errorCount}** errors encountered",
	channel_hideall_error: "An error occurred while hiding channels.",
	channel_unhideall_in_progress: "Unhiding all channels in progress...",
	channel_unhideall_success:
		"**Unhiding completed!**\n**Statistics:**\n• **{unhiddenCount}** channels unhidden\n• **{errorCount}** errors encountered",
	channel_unhideall_error: "An error occurred while unhiding channels.",

	// New guild event
	new_guild_embed_title: [
		"Welcome to our server! 🎉",
		"Greetings, fellow Discordians! 👋",
		"iHorizon has joined the chat! 💬",
		"It's a bird, it's a plane, no, it's iHorizon! 🦸‍♂",
		"Let's give a warm welcome to iHorizon! 🔥"
	],
	new_guild_embed_desc:
		"## ${randomMessage}\nHi there! I'm excited to join your server and be a part of your community.\nMy name is iHorizon and I'm here to help you with all your needs. Feel free to use my commands and explore all the features I have to offer.\nIf you have any questions or run into any issues, don't hesitate to reach out to me.\nI'm here to make your experience on this server the best it can be.\nThanks for choosing me and let's have some fun together!\n",
	new_guild_owner_dm_title: "Welcome to the iHorizon family!",
	new_guild_owner_dm_description:
		"# Thank you for adding iHorizon to your server!\n\n> *Wait... Is that all? No, absolutely not.*\n\niHorizon is a Discord bot, okay? But not just that. It's also a community, a lore, a project built over 6+ years (2020).\nUsing iHorizon isn't just about having a complete Discord bot, forever **free** and **open source**. It's also about embracing a **concept**.\n\n> **A free Discord bot can do a better job than paid bots.**\n*Yes, that's iHorizon: a complete bot, maintained for 6 years by passionate people.*\n\nSo yes... after this message, thank you.\nWe are legion. #ihorizon",
	guild_create_btn_invite: "Invite iHorizon",
	guild_create_btn_website: "iHorizon Website",
	guild_create_btn_search: "iHorizon Search",
	guild_create_btn_repos: "iHorizon Repositories",
	guild_create_btn_support: "Support Server",
	guild_create_btn_docs: "iHorizon Documentation",
	bot_server_bio:
		"{wink_emoji} **iHorizon Discord Bot** **`+{count} commands`**\n> *« Made by people since 2022, for your community. »*\n**https://www.ihorizon.org**",
	guild_leave_data_clear_notice_title: "iHorizon has left ${guildName}",
	guild_leave_data_clear_notice_description:
		"Waaah, this is sad. You kicked the bot from `${guildName}`. The server data will be cleared ${deleteAt} if iHorizon is not back before then.",
	guild_leave_data_clear_notice_message:
		"Waaah, this is sad. You kicked iHorizon from `${guildName}`. The data will be cleared ${deleteAt}.",
	guild_leave_data_clear_cancelled_title: "iHorizon is back on ${guildName}",
	guild_leave_data_clear_cancelled_description:
		"Yaaay, thanks for adding iHorizon back to `${guildName}`. The scheduled data deletion has been cancelled.",
	guild_leave_data_clear_cancelled_message:
		"Yaaay, thanks for adding iHorizon back to `${guildName}`. Your server data is safe.",

	// Confession Event
	confession_embed_logs_title: "New confession",
	confession_channel_button_name: "Respond Anonymously",
	confession_1_embed_log_title: "New confession response",

	// Context Menu Interaction
	global_unknown_message: "Message not found.",
	global_error: "❌ Error",
	global_not_atc: "The selected message does not contain an attachment.",
	global_not_valid_atc: "The selected attachment is not a valid audio file.",
	global_too_heavy_file:
		"The generated MP4 file is too large (${fileSize} MB). The Discord limit is 25 MB.",
	global_convert_ok: "✅ Conversion successful",
	global_convert_ok_desc:
		"Your audio file has been converted to MP4 (${fileSize} MB).",

	// Economy logs titles
	economy_logs_add_money_title: "Economy Logs - Money addition",
	economy_logs_remove_money_title: "Economy Logs - Money removing",
	economy_logs_boost_role_title: "Economy Logs - Boost for role",
	economy_logs_config_title: "Economy Logs - Module configuration",
	economy_logs_role_add_title: "Economy Logs - New role added into the shop",
	economy_logs_role_remove_title: "Economy Logs - Role removed from the shop",
	economy_logs_pay_title: "Economy Logs - Pay",
	economy_logs_rob_title: "Economy Logs - Rob",
	economy_logs_set_cooldown_title: "Economy Logs - Set Cooldown",
	economy_logs_set_money_title: "Economy Logs - Set Money",
	economy_logs_withdraw_title: "Economy Logs - Withdraw",
	economy_logs_deposit_title: "Economy Logs - Deposit",

	// Economy logs descriptions
	economy_logs_add_money_desc:
		"{author} added to {target} `{amount}$` {coin}",
	economy_logs_remove_money_desc:
		"{author} removed from {target} `{amount}$` {coin}",
	economy_logs_boost_role_desc:
		"{author} set the boost to the {role} role. Boost is now: `x{amount}`",
	economy_logs_config_desc: "{author} has {state} the economy module",
	economy_logs_role_add_desc:
		"{author} has added the {role} role into the shop. Price: `{amount}$`",
	economy_logs_role_remove_desc:
		"{author} has removed the {role} role from the shop.",
	economy_logs_pay_desc: "{author} sent `{amount}$` to {target}",
	economy_logs_rob_desc: "{author} robbed `{amount}$` from {target}",
	economy_logs_set_cooldown_desc:
		"{author} set the cooldown of `{type}` to **{time}**",
	economy_logs_set_money_desc:
		"{author} set the money of `{type}` to **{money}**",
	economy_logs_withdraw_desc: "{author} withdrew from the bank **${money}**",
	economy_logs_deposit_desc: "{author} deposited **${money}** in the bank",

	// Generic vars
	var_on: "enabled",
	var_off: "disabled",
	global_command_cooldown_msg:
		"${emoji} You need to wait **${time}** between each **`${ctxCommandPath}`**",

	global_warn_embed_title: "You got warned - Case **`${id}`**",
	global_warn_embed_desc:
		"> **Reason:** ${reason}\n> **Responsible:** @${authorUsername} (*${authorRolesHighestName}*)\nWarn generated ${time}",
	global_warn_component_button_label: "Sent from ${authorGuildName}",

	counter_error_too_much_u:
		"<@${messageAuthorId}> MESSED UP AT **${number}**!! The next number is **1**. **You cannot count twice in a row.**",
	counter_error_syntaxic:
		"<@${messageAuthorId}> MADE A MISTAKE!! The next number is **1**.",

	global_blacklist_msg_to_send:
		"You have been automatically banned from this server because your account is listed on the iHorizon Global Blacklist.\n\nReason: `${reason}`\n\nAccording to section 3 of our Terms of Service, servers using iHorizon agree that the bot may automatically enforce sanctions related to this global blacklist.\n\nIf you believe this is a mistake or wish to appeal this decision, you may do so here:\nAppeal: <https://www.ihorizon.org/appeal>\n\nTerms of Service: <https://www.ihorizon.org/tos>",
	global_blacklist_reason:
		"iHorizon Project Punishment - Blacklist | Reason: ${reason}",
	server_blacklist_msg_to_send:
		"You have been banned, because you are blacklisted from this server.\nReason: `${data2Reason}`",
	server_blacklist_reason: "Blacklist | Reason: ${data2Reason}",
	help_sticky_fields: "Sticky",
	help_sticky_dsc:
		"> *Keep an important message always visible in your channels with automatic reposting.*",
	sticky_channel_command_error:
		"${emoji_No} | ${author}, I could not find a valid text channel.",
	sticky_text_command_missing_message:
		"${emoji_No} | ${author}, you must provide a sticky message.",
	sticky_text_command_work:
		"${emoji_Yes} | ${author}, the sticky text message is now active in ${channel}.",
	sticky_embed_command_embed_not_found:
		"${emoji_No} | ${author}, I could not find the embed `${embed_id}`.",
	sticky_embed_command_work:
		"${emoji_Yes} | ${author}, the sticky embed `${embed_id}` is now active in ${channel}.",
	sticky_disable_command_not_found:
		"${emoji_No} | ${author}, there is no sticky message configured in ${channel}.",
	sticky_disable_command_work:
		"${emoji_Yes} | ${author}, the sticky message has been disabled in ${channel}.",
	sticky_refresh_command_not_found:
		"${emoji_No} | ${author}, there is no sticky message configured in ${channel}.",
	sticky_refresh_command_missing_embed:
		"${emoji_No} | ${author}, the sticky message in ${channel} references an embed that no longer exists.",
	sticky_refresh_command_missing_permissions:
		"${emoji_No} | ${author}, I cannot repost the sticky message in ${channel}. Check my permissions.",
	sticky_refresh_command_work:
		"${emoji_Yes} | ${author}, the sticky message has been reposted in ${channel}.",
	sticky_show_command_not_found:
		"${emoji_No} | ${author}, there is no sticky message configured in ${channel}.",
	sticky_show_embed_title: "Sticky message configuration",
	sticky_show_embed_fields_channel: "Channel",
	sticky_show_embed_fields_type: "Type",
	sticky_show_embed_fields_status: "Status",
	sticky_show_embed_fields_message: "Message",
	sticky_show_embed_fields_embed: "Embed ID",
	sticky_show_embed_fields_last_message: "Last sticky message ID",
	sticky_list_embed_title: "Sticky channels",
	sticky_list_embed_desc_empty:
		"No sticky channel is configured on this server.",
	sticky_list_embed_desc_line_text: "${channel} - Text sticky",
	sticky_list_embed_desc_line_embed:
		"${channel} - Embed sticky (`${embed_id}`)",
	sticky_list_embed_desc_line_text_embed:
		"${channel} - Text + embed sticky (`${embed_id}`)",
	sticky_var_text: "Text",
	sticky_var_embed: "Embed",
	sticky_var_text_embed: "Text + embed",
	sticky_var_enabled: "Enabled",
	sticky_var_disabled: "Disabled",
	sticky_var_none: "None",

	// /honeypot config
	honeypot_config_not_allowed:
		"You must be an administrator or be in the allowlist to configure Honeypot.",
	honeypot_config_embed_title: "Honeypot Configuration",
	honeypot_config_embed_desc:
		"Configure the trap channel, the logs channel, and the automatic action used when someone starts sending messages in the *Honeypot* channel.",
	honeypot_config_embed_field_status: "Status",
	honeypot_config_embed_field_trap_channel: "Trap Channel",
	honeypot_config_embed_field_logs_channel: "Logs Channel",
	honeypot_config_embed_field_action: "Action",
	honeypot_config_embed_field_message: "Sent Message",
	honeypot_config_embed_field_notes: "Notes",
	honeypot_config_embed_field_credit: "Credits",
	honeypot_config_notes_value:
		"- **Place the iHorizon role above every member role, for maximum efficiency.**\n- **Auto-created Honeypot channels are moved to the top of the server, for maximum efficiency.**\n- **You can rename the Honeypot channel without breaking anything.**",
	honeypot_config_credit_value:
		"*Inspired by RiskyMH's Honeypot bot, check it out!*\n${url}",
	honeypot_config_select_trap_placeholder: "Select the trap channel",
	honeypot_config_select_logs_placeholder: "Select the logs channel",
	honeypot_config_select_action_placeholder: "Select the action to apply",
	honeypot_config_button_send: "Send Embed",
	honeypot_config_button_preview: "Preview",
	honeypot_config_button_enable: "Enable Honeypot",
	honeypot_config_button_disable: "Disable Honeypot",
	honeypot_config_send_success:
		"The Honeypot embed has been sent in ${channel}.",
	honeypot_config_enable_success: "Honeypot is now enabled in ${channel}.",
	honeypot_config_disable_success: "Honeypot is now disabled.",
	honeypot_config_missing_logs_channel:
		"You must configure a logs channel before enabling Honeypot.",
	honeypot_config_generic_error: "An error occurred while updating Honeypot.",
	honeypot_config_select_action_kick: "Kick users",
	honeypot_config_select_action_ban: "Ban users",
	honeypot_config_select_action_none: "Delete messages only",
	honeypot_config_select_action_del_messages: "Delete messages",
	honeypot_default_channel_name: "🍯・general-chat",
	honeypot_action_none: "Delete messages only",
	honeypot_action_failed: "Action failed",
	honeypot_dm_action_kicked: "you have been kicked!",
	honeypot_dm_action_banned: "you have been banned!",
	honeypot_dm_action_none: "your messages have been deleted",
	honeypot_trap_embed_title: "DO NOT SEND MESSAGES IN THIS CHANNEL",
	honeypot_trap_embed_desc:
		"*This channel is used to catch spam bots.*\n*Any message sent here **WILL** trigger the server's automated protection.*",
	honeypot_trap_embed_footer:
		"Inspired by RiskyMH's Honeypot bot, check it out!\n${url}",
	honeypot_dm_title: "HONEYPOT TRIGGERED!",
	honeypot_dm_desc:
		"A message you sent in the *Honeypot* channel on the following server: **`${guild}`** **triggered** the configured protection.\n\n__Action taken against you:__ **`${action}`**\n\n*Messages you sent in the last 2 hours are being removed from the server. If you believe you have been hacked, change your password and enable 2FA on your Discord account. If it is just a mistake on your end, please contact the server staff to resolve the issue.*",
	honeypot_log_title: "Honeypot Triggered - ${action}",
	honeypot_log_field_author: "Author",
	honeypot_log_field_channel: "Channel",
	honeypot_log_field_message: "Deleted Message",
	honeypot_log_field_attachments: "Attachments",
	honeypot_log_field_stickers: "Stickers",
	honeypot_log_field_embeds: "Embeds",
	honeypot_log_field_deleted_messages: "Deleted Messages",
	honeypot_log_field_triggered_messages: "Triggered Messages",
	honeypot_log_field_dm_status: "DM Status",
	honeypot_log_field_result: "Result",
	honeypot_log_dm_open: "Delivered",
	honeypot_log_dm_closed: "Closed or unreachable",
	honeypot_log_no_content: "No text content",
	honeypot_log_action_ban: "Banned user",
	honeypot_log_action_kick: "Kicked user",
	honeypot_log_action_none: "No action taken",

	// TTS module
	// /tts join, /tts leave, /tts info, /tts lang

	help_tts_fields: "TTS",
	help_tts_dsc:
		"> *Transform text into speech in voice channels with iHorizon!*",

	// /tts join
	tts_join_not_in_voice:
		"${emoji_No} You must be connected to a voice channel to use this command!",
	tts_join_already_enabled:
		"${emoji_No} The TTS module is already enabled on this server!",
	tts_join_music_playing:
		"${emoji_No} Music is currently playing on this server. Please stop the music before enabling TTS.",
	tts_join_enabled:
		"${emoji_Yes} TTS mode has been enabled in ${voiceChannel}!",
	tts_join_error: "${emoji_No} An error occurred while enabling TTS mode.",
	tts_join_lang_fallback: "en-US",

	// /tts leave
	tts_leave_not_active:
		"${emoji_No} The TTS module is not currently active on this server!",
	tts_leave_not_in_voice:
		"${emoji_No} You must be in the TTS voice channel to disable it!",
	tts_leave_disabled:
		"${emoji_Yes} TTS mode has been disabled on this server!",

	// /tts info
	tts_info_embed_title: "TTS Module Information",
	tts_info_embed_description:
		"The TTS (Text-to-Speech) module allows iHorizon to read messages aloud in a voice channel. When enabled, every message sent in the configured text channel by members who are in the voice channel will be spoken by iHorizon.",
	tts_info_field_status: "Status",
	tts_info_field_lang: "TTS Language",
	tts_info_field_howto: "How to use",
	tts_info_howto_value:
		"Use `/tts join` to start TTS in your voice channel.\nUse `/tts leave` to stop TTS.\nUse `/tts lang` to change the voice language.",

	// /tts lang
	tts_lang_not_active:
		"${emoji_No} The TTS module is not currently active on this server!",
	tts_lang_set:
		"${emoji_Yes} The TTS language has been set to `${language}`.",

	// TTS Embed
	tts_embed_title: "TTS Mode Activated",
	tts_embed_description:
		"The TTS module is now active in ${voiceChannel}.\nAll messages sent here by members in the voice channel will be read aloud.\n\n**Members in voice:** ${members}",
	tts_embed_footer: "Use /tts leave to stop TTS",
	tts_join_not_text_based:
		"${emoji_No} This voice channel does not support text messages. Please enable text-in-voice or use another voice channel.",
	tts_music_blocked:
		"${emoji_No} The TTS module is currently active. Please disable TTS before playing music.",
	tts_voice_status: "TTS Mode - Text-to-Speech",

	// H24/7 module
	// /h247 join, /h247 leave

	help_h247_fields: "H24/7",
	help_h247_dsc: "> *Keep iHorizon connected 24/7 in a voice channel!*",

	// /h247 join
	h247_join_invalid_channel:
		"${emoji_No} Please provide a valid voice channel!",
	h247_join_already_active:
		"${emoji_No} The H24/7 module is already active in ${voiceChannel}!",
	h247_join_music_playing:
		"${emoji_No} Music is currently playing on this server. Please stop the music before enabling the H24/7 module.",
	h247_join_tts_active:
		"${emoji_No} The TTS module is currently active in another voice channel. Please disable TTS before enabling the H24/7 module.",
	h247_joined:
		"${emoji_Yes} iHorizon will stay connected 24/7 in ${voiceChannel}!",
	h247_join_error:
		"${emoji_No} An error occurred while enabling the H24/7 module.",

	// /h247 leave
	h247_leave_not_active:
		"${emoji_No} The H24/7 module is not currently active on this server!",
	h247_left:
		"${emoji_Yes} The H24/7 module has been disabled on this server!",
	h247_leave_error:
		"${emoji_No} An error occurred while disabling the H24/7 module.",

	// /h247 info
	h247_info_embed_title: "H24/7 Module Information",
	h247_info_embed_description:
		"The H24/7 module keeps iHorizon connected to a voice channel around the clock, even with nothing playing. It is useful to keep a server's voice streak alive.\nWhile this module is enabled, music and TTS can only run inside the H24/7 voice channel.\nThe connection automatically recovers after restarts or player shutdowns.",
	h247_info_field_status: "Status",
	h247_info_field_howto: "How to use",
	h247_info_howto_value:
		"Use `/h247 join` to park iHorizon in a voice channel.\nUse `/h247 leave` to disable the module.\nUse `/h247 info` to display this panel.",

	// /music play
	h247_play_refused:
		"${emoji_No} The H24/7 module is active on this server. Join the H24/7 voice channel to play music!",

	// /tts join
	h247_tts_refused:
		"${emoji_No} The H24/7 module is active on this server. Join the H24/7 voice channel to enable TTS!",
	gw_go_duration_too_low: "${emoji_No} | The minimum duration is 3 minutes!",

	// Components V2 cards: /avatar, /serverinfo, /allbots
	avatar_card_title: "${user}'s avatar",
	card_download: "Download",
	serverinfo_label_owner: "Owner",
	serverinfo_label_members: "Members",
	serverinfo_label_created: "Created",
	serverinfo_label_joined: "You joined",
	serverinfo_label_roles: "Roles",
	serverinfo_label_channels: "Channels",
	serverinfo_label_boosts: "Boosts",
	serverinfo_boost_value: "${count} (level ${tier})",
	serverinfo_label_verification: "Verification",
	serverinfo_label_language: "Language",
	serverinfo_label_id: "ID",
	serverinfo_verif_none: "None",
	serverinfo_verif_low: "Low",
	serverinfo_verif_medium: "Medium",
	serverinfo_verif_high: "High",
	serverinfo_verif_highest: "Highest",
	all_bots_card_title: "Bots on ${guild}",
	all_bots_card_count: "${count} bots",
	all_bots_none: "There is no bot on this server.",

	// Components V2 cards: /unbanall, /media-only, /nick-kicker, /sync, /wlroles
	unbanall_card_progress: "Unbanning `${count}` members…",
	unbanall_card_undo_progress: "Banning `${count}` members again…",
	unbanall_card_title: "Unban all",
	unbanall_card_undo_title: "Unban all undone",
	unbanall_label_unbanned: "Unbanned",
	unbanall_label_banned: "Banned again",
	unbanall_label_failed: "Failed",
	sync_card_title: "Permissions synchronized",
	sync_card_desc: "These channels now follow the permissions of ${category}:",
	media_only_card_title: "Media-only channels",
	utils_label_save: "Save",
	nick_kicker_card_title: "Nickname kicker",
	nick_kicker_label_status: "Status",
	nick_kicker_label_words: "Words",
	wlroles_card_title: "Whitelisted roles",
	wlroles_card_warn_title: "Dangerous permissions",
	wlroles_card_high_title: "Roles above mine",

	// Components V2 cards: /userinfo, /banner, /inviteinfo, /serverpic, /where, /vc, /snipe
	userinfo_label_badges: "Badges",
	userinfo_label_username: "Username",
	userinfo_label_created: "Account created",
	userinfo_label_joined: "Joined the server",
	userinfo_label_nitro: "Nitro",
	userinfo_label_roles: "Roles",
	userinfo_label_id: "ID",
	userinfo_card_loading: "Loading the profile…",
	banner_card_guild_title: "${guild}'s banner",
	banner_card_user_title: "${user}'s banner",
	inviteinfo_label_channel: "Channel",
	inviteinfo_label_inviter: "Invited by",
	inviteinfo_label_created: "Server created",
	inviteinfo_label_expires: "Expires",
	inviteinfo_label_members: "Members",
	inviteinfo_label_online: "Online",
	inviteinfo_label_boosts: "Boosts",
	inviteinfo_label_features: "Features",
	serverpic_card_title: "${guild}'s icon",
	serverpic_card_no_icon: "This server has no icon.",
	where_card_title: "Where is ${member}",
	where_label_member: "Member",
	where_label_channel: "Voice channel",
	where_label_stream: "Streaming",
	where_label_video: "Camera",
	where_label_mute: "Self mute",
	where_label_deaf: "Self deaf",
	vc_card_title: "Voice activity",
	vc_label_members: "Members",
	vc_label_online: "Online",
	vc_label_in_voice: "In voice",
	vc_label_streaming: "Streaming",
	vc_label_boosts: "Boosts",
	vc_label_camera: "Camera on",
	vc_label_muted: "Muted",
	snipe_card_title: "Last deleted message",
	snipe_label_author: "Author",
	snipe_label_sent: "Sent",

	// Components V2 cards: /delrole, /derank, /massiverole, /massmove, /nickrole, /setmentionrole, /util bringall, /util move
	utils_label_member: "Member",
	utils_label_role: "Role",
	utils_label_by: "By",
	utils_label_failed: "Failed",
	utils_label_from: "From",
	utils_label_to: "To",
	utils_label_moved: "Moved",
	utils_label_name_filter: "Name contains",
	derank_card_progress: "Removing ${count} roles from ${member}…",
	derank_card_title: "Member deranked",
	derank_label_removed: "Roles removed",
	massiverole_card_progress_add: "Adding the role to ${count} members…",
	massiverole_card_progress_sub: "Removing the role from ${count} members…",
	massiverole_card_title_add: "Role given to members",
	massiverole_card_title_sub: "Role removed from members",
	massiverole_label_added: "Received it",
	massiverole_label_already: "Already had it",
	massiverole_label_removed: "Lost it",
	massiverole_label_without: "Did not have it",
	nickrole_label_skipped: "Skipped",
	massmove_card_title: "Members moved",
	bringall_card_title: "Members spread out",
	bringall_label_category: "Category",
	bringall_label_channels: "Voice channels",
	setmentionrole_card_title: "Mention role enabled",
	setmentionrole_card_desc:
		"When a member mentions me, I give them this role.",
	setmentionrole_card_note:
		"Only members whose username or display name contains this text get the role. If they remove it, the role is removed, and given back when they add it again.",

	// Components V2 cards: /admin-users, /admin-roles, /allwebhooks, /role-members, /prevnames, /emojis, /leashlist, /locknamelist
	card_bot: "Bot",
	card_working: "Working on it…",
	card_label_requested_by: "Requested by",
	card_label_failed: "Failed",
	admin_users_card_title: "Administrators",
	admin_users_card_count:
		"${count} members with the Administrator permission",
	admin_users_card_only_bots: "Only bots have this permission.",
	admin_users_button_hide_bots: "Hide bots",
	admin_users_button_show_bots: "Show bots",
	admin_users_card_done_title: "Administrators unranked",
	admin_users_label_unranked: "Members unranked",
	admin_roles_card_title: "Administrator roles",
	admin_roles_card_count: "${count} roles with the Administrator permission",
	admin_roles_card_managed: "Managed by an integration",
	admin_roles_card_done_title: "Admin permission removed",
	admin_roles_label_modified: "Roles modified",
	allwebhooks_card_count: "${count} webhooks",
	allwebhooks_button_delete: "Delete all",
	role_members_card_title: "Members of ${role}",
	role_members_card_count: "${count} members",
	prevnames_card_title: "${user}'s previous names",
	prevnames_card_count: "${count} names recorded",
	prevnames_button_erase: "Erase my history",
	prevnames_label_username: "Username",
	prevnames_label_display_name: "Display name",
	prevnames_label_nickname: "Nickname in ${guild}",
	emoji_card_title: "Emojis added",
	emoji_card_count: "${count} emojis created in ${guild}",
	util_leashlist_card_count: "${count} active leashes",
	util_leashlist_card_expires: "Expires",
	util_locknamelist_card_count: "${count} locked nicknames",
	util_locknamelist_card_by: "Locked by ${user}",

	// Components V2 cards: /invites, /leaderboard, /addinvites, /removeinvites
	invites_card_title: "Invite stats",
	invites_label_total: "Total",
	invites_label_regular: "Regular",
	invites_label_left: "Left",
	invites_label_bonus: "Bonus",
	invites_label_invited_by: "Invited by",
	leaderboard_card_title: "Invites leaderboard",
	leaderboard_card_count: "${count} ranked members in ${guild}",
	leaderboard_card_your_rank:
		"Your rank: ${rank}/${count} with ${invites} invites",
	leaderboard_card_not_ranked: "You are not ranked yet.",
	leaderboard_card_empty: "Nobody has invites on this server yet.",
	leaderboard_card_generated: "Generated in ${elapsed} ms",

	// Components V2 cards: /fun caracteres, catsay, hack, hug, kiss, slap, love, poll, question, tweet, youtube
	caracteres_card_title: "Pick a text style",
	caracteres_card_result_title: "Your text in ${style}",
	caracteres_label_original: "Original",
	caracteres_label_converted: "Transformed",
	catsay_card_title: "The cat has spoken",
	hack_card_title: "Hack complete",
	hack_label_ip: "IP address",
	hack_label_email: "Email",
	hack_label_password: "Password",
	hug_card_title: "Hug time",
	hug_card_desc: "${author} gives ${target} a big hug.",
	kiss_card_title: "Smooch",
	kiss_card_desc: "${author} gives ${target} a kiss.",
	slap_card_title: "Slap",
	slap_card_desc: "${author} slaps ${target}.",
	love_card_title: "Love calculator",
	love_card_desc: "**${user1}** + **${user2}** = `${percent}%` of love",
	poll_card_title: "Poll by ${author}",
	poll_card_vote: "React with ${yes} for yes or ${no} for no.",
	question_card_title: "${author} asks",
	question_label_question: "Question",
	question_label_answer: "Answer",
	tweet_card_title: "New post from ${user}",
	youtube_card_title: "New comment from ${user}",

	// Components V2 cards: fun animal pictures (/cat /dog /dolphin /duck /fox /frog /panda /squirrel) and random results (/dice /heads-tails /number /rate /gay /trans /stench /transgender)
	fun_card_cat_title: "Meow",
	fun_card_dog_title: "Woof woof",
	fun_card_dolphin_title: "Eee-eee, click click",
	fun_card_duck_title: "Quack quack",
	fun_card_fox_title: "Wa-pa-pa-pa-pa",
	fun_card_frog_title: "Croak croak",
	fun_card_panda_title: "Mwaa",
	fun_card_squirrel_title: "Chit-chit",
	fun_card_animal_hint: "A random picture, just for you.",
	fun_card_dice_title: "Dice roll",
	fun_card_coinflip_title: "Heads or tails",
	fun_card_number_title: "Random number",
	fun_card_gay_title: "Gay meter",
	fun_card_trans_title: "Trans meter",
	fun_card_stench_title: "Stench meter",
	fun_card_rate_title: "My rating",
	fun_card_transgender_title: "Trans pride avatar",
	fun_label_dice: "Dice",
	fun_label_rolls: "Rolls",
	fun_label_total: "Total",
	fun_label_result: "Result",
	fun_label_range: "Range",
	fun_label_score: "Score",
	fun_label_rated: "Rated",

	// Components V2 cards: /ban, /kick, /baninfo, /banlist, /mutelist, /warnlist, /unwarn, /rolepanel
	mod_label_moderator: "Moderator",
	mod_label_warn_id: "Warn ID",
	ban_card_title: "Member banned",
	kick_card_title: "Member kicked",
	baninfo_card_title: "${user}'s ban",
	banlist_card_title: "Banned members",
	banlist_card_count: "${count} banned members",
	mutelist_card_title: "Members in timeout",
	mutelist_card_count: "${count} members in timeout",
	mutelist_card_ends: "Ends ${time}",
	mutelist_button_unmute_all: "Remove all timeouts",
	mutelist_card_cleared_title: "Timeouts removed",
	mutelist_card_cleared_desc: "${count} members can talk again.",
	warnlist_card_title: "${user}'s warnings",
	warnlist_card_count: "${count} warnings",
	unwarn_card_title: "Warning removed",
	rolepanel_card_done_title: "Roles updated",
	rolepanel_label_added: "Added",
	rolepanel_label_removed: "Removed",
	rolepanel_label_refused: "Refused",

	// /stats rebuilt: Components V2 card and resvg pages
	stats_locale: "en-US",
	stats_view_overview: "Overview",
	stats_view_overview_desc: "Totals, trend and favourite channels",
	stats_view_rhythm: "Rhythm",
	stats_view_rhythm_desc: "When it happens, hour by hour",
	stats_view_members: "Members",
	stats_view_members_desc: "Who talks and who hangs out in voice",
	stats_view_channels: "Channels",
	stats_view_channels_desc: "The busiest text and voice channels",
	stats_select_placeholder: "Choose a view",
	stats_label_messages: "Messages",
	stats_label_voice: "Voice time",
	stats_label_active_days: "Active days",
	stats_label_rank: "Server rank",
	stats_label_active_members: "Active members",
	stats_label_members: "Members",
	stats_label_peak: "Peak",
	stats_label_avg_length: "Average length",
	stats_label_sessions: "Voice sessions",
	stats_label_longest_session: "Longest session",
	stats_label_best_streak: "Best streak",
	stats_note_change_up: "+${change} % vs last week",
	stats_note_change_down: "-${change} % vs last week",
	stats_note_new: "New this week",
	stats_note_steady: "Same as last week",
	stats_note_streak: "${days}-day streak",
	stats_note_rank_of: "of ${count} members",
	stats_note_unranked: "Not ranked yet",
	stats_note_chars: "characters per message",
	stats_note_avg_session: "${duration} on average",
	stats_note_days_in_row: "days in a row",
	stats_chart_daily: "Daily activity",
	stats_chart_voice_minutes: "Voice (min)",
	stats_chart_messages_per_day: "Messages per day",
	stats_text_channels: "Text channels",
	stats_voice_channels: "Voice channels",
	stats_top_messages: "Most messages",
	stats_top_voice: "Most voice time",
	stats_heat_messages: "Messages",
	stats_heat_voice: "Voice",
	stats_peak_note: "Peak: ${day} ${hour}",
	stats_empty: "Nothing yet",
	stats_footer_zone: "Times in ${zone} · last 30 days",
	stats_title_user: "${user}'s activity",
	stats_title_guild: "Activity on ${guild}",
	stats_title_channel: "Activity in ${channel}",
	stats_title_compare: "${a} and ${b}",
	stats_title_top_messages: "Top messages",
	stats_title_top_voice: "Top voice",
	stats_period_1d: "Last 24 hours",
	stats_period_7d: "Last 7 days",
	stats_period_30d: "Last 30 days",
	stats_insight_peak: "Most active on ${day} around ${hour}.",
	stats_insight_up: "${change} % more messages than last week.",
	stats_insight_down: "${change} % fewer messages than last week.",
	stats_insight_channel: "Favourite channel: ${channel}.",
	stats_insight_streak: "Active ${days} days in a row.",
	stats_insight_leader: "${user} leads with ${value}.",
	stats_insight_compare: "${user} is ahead on ${count} of ${total} measures.",
	stats_insight_tie: "Neck and neck.",
	stats_compare_same: "Pick two different members.",
	stats_wrong_channel: "Pick a text or voice channel.",

	// /stats rebuilt: Components V2 card and resvg pages
	stats_card_no_data: "No activity recorded in the last 30 days.",

	// /music apo panel
	music_apo_panel_title: "Equalizer APO",
	music_apo_panel_on: "Module on",
	music_apo_panel_off: "Module off",
	music_apo_panel_applied: "Applied by default: **${name}**",
	music_apo_panel_nothing_applied: "No config applied by default",
	music_apo_panel_count:
		"${count}/${max} configs · the applied one shapes everything the server plays",
	music_apo_panel_empty:
		"No config yet. Add an Equalizer APO .txt file with the button below.",
	music_apo_badge_applied: "Applied",
	music_apo_badge_frozen: "Frozen",
	music_apo_config_meta:
		"by ${user} · updated ${time} · ${lines} lines · ${size}",
	music_apo_button_manage: "Manage",
	music_apo_button_add: "Add a config",
	music_apo_button_enable: "Turn on",
	music_apo_button_disable: "Turn off",
	music_apo_button_apply: "Apply by default",
	music_apo_button_unapply: "Stop applying",
	music_apo_button_rename: "Rename",
	music_apo_button_replace: "Replace file",
	music_apo_button_freeze: "Freeze",
	music_apo_button_unfreeze: "Unfreeze",
	music_apo_button_delete: "Delete",
	music_apo_button_confirm_delete: "Delete for good",
	music_apo_button_cancel: "Cancel",
	music_apo_frozen_note:
		"Frozen by ${user}: it can be applied, not renamed, replaced or deleted.",
	music_apo_confirm_delete: "Delete **${name}**? This can't be undone.",
	music_apo_modal_add_title: "Add an APO config",
	music_apo_modal_replace_title: "Replace the file",
	music_apo_modal_rename_title: "Rename the config",
	music_apo_field_name: "Name",
	music_apo_field_name_desc: "Shown in the panel, ${max} characters at most",
	music_apo_field_file: "Equalizer APO file",
	music_apo_field_file_desc:
		"A .txt file, ${kb} KiB and ${lines} command lines at most",
	music_apo_no_permission:
		"${emoji} Only the server's administrators and owners can manage its APO configs.",
	music_apo_full:
		"${emoji} This server already has ${max} configs. Delete one first.",
	music_apo_name_taken: "${emoji} A config is already called **${name}**.",
	music_apo_name_empty: "${emoji} Give the config a name.",
	music_apo_not_txt: "${emoji} Send a .txt file.",
	music_apo_too_big: "${emoji} The file is over ${kb} KiB.",
	music_apo_too_many_lines:
		"${emoji} The file has more than ${lines} command lines.",
	music_apo_empty_file: "${emoji} The file is empty.",
	music_apo_frozen: "${emoji} **${name}** is frozen: unfreeze it first.",
	music_apo_cannot_unfreeze:
		"${emoji} Only ${user}, the server owners or the bot owners can unfreeze it.",
	music_apo_saved: "${emoji} **${name}** saved (${stages} stages).",
	// ?status-embed
	status_panel_title: "# ${emoji_Logo} iHorizon Status",
	status_panel_headline:
		"${state} **${label}** · ${upCount}/${totalCount} services online",
	status_panel_label_operational: "All systems operational",
	status_panel_label_maintenance: "Maintenance in progress",
	status_panel_label_degraded: "Partial outage",
	status_panel_label_major: "Major outage",
	status_panel_button: "Status page",
	status_panel_group: "### ${emoji_Server_Stats} ${name}",
	status_panel_group_core: "Core services",
	status_panel_service_gateway: "HorizonGateway (API)",
	status_panel_service_lavalink: "Lavalink (music)",
	status_panel_service_website: "iHorizon website",
	status_panel_row: "${status} **${name}** · ${detail}",
	status_panel_row_detail: "`${ping} ms` · `${uptime}`",
	status_panel_row_offline: "Offline",
	status_panel_row_maintenance: "In maintenance",
	status_panel_row_pending: "Checking",
	status_panel_incident: "### ${emoji_Warning_Icon} ${title}\n${content}",
	status_panel_footer:
		"-# ${emoji_Timer} Updated ${time} · refreshes every minute",
	status_panel_kuma_unavailable:
		"-# ${emoji_Warn} Uptime Kuma is unreachable, showing the bot's own checks.",
	status_panel_loading:
		"${emoji_Discord_Loading} Loading the status panel...",
	status_panel_card_title: "Infrastructure status",
	status_panel_card_summary: "${upCount}/${totalCount} services online",
	status_panel_card_uptime_24h: "Uptime 24h",
	status_panel_card_uptime_30d: "Uptime 30d",
	status_panel_card_response: "Average response",
	status_panel_card_ws: "Discord ping",
	status_panel_card_col_history: "Last 60 checks",
	status_panel_card_col_ping: "Ping",
	status_panel_card_col_uptime: "30d",
	status_panel_card_chart: "Average response time"
};

export default enUS;

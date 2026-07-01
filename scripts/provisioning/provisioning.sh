# 
# iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
#
# Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)
#
# Under the following terms:
# 
# - Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. 
#   You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
#
# - NonCommercial — You may not use the material for commercial purposes.
#
# - ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same 
#   license as the original.
#
# - No additional restrictions — You may not apply legal terms or technological measures that legally restrict others 
#   from doing anything the license permits.
#
# Mainly developed by Ether (https://gitlab.com/veryuhq)
#
# Copyright © 2020-2026 iHorizon
#

#!/bin/bash

# Colors in ANSI Escape codes 
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DEFAULT='\033[0m'

set -euo pipefail
cd ~

# Pre-checks
# pm2 only supports systemd and openrc for pm2 startup. pm2 also supports some other niche init systems for pm2 startup, but they are not very common and thus not supported by this script.
if ! command -v systemctl &>/dev/null && ! command -v rc-status &>/dev/null; then
    echo -e "${YELLOW}The script is unable to run because no supported init system is installed. As a reminder, pm2 only supports systemd and openrc for the pm2 startup command, which is used in this script to make the bot launch at startup.${DEFAULT}"
    exit 1
fi

# Currently this script only works with Ubuntu/Debian-based distributions, multi-distro support might come soon.
# Check if apt is installed. It's a pretty good technique to know if the computer is on an Ubuntu/Debian-based distro
if ! command -v apt &>/dev/null; then
	echo -e "${RED}You are not on an Ubuntu/Debian-based distribution!${DEFAULT}"
	exit 1
fi

# Introduction
echo -e "
██╗██╗  ██╗ ██████╗ ██████╗ ██╗███████╗ ██████╗ ███╗   ██╗
██║██║  ██║██╔═══██╗██╔══██╗██║╚══███╔╝██╔═══██╗████╗  ██║
██║███████║██║   ██║██████╔╝██║  ███╔╝ ██║   ██║██╔██╗ ██║
██║██╔══██║██║   ██║██╔══██╗██║ ███╔╝  ██║   ██║██║╚██╗██║
██║██║  ██║╚██████╔╝██║  ██║██║███████╗╚██████╔╝██║ ╚████║
╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝                                                                                                 "
echo -e -e "${YELLOW}⚠️  THIS SCRIPT IS IN BETA. EXPECT BUGS, BREAKING CHANGES, AND ISSUES. USE IT AT YOUR OWN RISK! WE WILL NOT BE RESPONSIBLE FOR ANY DAMAGE DONE TO YOUR SYSTEM! ⚠️${DEFAULT}"
echo -e "${BOLD}Welcome to the iHorizon Bot provisioning script.${DEFAULT}"
echo -e "${BOLD}This will automate the installation of iHorizon's much-needed dependencies, make the bot running and working properly.${DEFAULT}"
echo -e "${BOLD}If you don't trust this script, you can still open it with any text editor of your choice and check it yourself :)${DEFAULT}"
echo -e "${BOLD}After all, no personal information is sent outside of this computer by this script.${DEFAULT}"

# Ask the user if they want to continue
read -p "$(echo -e "${BOLD}DO YOU WANT TO CONTINUE? (y/n): ${DEFAULT}")" user_choice < /dev/tty

# Convert to lowercase for consistency
user_choice=$(echo -e "$user_choice" | tr '[:upper:]' '[:lower:]')

# Managing user choice / Exit mechanism
if [[ "$user_choice" == "y" || "$user_choice" == "yes" ]]; then
    echo -e "${GREEN}Okay. Proceeding with the provisioning...${DEFAULT}"

elif [[ "$user_choice" == "n" || "$user_choice" == "no" ]]; then
    echo -e "${RED}Provisioning cancelled by the user. Exiting...${DEFAULT}"
    exit 0

else
    echo -e "${RED}Invalid input. Please enter y/yes or n/no.${DEFAULT}"
    exit 1
fi	

	# Updating local repos to be up-to-date with remote repos
	sudo apt update && sudo apt upgrade -y

	# Checking if necessary packages are already installed
	echo -e "${BOLD}Checking if necessary packages are already installed...${DEFAULT}"
    
	# Check if git and curl are installed; if not, install them
	if ! command -v git &>/dev/null; then
		echo -e "${BOLD}git is not installed, installing...${DEFAULT}"
		sudo apt install -y git
	else
		echo -e "${GREEN}git is already installed!${DEFAULT}"
	fi
	
	if ! command -v curl &>/dev/null; then
		echo -e "${BOLD}curl is not installed, installing...${DEFAULT}"
		sudo apt install -y curl
	else
		echo -e "${GREEN}curl is already installed!${DEFAULT}"
	fi

	if ! command -v bun &>/dev/null; then
		echo -e "${BOLD}bun is not installed, installing...${DEFAULT}"
		curl -fsSL https://bun.sh/install | bash
	else
		echo -e "${GREEN}bun is already installed!${DEFAULT}"
	fi

	# Always ensure bun is in PATH for the current shell session regardless of
	# whether it was just installed or already present
	export BUN_INSTALL="$HOME/.bun"
	export PATH="$BUN_INSTALL/bin:$PATH"

	# Only write the bun export to .bashrc if it isn't already there, preventing the file from being flooded on repeated script runs.
	if ! grep -q 'BUN_INSTALL' "$HOME/.bashrc"; then
		echo 'export BUN_INSTALL="$HOME/.bun"' >> "$HOME/.bashrc"
		echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> "$HOME/.bashrc"
	fi

	source "$HOME/.bashrc"

	if ! command -v node &>/dev/null; then
		echo -e "${BOLD}node is not installed, installing...${DEFAULT}"
		# Installing nvm
		curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
		# Instead of relaunching the shell...
        \. ".nvm/nvm.sh"
		# Install node LTS
        nvm install --lts
    else
		echo -e "${GREEN}node is already installed!${DEFAULT}"
	fi	
    
	sudo ln -sf "$(realpath $(which node))" /usr/local/bin/node

	if ! command -v pm2 &>/dev/null; then 
		echo -e "${BOLD}pm2 is not installed, installing...${DEFAULT}"
		npm install -g pm2
		sudo ln -sf "$HOME/.bun/bin/pm2" /usr/local/bin/pm2
	else 
		echo -e "${GREEN}pm2 is already installed!${DEFAULT}"
	fi

    # We use flatpak to install Chromium easily
	if ! command -v flatpak &>/dev/null; then 
		echo -e "${BOLD}flatpak is not installed, installing...${DEFAULT}"
		sudo apt install -y flatpak
		# Setting up the Flathub repo with the --user parameter
		flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
	else 
		echo -e "${GREEN}flatpak is already installed!${DEFAULT}"
	fi

	# Install Chromium
	flatpak install -y flathub org.chromium.Chromium

	if apt list --installed | grep -q fonts-noto-color-emoji; then
		echo -e "${GREEN}fonts-noto-color-emoji is already installed!${DEFAULT}"
	else
		echo -e "${BOLD}fonts-noto-color-emoji is not installed, installing...${DEFAULT}"
		sudo apt install -y fonts-noto-color-emoji		
	fi

	if apt list --installed | grep -q xvfb; then
		echo -e "${GREEN}xvfb is already installed!${DEFAULT}"
	else
		echo -e "${BOLD}xvfb is not installed, installing...${DEFAULT}"
		sudo apt install -y xvfb	
	fi

	if apt list --installed | grep -q melt; then
		echo -e "${GREEN}melt is already installed!${DEFAULT}"
	else
		echo -e "${BOLD}melt is not installed, installing...${DEFAULT}"
		sudo apt install -y melt
	fi

	# Asking the user which Git branch should be cloned
	echo -e "${BOLD}What branch do you want to clone? :${DEFAULT}"
	select git_branch in "production" "dev" "ownihrz"; do
		case $git_branch in
			"production")
				echo -e "${CYAN}You selected the production branch${DEFAULT}"
				git_branch="production"
				break
				;;
			"dev")
				echo -e "${CYAN}You selected the dev branch${DEFAULT}"
				git_branch="dev"
				break
				;;
			"ownihrz")
				echo -e "${CYAN}You selected the ownihrz branch${DEFAULT}"
				git_branch="ownihrz"
				break
				;;
			*)
				echo -e "${RED}Invalid choice. Try again!${DEFAULT}"
				;;
		esac	
	done

	# Cloning the GitLab repo with the chosen branch
	echo -e "${BOLD}Cloning the iHorizon GitLab repository...${DEFAULT}"
	if [ -d "ihrz" ]; then
    	echo -e "${YELLOW}iHorizon Bot git directory already exists, pulling latest changes instead...${DEFAULT}"
    	cd ihrz
    	git pull origin "$git_branch"
	else
		git clone -b "$git_branch" https://gitlab.com/ihrz/ihrz.git
		cd ihrz
	fi		

	# Step 3 : installing the dependencies
	bun i 

	# Step 4 : creating config.ts from config.example.ts (leaving it untouched)
	cp src/files/config.example.ts src/files/config.ts

	# Step 5 : Interactive setup

	# Introduction
	echo -e "${BOLD}Welcome to the iHorizon Interactive Setup!${DEFAULT}"
	echo -e "${BOLD}We will now ask you questions to help you configure and run your bot in an easy and convenient way.${DEFAULT}"
	
	# Ask for Discord Bot Token
	read -p "$(echo -e "${CYAN}Enter your Discord Bot Token: ${DEFAULT}")" bot_token < /dev/tty

	# Ask for how many owners the user wants
	read -p "$(echo -e "${CYAN}How many owners do you want to configure? ${DEFAULT}")" number_owners < /dev/tty

	# Initialize an empty array to hold the owner user IDs
	owner_user_ids=()

	# Loop through and ask for each owner's user ID
	for ((i=1; i<=number_owners; i++)); do
    read -p "$(echo -e "${CYAN}Enter the user ID of owner #$i: ${DEFAULT}")" owner_id < /dev/tty
    owner_user_ids+=("$owner_id")
	done

    owner_user_ids_string=$(printf '"%s",' "${owner_user_ids[@]}")
	owner_user_ids_string="${owner_user_ids_string%,}"

	# Ask if phone presence should be enabled
	read -p "$(echo -e "${CYAN}Do you want to enable phone presence? (y/n): ${DEFAULT}")" phone_presence_choice < /dev/tty
	if [[ "$phone_presence_choice" == "y" || "$phone_presence_choice" == "yes" ]]; then
    	phone_presence=true
	else
    	phone_presence=false
	fi

	# Ask if they want to enable messageCommandsMention
	read -p "$(echo -e "${CYAN}Do you want to enable messageCommandsMention. If enabled, all bot commands will have to be triggered by mentioning the bot, then specifying the command. Thus, no prefix will be set! [DEFAULT IS NO] (y/n) ${DEFAULT}")" message_commands_mention < /dev/tty
	if [[ "$message_commands_mention" == "y" || "$message_commands_mention" == "yes" ]]; then 
		message_commands_mention=true
	else
		message_commands_mention=false
	fi

	# Ask for the default message command prefix
	read -p "$(echo -e "${CYAN}Enter the default message command prefix (default is '?'): ${DEFAULT}")" message_commands_prefix < /dev/tty
	message_commands_prefix="${message_commands_prefix:-?}"  # Default to '?' if no input is provided

	# Ask if the user wants to set up Lavalink for the music module
	read -p "$(echo -e "${CYAN}Do you want to set up Lavalink to make the music module work? (y/n): ${DEFAULT}")" setup_lavalink_choice < /dev/tty
	setup_lavalink_choice=$(echo -e "$setup_lavalink_choice" | tr '[:upper:]' '[:lower:]')

	lavalink_logs_channel_id=""

	if [[ "$setup_lavalink_choice" == "y" || "$setup_lavalink_choice" == "yes" ]]; then
    	# Ask for Lavalink node details
    	read -p "$(echo -e "${CYAN}Enter the Lavalink Node ID (e.g., 'example_node'): ${DEFAULT}")" lavalink_node_id < /dev/tty
    	read -p "$(echo -e "${CYAN}Enter the Lavalink Node host (e.g., 'lavalink.example.com'): ${DEFAULT}")" lavalink_node_host < /dev/tty
    	read -p "$(echo -e "${CYAN}Enter the Lavalink Node port (default is 2333): ${DEFAULT}")" lavalink_node_port < /dev/tty
    	lavalink_node_port="${lavalink_node_port:-2333}"  # Default to 2333 if no input is provided
    	read -p "$(echo -e "${CYAN}Enter the Lavalink Node password (e.g., 'password'): ${DEFAULT}")" lavalink_node_password < /dev/tty
    	read -p "$(echo -e "${CYAN}Is the Lavalink Node secure (y/n)? (default is no): ${DEFAULT}")" lavalink_secure_choice < /dev/tty
    	if [[ "$lavalink_secure_choice" == "y" || "$lavalink_secure_choice" == "yes" ]]; then
        	lavalink_secure=true
    	else
        	lavalink_secure=false
    	fi
		read -p "$(echo -e "${CYAN}Enter the Discord channel ID for Lavalink logs (leave blank for none): ${DEFAULT}")" lavalink_logs_channel_id < /dev/tty
		lavalink_logs_channel_id="${lavalink_logs_channel_id:-""}"
	else
    	echo -e "${YELLOW}Skipping Lavalink setup.${DEFAULT}"
    	lavalink_node_id="example_node"
    	lavalink_node_host="lavalink.example.com"
    	lavalink_node_port="2333"
    	lavalink_node_password="password"
    	lavalink_secure=false
	fi

	# Ask for devMode (Development Mode)
	read -p "$(echo -e "${CYAN}Do you want to enable development mode (devMode)? (y/n, default is no): ${DEFAULT}")" dev_mode_choice < /dev/tty
	dev_mode_choice=$(echo -e "$dev_mode_choice" | tr '[:upper:]' '[:lower:]')
	if [[ "$dev_mode_choice" == "y" || "$dev_mode_choice" == "yes" ]]; then
    	dev_mode=true
	else
    	dev_mode=false
	fi

	# Ask for the image URL for blacklist embeds
	read -p "$(echo -e "${CYAN}Enter the image URL for the blacklist embed (e.g., 'https://website.com/image.png'): ${DEFAULT}")" blacklist_picture_url < /dev/tty

	# Ask for always100 setting
	echo -e "${CYAN}Enter pairs of user IDs that will always have 100% love. (Enter each pair and press Enter, type 'done' when finished):${DEFAULT}"
	always100_ids=()
	while true; do
    	read -p "$(echo -e "${CYAN}User ID #1 (or 'done' to stop): ${DEFAULT}")" user_id_one < /dev/tty
    	if [[ "$user_id_one" == "done" ]]; then
        	break
    	fi
    	read -p "$(echo -e "${CYAN}User ID #2: ${DEFAULT}")" user_id_two < /dev/tty
    	always100_ids+=("${user_id_one}x${user_id_two}")
	done

	# Ask for the Guild Logs Channel ID
	read -p "$(echo -e "${CYAN}Enter the Discord channel ID for guild logs: ${DEFAULT}")" guild_logs_channel_id < /dev/tty

	# Ask for the Report Channel ID
	read -p "$(echo -e "${CYAN}Enter the Discord channel ID for bug reports: ${DEFAULT}")" report_channel_id < /dev/tty

	# Ask for the API Token
	read -p "$(echo -e "${CYAN}Enter your API token (for secure requests): ${DEFAULT}")" api_token < /dev/tty

	# Ask for database method
	read -p "$(echo -e "${CYAN}Do you want to use SQLite or MySQL for the database? (sqlite/mysql, default is sqlite): ${DEFAULT}")" db_method_choice < /dev/tty
	db_method_choice=$(echo -e "${db_method_choice:-sqlite}" | tr '[:upper:]' '[:lower:]')

	if [[ "$db_method_choice" == "mysql" ]]; then
    	read -p "$(echo -e "${CYAN}Enter the MySQL host: ${DEFAULT}")" mysql_host < /dev/tty
    	read -p "$(echo -e "${CYAN}Enter the MySQL password: ${DEFAULT}")" mysql_password < /dev/tty
    	read -p "$(echo -e "${CYAN}Enter the MySQL database name: ${DEFAULT}")" mysql_database < /dev/tty
    	read -p "$(echo -e "${CYAN}Enter the MySQL user: ${DEFAULT}")" mysql_user < /dev/tty
    	read -p "$(echo -e "${CYAN}Enter the MySQL port (default is 3306): ${DEFAULT}")" mysql_port < /dev/tty
    	mysql_port="${mysql_port:-3306}"
	else
    	echo -e "${YELLOW}Using SQLite (default).${DEFAULT}"
    	db_method_choice="sqlite"
	fi

	# Modifying the config.ts file now

	echo -e "${BOLD}Modifying the configuration file...${DEFAULT}"

	# Replace the placeholders in config.ts with the provided user input
	sed -i "s|THE BOT TOKEN|$bot_token|g" src/files/config.ts
	sed -i "s|phonePresence: false|phonePresence: $phone_presence|g" src/files/config.ts
	sed -i "s|messageCommandsMention: true|messageCommandsMention: $message_commands_mention|g" src/files/config.ts
	sed -i "s|defaultMessageCommandsPrefix: \"?\"|defaultMessageCommandsPrefix: \"$message_commands_prefix\"|g" src/files/config.ts
	sed -i "s|id: \"example_node\"|id: \"$lavalink_node_id\"|g" src/files/config.ts
	sed -i "s|host: \"lavalink.example.com\"|host: \"$lavalink_node_host\"|g" src/files/config.ts
	sed -i "s|port: 2333|port: $lavalink_node_port|g" src/files/config.ts
	sed -i "s|authorization: \"password\"|authorization: \"$lavalink_node_password\"|g" src/files/config.ts
	sed -i "s|secure: false|secure: $lavalink_secure|g" src/files/config.ts
	sed -i "s|guildLogsChannelID: \"The Discord Channel ID for logs when guildCreate/guildRemove\"|guildLogsChannelID: \"$guild_logs_channel_id\"|g" src/files/config.ts
	sed -i "s|lavalinkLogsChannelID: \"\"|lavalinkLogsChannelID: \"$lavalink_logs_channel_id\"|g" src/files/config.ts
	sed -i "s|reportChannelID: \"The Discord Channel ID for logs when bugs are reported\"|reportChannelID: \"$report_channel_id\"|g" src/files/config.ts
	sed -i "s|apiToken: \"The API token\"|apiToken: \"$api_token\"|g" src/files/config.ts
	sed -i "s|users: \\[\"User ID\", \"User ID\"\\]|users: [$owner_user_ids_string]|g" src/files/config.ts
    sed -i "s|devMode: true|devMode: $dev_mode|g" src/files/config.ts
    sed -i "s|blacklistPictureInEmbed: \"A .png URL\"|blacklistPictureInEmbed: \"$blacklist_picture_url\"|g" src/files/config.ts
	sed -i "s|method: 'sqlite'|method: '$db_method_choice'|g" src/files/config.ts
    if [[ "$db_method_choice" == "mysql" ]]; then
    	sed -i "s|host: ''|host: '$mysql_host'|g" src/files/config.ts
    	sed -i "s|password: ''|password: '$mysql_password'|g" src/files/config.ts
    	sed -i "s|database: ''|database: '$mysql_database'|g" src/files/config.ts
    	sed -i "s|user: ''|user: '$mysql_user'|g" src/files/config.ts
    	sed -i "s|port: 3306|port: $mysql_port|g" src/files/config.ts
	fi

	always100_ids_string=$(printf "'%s'," "${always100_ids[@]}")
	always100_ids_string="${always100_ids_string%,}"
	sed -i "s|always100: \\['USER_ID_ONExUSER_ID_TWO'\\]|always100: [$always100_ids_string]|g" src/files/config.ts	

	# Setting up Puppeteer/Chromium environment variable
	touch .env
	echo -e "PUPPETEER_EXECUTABLE_PATH=$HOME/.local/share/flatpak/app/org.chromium.Chromium/current/active/export/bin/org.chromium.Chromium" >> .env

    # All done!
	echo -e "${GREEN}The configuration file has been successfully edited to suit your needs. The interactive setup is now finished!${GREEN}"

	# Step 6 : Starting the bot and making it daemonized
	# Starting the bot (here the name of the daemon will be iHorizon and the interpreter will be bun)
	echo -e "${BOLD}Setting up pm2...${DEFAULT}"
	pm2 start ~/.bun/bin/bun --name "iHorizon" -- run src/index.ts
	# Save pm2 config
	pm2 save --force

	while true; do
    	read -p "Do you want to have iHorizon running every time your machine starts up? (y/n, default is no): " startup_user_choice

    	startup_user_choice=$(echo "$startup_user_choice" | tr '[:upper:]' '[:lower:]')

    	if [[ "$startup_user_choice" == "y" || "$startup_user_choice" == "yes" ]]; then
        	echo -e "${GREEN}Okay. iHorizon will now launch every time your machine starts up.${DEFAULT}"
        	eval "$(pm2 startup -u "$USER" --hp "$HOME" | tail -1)"
        	break
        elif [[ "$startup_user_choice" == "n" || "$startup_user_choice" == "no" ]]; then
        	echo -e "${YELLOW}Okay. iHorizon won't launch every time your machine starts up.${DEFAULT}"
        	break
        else
        	echo -e "${RED}Invalid input. Please enter y/yes or n/no.${DEFAULT}"
    	fi
	done

	# All done!
	echo -e "${GREEN}🎉 Congratulations! The iHorizon bot provisioning is done. Enjoy using iHorizon! 🎉${DEFAULT}"
	echo -e "${YELLOW}⚠️  But just one more thing! Execute the following command on your terminal to finish the installation : source ~/.bashrc ⚠️${DEFAULT}"
	echo -e "${CYAN}And after that you will be all set! Thank you for using the iHorizon Provisioning Script!${DEFAULT}"
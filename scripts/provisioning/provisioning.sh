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

set -euo pipefail
cd ~

# Pre-checks
# pm2 only supports systemd and openrc for pm2 startup, runit and other alternative init systems are not supported by pm2.
if ! command -v systemctl &>/dev/null && ! command -v rc-status &>/dev/null; then
    echo "The script is unable to run because no supported init system is installed."
    exit 1
fi

# Currently this script only works with Ubuntu/Debian-based distributions, multi-distro support might come soon.
# Check if apt is installed. It's a pretty good technique to know if the computer is on an Ubuntu/Debian-based distro
if ! command -v apt &>/dev/null; then
	echo "You are not on an Ubuntu/Debian-based distribution!"
	exit
fi

# Introduction
echo "⚠️  THIS SCRIPT IS IN ALPHA. EXPECT BUGS, BREAKING CHANGES, AND ISSUES. USE IT AT YOUR OWN RISK! WE WILL NOT BE RESPONSIBLE FOR ANY DAMAGE DONE TO YOUR SYSTEM! ⚠️"
echo "Welcome to the iHorizon Bot provisioning script."
echo "This will automate the installation of iHorizon's much-needed dependencies, make the bot running and working properly."
echo "If you don't trust this script, you can still open it with any text editor of your choice and check it yourself :)"
echo "After all, no personal information is sent outside of this computer by this script."

# Ask the user if they want to continue
read -p "DO YOU WANT TO CONTINUE? (y/n): " user_choice < /dev/tty

# Convert to lowercase for consistency
user_choice=$(echo "$user_choice" | tr '[:upper:]' '[:lower:]')

# Managing user choice / Exit mechanism
if [[ "$user_choice" == "y" || "$user_choice" == "yes" ]]; then
    echo "Okay. Proceeding with the provisioning..."

elif [[ "$user_choice" == "n" || "$user_choice" == "no" ]]; then
    echo "Provisioning cancelled by the user. Exiting..."
    exit 0

else
    echo "Invalid input. Please enter y/yes or n/no."
    exit 1

	# Updating local repos to be up-to-date with remote repos
	sudo apt update && sudo apt upgrade -y

	# Checking if necessary packages are already installed
	echo "Checking if necessary packages are already installed..."
    
	# Check if git and curl are installed; if not, install them
	if ! command -v git &>/dev/null; then
		echo "git is not installed, installing..."
		sudo apt install -y git
	else
		echo "git is already installed!"
	fi
	
	if ! command -v curl &>/dev/null; then
		echo "curl is not installed, installing..."
		sudo apt install -y curl
	else
		echo "curl is already installed!"
	fi

	if ! command -v bun &>/dev/null; then
		echo "bun is not installed, installing..."
		curl -fsSL https://bun.sh/install | bash
		
		# Exporting bun to make it work instantly in the actual shell
        echo "Exporting bun to make it work instantly in the actual shell"
		export BUN_INSTALL="$HOME/.bun"
		export PATH="$BUN_INSTALL/bin:$PATH"
		source $HOME/.bashrc
		echo "bun has been successfully exported in the shell"
	else
		echo "bun is already installed!"
	fi

	if ! command -v node &>/dev/null; then
		echo "node is not installed, installing..."
		# Installing nvm
		curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
		# Instead of relaunching the shell...
        \. ".nvm/nvm.sh"
		# Install node LTS
        nvm install --lts
    else
		echo "node is already installed!"
	fi	
    
    sudo ln -sf "$(which node)" /usr/local/bin/node

	if ! command -v pm2 &>/dev/null; then 
		echo "pm2 is not installed, installing..."
		bun install -g pm2
		sudo ln -sf "$HOME/.bun/bin/pm2" /usr/local/bin/pm2
	else 
		echo "pm2 is already installed!"
	fi

    # We use flatpak to install Chromium easily
	if ! command -v flatpak &>/dev/null; then 
		echo "flatpak is not installed, installing..."
		sudo apt install -y flatpak
		# Setting up the Flathub repo with the --user parameter
		flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
	else 
		echo "flatpak is already installed!"
	fi

	# Install Chromium
	flatpak install -y flathub org.chromium.Chromium

	# TODO: TEST THIS IF IT ACTUALLY WORKS 
	if apt list --installed | grep -q fonts-noto-color-emoji; then
		echo "fonts-noto-color-emoji is already installed!"
	else
		echo "fonts-noto-color-emoji is not installed, installing..."
		sudo apt install -y fonts-noto-color-emoji		
	fi

	# TODO: TEST THIS IF IT ACTUALLY WORKS 
	if apt list --installed | grep -q xvfb; then
		echo "xvfb is already installed!"
	else
		echo "xvfb is not installed, installing..."
		sudo apt install -y xvfb	
	fi

	# TODO: TEST THIS IF IT ACTUALLY WORKS 
	if apt list --installed | grep -q melt; then
		echo "melt is already installed!"
	else
		echo "melt is not installed, installing..."
		sudo apt install -y melt
	fi

	# Step 2 : cloning the GitLab Repository (production branch for more stability, we don't want users to have a maybe-broken bot right from the start because they cloned the dev branch which is meant for development and testing)

	echo "Cloning the iHorizon GitLab repository..."
	git clone -b production https://gitlab.com/ihrz/ihrz.git
	cd ihrz

	# Step 3 : installing the dependencies
	bun i 

	# Step 4 : renaming config.example.ts to config.ts
	mv src/files/config.example.ts src/files/config.ts

	# Step 5 : Interactive setup

	# Introduction
	echo "Welcome to the iHorizon Interactive Setup!"
	echo "We will now ask you questions to help you configure and run your bot in an easy and convenient way."
	
	# Ask for Discord Bot Token
	read -p "Enter your Discord Bot Token: " bot_token < /dev/tty

	# Ask for how many owners the user wants
	read -p "How many owners do you want to configure? " number_owners < /dev/tty

	# Initialize an empty array to hold the owner user IDs
	owner_user_ids=()

	# Loop through and ask for each owner's user ID
	for ((i=1; i<=number_owners; i++)); do
    read -p "Enter the user ID of owner #$i: " owner_id < /dev/tty
    owner_user_ids+=("$owner_id")
	done

    owner_user_ids_string=$(printf '"%s",' "${owner_user_ids[@]}")
	owner_user_ids_string="${owner_user_ids_string%,}"

	# Ask if phone presence should be enabled
	read -p "Do you want to enable phone presence? (y/n): " phone_presence_choice < /dev/tty
	if [[ "$phone_presence_choice" == "y" || "$phone_presence_choice" == "yes" ]]; then
    	phone_presence=true
	else
    	phone_presence=false
	fi

	# Ask if they want to enable messageCommandsMention
	read -p "Do you want to enable messageCommandsMention. If enabled, all bot commands will have to be triggered by mentioning the bot, then specifying the command. Thus, no prefix will be set! [DEFAULT IS NO] (y/n) " message_commands_mention < /dev/tty
	if [[ "$message_commands_mention" == "y" || "$message_commands_mention" == "yes" ]]; then 
		message_commands_mention=true
	else
		message_commands_mention=false
	fi

	# Ask for the default message command prefix
	read -p "Enter the default message command prefix (default is '?'): " message_commands_prefix < /dev/tty
	message_commands_prefix="${message_commands_prefix:-?}"  # Default to '?' if no input is provided

	# Ask if the user wants to set up Lavalink for the music module
	read -p "Do you want to set up Lavalink to make the music module work? (y/n): " setup_lavalink_choice < /dev/tty
	setup_lavalink_choice=$(echo "$setup_lavalink_choice" | tr '[:upper:]' '[:lower:]')

	if [[ "$setup_lavalink_choice" == "y" || "$setup_lavalink_choice" == "yes" ]]; then
    	# Ask for Lavalink node details
    	read -p "Enter the Lavalink Node ID (e.g., 'example_node'): " lavalink_node_id < /dev/tty
    	read -p "Enter the Lavalink Node host (e.g., 'lavalink.example.com'): " lavalink_node_host < /dev/tty
    	read -p "Enter the Lavalink Node port (default is 2333): " lavalink_node_port < /dev/tty
    	lavalink_node_port="${lavalink_node_port:-2333}"  # Default to 2333 if no input is provided
    	read -p "Enter the Lavalink Node password (e.g., 'password'): " lavalink_node_password < /dev/tty
    	read -p "Is the Lavalink Node secure (y/n)? (default is no): " lavalink_secure_choice < /dev/tty
    	if [[ "$lavalink_secure_choice" == "y" || "$lavalink_secure_choice" == "yes" ]]; then
        	lavalink_secure=true
    	else
        	lavalink_secure=false
    	fi
	else
    	echo "Skipping Lavalink setup."
    	lavalink_node_id=""
    	lavalink_node_host=""
    	lavalink_node_port="2333"
    	lavalink_node_password=""
    	lavalink_secure=false
	fi

	# Ask for devMode (Development Mode)
	read -p "Do you want to enable development mode (devMode)? (y/n, default is no): " dev_mode_choice < /dev/tty
	dev_mode_choice=$(echo "$dev_mode_choice" | tr '[:upper:]' '[:lower:]')
	if [[ "$dev_mode_choice" == "y" || "$dev_mode_choice" == "yes" ]]; then
    	dev_mode=true
	else
    	dev_mode=false
	fi

	# Ask for the image URL for blacklist embeds
	read -p "Enter the image URL for the blacklist embed (e.g., 'https://website.com/image.png'): " blacklist_picture_url < /dev/tty

	# Ask for always100 setting
	echo "Enter pairs of user IDs that will always have 100% love. (Enter each pair and press Enter, type 'done' when finished):"
	always100_ids=()
	while true; do
    	read -p "User ID #1 (or 'done' to stop): " user_id_one < /dev/tty
    	if [[ "$user_id_one" == "done" ]]; then
        	break
    	fi
    	read -p "User ID #2: " user_id_two < /dev/tty
    	always100_ids+=("${user_id_one}x${user_id_two}")
	done

	# Ask for the Guild Logs Channel ID
	read -p "Enter the Discord channel ID for guild logs: " guild_logs_channel_id < /dev/tty

	# Ask for the Lavalink Logs Channel ID (optional)
	read -p "Enter the Discord channel ID for Lavalink logs (leave blank for none): " lavalink_logs_channel_id < /dev/tty
	lavalink_logs_channel_id="${lavalink_logs_channel_id:-""}"
	
	# Ask for the Report Channel ID
	read -p "Enter the Discord channel ID for bug reports: " report_channel_id < /dev/tty

	# Ask for the API Token
	read -p "Enter your API token (for secure requests): " api_token < /dev/tty

	# Ask for database method
	read -p "Do you want to use SQLite or MySQL for the database? (sqlite/mysql, default is sqlite): " db_method_choice < /dev/tty
	db_method_choice=$(echo "${db_method_choice:-sqlite}" | tr '[:upper:]' '[:lower:]')

	if [[ "$db_method_choice" == "mysql" ]]; then
    	read -p "Enter the MySQL host: " mysql_host < /dev/tty
    	read -p "Enter the MySQL password: " mysql_password < /dev/tty
    	read -p "Enter the MySQL database name: " mysql_database < /dev/tty
    	read -p "Enter the MySQL user: " mysql_user < /dev/tty
    	read -p "Enter the MySQL port (default is 3306): " mysql_port < /dev/tty
    	mysql_port="${mysql_port:-3306}"
	else
    	echo "Using SQLite (default)."
    	db_method_choice="sqlite"
	fi

	# Modifying the config.ts file now

	echo "Modifying the configuration file..."

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
	echo "PUPPETEER_EXECUTABLE_PATH=$HOME/.local/share/flatpak/app/org.chromium.Chromium/current/active/export/bin/org.chromium.Chromium" >> .env

    # All done!
	echo "The configuration file has been successfully edited to suit your needs. The interactive setup is now finished!"

	# Step 6 : Starting the bot and making it daemonized
	# Starting the bot (here the name of the daemon will be iHorizon and the interpreter will be bun)
	echo "Setting up pm2..."
	pm2 start . --name "iHorizon" --interpreter ~/.bun/bin/bun
	# Save pm2 config
	sudo env PATH=$PATH:/usr/local/bin pm2 save --force
	# Launch iHorizon at startup
	sudo env PATH=$PATH:/usr/local/bin pm2 startup

	# All done!
	echo "🎉 Congratulations! The iHorizon bot provisioning is done. Enjoy using iHorizon! 🎉"
	echo "⚠️  But just one more thing! Execute the following command on your terminal to finish the installation : source ~/.bashrc ⚠️"
	echo "And after that you will be all set! Thank you for using the iHorizon Provisioning Script!"
fi
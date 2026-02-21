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
# Mainly developed by Ether (https://gitlab.com/etherondiscord)
#
# Copyright © 2020-2026 iHorizon
#

#!/usr/bin/sudo bash

set -euo pipefail

# Pre-checks
# pm2 only supports systemd and openrc for pm2 startup, runit and other alternative init systems are not supported by pm2 
if ! command -v systemctl &>/dev/null && ! command -v rc-service &>/dev/null; then
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
echo "Welcome to the iHorizon Bot provisioning script."
echo "This will automate the installation of iHorizon's much-needed dependencies, make the bot running and working properly."
echo "If you don't trust this script, you can still open it with any text editor of your choice and check it yourself :)"
echo "After all, no personal information is sent outside of this computer by this script."

# Ask the user if they want to continue
read -p "DO YOU WANT TO CONTINUE? (y/n): " user_choice

# Convert to lowercase for consistency
user_choice=$(echo "$user_choice" | tr '[:upper:]' '[:lower:]')

# Managing user choice
if [[ "$user_choice" == "y" || "$user_choice" == "yes" ]]; then
	echo "Okay. Proceeding with the provisioning..."

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
        echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
		echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
		source ~/.bashrc
		echo "bun has been successfully exported in the shell"
	else
		echo "bun is already installed!"
	fi

	if ! command -v node &>/dev/null; then
		echo "node is not installed, installing..."
		# We could have used Ubuntu/Debian repos to make this easier to do and develop this script but their repos are severely outdated; THEY LITTERALLY HAVE AN UNSUPPORTED VERSION OF NODEJS!!!!!
		# Installing nvm
		curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
		# Instead of relaunching the shell...
        \. "$HOME/.nvm/nvm.sh"
		# Install node LTS
        nvm install --lts
    else
		echo "node is already installed!"
	fi	

	if ! command -v pm2 &>/dev/null; then 
		echo "pm2 is not installed, installing..."
		bun install pm2 -g
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

	# Step 2 : cloning the GitLab Repository

	echo "Cloning the iHorizon GitLab repository..."
	git clone https://gitlab.com/ihrz/ihrz.git
	cd ihrz

	# Step 3 : installing the dependencies
	bun i 

	# Step 4 : renaming config.example.ts to config.ts
	mv src/files/config.example.ts src/files/config.ts

	# TODO: Step 5 : interactive setup
	# This part of the script will basically config himself the config.ts, depending on user's input
	# We could ask questions to the user like "What will be the bot's token?" or "Do you want phone presence to be enabled?"
	# I think this will be the most complicated part of the script LOL

	# Step 6 : Starting the bot and making it daemonized
	# Starting the bot (here the name of the daemon will be iHorizon and the interpreter will be bun)
	pm2 start . --name "iHorizon" --interpreter ~/.bun/bin/bun
	# Saving pm2's daemon configs
	pm2 save
	# Make pm2 daemons run at startup
	pm2 startup
fi	
#!/bin/bash

# Prompt the user for the keys
read -p "Enter your TWITCH_APPLICATION_ID: " TWITCH_APPLICATION_ID
read -p "Enter your TWITCH_APPLICATION_SECRET: " TWITCH_APPLICATION_SECRET
read -p "Enter your YOUTUBE_API_KEY: " YOUTUBE_API_KEY
read -p "Enter your GENIUS_API_KEY: " GENIUS_API_KEY

# Detect if the user is using Bash or Zsh
SHELL_CONFIG=""
if [ -n "$BASH_VERSION" ]; then
	SHELL_CONFIG="$HOME/.bashrc"
elif [ -n "$ZSH_VERSION" ]; then
	SHELL_CONFIG="$HOME/.zshrc"
else
	echo "Unsupported shell. Please add the variables manually to your shell configuration file."
	exit 1
fi

# Function to add or update environment variable in the config file
add_or_update_env_var() {
	local VAR_NAME=$1
	local VAR_VALUE=$2

	# If variable already exists, skip adding
	if grep -q "^export $VAR_NAME=" "$SHELL_CONFIG"; then
		echo "Variable $VAR_NAME already exists in $SHELL_CONFIG. Skipping."
	else
		echo "export $VAR_NAME=\"$VAR_VALUE\"" >>"$SHELL_CONFIG"
		echo "Added $VAR_NAME to $SHELL_CONFIG"
	fi
}

# Add or skip each environment variable
add_or_update_env_var "TWITCH_APPLICATION_ID" "$TWITCH_APPLICATION_ID"
add_or_update_env_var "TWITCH_APPLICATION_SECRET" "$TWITCH_APPLICATION_SECRET"
add_or_update_env_var "YOUTUBE_API_KEY" "$YOUTUBE_API_KEY"
add_or_update_env_var "GENIUS_API_KEY" "$GENIUS_API_KEY"

# Reload the shell configuration
source "$SHELL_CONFIG"

echo "Environment variables have been processed and $SHELL_CONFIG has been reloaded."

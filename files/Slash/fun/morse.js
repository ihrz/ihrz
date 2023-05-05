const {
	Client,
	Intents,
	Collection,
	EmbedBuilder,
	Permissions,
	ApplicationCommandType,
	PermissionsBitField,
	ApplicationCommandOptionType
} = require('discord.js');

module.exports = {
	name: 'morse',
	description: 'Encrypt/decrypt morse',
	options: [
		{
			name: 'input',
			type: ApplicationCommandOptionType.String,
			description: 'Enter your input to encrypt/decrypt in morse',
			required: true
		}
	],
	run: async (client, interaction) => {
		if (!interaction.options.getString("input")) { return interaction.reply({ content: "You have not enter a input to decrypt/encrypt" }) }
		let alpha = " ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split(""),
			morse = "/,.-,-...,-.-.,-..,.,..-.,--.,....,..,.---,-.-,.-..,--,-.,---,.--.,--.-,.-.,...,-,..-,...-,.--,-..-,-.--,--..,.----,..---,...--,....-,.....,-....,--...,---..,----.,-----".split(","),
			text = interaction.options.getString("input").toUpperCase();
		while (text.includes("Ä") || text.includes("Ö") || text.includes("Ü")) {
			text = text.replace("Ä", "AE").replace("Ö", "OE").replace("Ü", "UE");
		}
		if (text.startsWith(".") || text.startsWith("-")) {
			text = text.split(" ");
			let length = text.length;
			for (i = 0; i < length; i++) {
				text[i] = alpha[morse.indexOf(text[i])];
			}
			text = text.join("");
		} else {
			text = text.split("");
			let length = text.length;
			for (i = 0; i < length; i++) {
				text[i] = morse[alpha.indexOf(text[i])];
			}
			text = text.join(" ");
		}
		return interaction.reply({ content: "```" + text + "```" });
	}
};
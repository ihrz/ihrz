import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildEmoji,
    Message,
    PermissionsBitField
} from 'discord.js';
import archiver from 'archiver';
import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';
import { Option } from '../../../../types/option';
import { axios } from '../../../core/functions/axios.js';

export default {
    run: async (
        client: Client,
        interaction: ChatInputCommandInteraction<"cached"> | Message,
        lang: LanguageData,
        command: Option | Command | undefined,
        neededPerm: number
    ) => {
        let time = Date.now();

        if (!interaction.member?.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
            return interaction.reply({
                content: lang.zip_emojis_doesnt_have_perm,
                ephemeral: true
            });
        }

        if (!interaction.guild) return;

        const emojis = interaction.guild.emojis.cache;

        return new Promise<void>((resolve, reject) => {
            const archive = archiver('zip', { zlib: { level: 9 } });
            const chunks: Buffer[] = [];

            archive.on('data', (chunk) => {
                chunks.push(chunk);
            });

            archive.on('end', async () => {
                const archiveBuffer = Buffer.concat(chunks);
                let calcTime = Date.now() - time;
                try {
                    await interaction.reply({
                        content: lang.zip_emojis_command_work
                            .replace("${calcTime}", String(calcTime))
                            .replace("${emojis.size}", String(emojis.size)),
                        files: [{
                            attachment: archiveBuffer,
                            name: 'server_emojis.zip'
                        }],
                        ephemeral: true
                    });
                    resolve();
                } catch (error) {
                    await interaction.reply({
                        content: lang.zip_emojis_command_error,
                        ephemeral: true
                    });
                    reject(error);
                }
            });

            archive.on('error', (err) => {
                reject(err);
            });

            const downloadPromises = Array.from(emojis.values()).map(async (emoji) => {
                try {
                    const emojiName = `${emoji.name}_${emoji.id}${emoji.animated ? '.gif' : '.png'}`;
                    const emojiUrl = emoji.imageURL({ size: 2048, extension: emoji.animated ? "gif" : "png" });

                    if (!emojiUrl) {
                        return;
                    }

                    const response = await axios.get(emojiUrl, {
                        responseType: 'arrayBuffer'
                    });

                    archive.append(Buffer.from(response.data), { name: emojiName });
                } catch {
                }
            });

            Promise.all(downloadPromises)
                .then(() => archive.finalize())
                .catch(reject);
        });
    }
};
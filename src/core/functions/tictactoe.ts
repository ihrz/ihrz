/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright 2020-2025 iHorizon
*/

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';


export function checkWin(board: string[][], player: string): boolean {
    for (let row = 0; row < 3; row++) {
        if (board[row][0] === player && board[row][1] === player && board[row][2] === player) {
            return true;
        }
    }
    for (let col = 0; col < 3; col++) {
        if (board[0][col] === player && board[1][col] === player && board[2][col] === player) {
            return true;
        }
    }
    if (board[0][0] === player && board[1][1] === player && board[2][2] === player) {
        return true;
    }
    if (board[0][2] === player && board[1][1] === player && board[2][0] === player) {
        return true;
    }
    return false;
}

export function isBoardFull(board: string[][]): boolean {
    return board.every(row => row.every(cell => cell !== ""));
}

export function createButton(board: string[][], row: number, col: number): ButtonBuilder {
    return new ButtonBuilder()
        .setCustomId(`ttt_${row}_${col}`)
        .setLabel(board[row][col] || "⠀")
        .setStyle(
            board[row][col] === "X" ? ButtonStyle.Danger :
                board[row][col] === "O" ? ButtonStyle.Success :
                    ButtonStyle.Secondary
        )
        .setDisabled(board[row][col] !== "");
}

export function createBoard(board: string[][]) {
    const rows = [];
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (let j = 0; j < 3; j++) {
            row.addComponents(createButton(board, i, j));
        }
        rows.push(row);
    }
    return rows;
}


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

//  Thanls @sqlu (github user) for the ideas about new components.

import {
	APIModalInteractionResponseCallbackData,
	Interaction,
	MessageComponentInteraction,
	ModalBuilder,
	ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
	LabelBuilder,
	CheckboxBuilder,
	CheckboxGroupBuilder,
	RadioGroupBuilder,
	TextDisplayBuilder
} from "discord.js";

export type ModalFieldType =
	| "text"
	| "checkbox"
	| "checkbox_group"
	| "radio_group"
	| "text_display";

export interface ModalFieldTextOptions {
	type?: "text";
	customId: string;
	placeHolder?: string;
	label: string;
	style: TextInputStyle;
	required: boolean;
	maxLength?: number;
	minLength?: number;
	value?: string;
}

export interface ModalFieldCheckboxOptions {
	type: "checkbox";
	customId: string;
	label: string;
	description?: string;
	default?: boolean;
}

export interface ModalFieldCheckboxGroupOptions {
	type: "checkbox_group";
	customId: string;
	label: string;
	description?: string;
	required?: boolean;
	minValues?: number;
	maxValues?: number;
	options: {
		label: string;
		value: string;
		description?: string;
		default?: boolean;
	}[];
}

export interface ModalFieldRadioGroupOptions {
	type: "radio_group";
	customId: string;
	label: string;
	description?: string;
	required?: boolean;
	options: {
		label: string;
		value: string;
		description?: string;
		default?: boolean;
	}[];
}

export interface ModalFieldTextDisplayOptions {
	type: "text_display";
	content: string;
}

export type ModalFieldOptions =
	| ModalFieldTextOptions
	| ModalFieldCheckboxOptions
	| ModalFieldCheckboxGroupOptions
	| ModalFieldRadioGroupOptions
	| ModalFieldTextDisplayOptions;

export interface ModalOptionsBuilder {
	title: string;
	customId: string;
	deferUpdate: boolean;
	fields: ModalFieldOptions[];
}

export function iHorizonModalBuilder(
	modalOptions: ModalOptionsBuilder
): APIModalInteractionResponseCallbackData {
	const modal = new ModalBuilder()
		.setCustomId(modalOptions.customId)
		.setTitle(modalOptions.title.substring(0, 32));

	modalOptions.fields.forEach((f) => {
		const type = f.type || "text";

		switch (type) {
			case "text": {
				const o = f as ModalFieldTextOptions;
				const input = new TextInputBuilder()
					.setCustomId(o.customId)
					.setStyle(o.style)
					.setRequired(o.required)
					.setMaxLength(o.maxLength || 20)
					.setMinLength(o.minLength || 5);

				if (o.placeHolder) input.setPlaceholder(o.placeHolder);
				if (o.value) input.setValue(o.value);

				modal.addLabelComponents(
					new LabelBuilder()
						.setLabel(o.label)
						.setTextInputComponent(input)
				);
				break;
			}
			case "checkbox": {
				const o = f as ModalFieldCheckboxOptions;
				const cb = new CheckboxBuilder().setCustomId(o.customId);
				if (o.default !== undefined) cb.setDefault(o.default);

				const label = new LabelBuilder()
					.setLabel(o.label)
					.setCheckboxComponent(cb);
				if (o.description) label.setDescription(o.description);

				modal.addLabelComponents(label);
				break;
			}
			case "checkbox_group": {
				const o = f as ModalFieldCheckboxGroupOptions;
				const cbg = new CheckboxGroupBuilder().setCustomId(o.customId);

				if (o.required !== undefined) cbg.setRequired(o.required);
				if (o.minValues !== undefined) cbg.setMinValues(o.minValues);
				if (o.maxValues !== undefined) cbg.setMaxValues(o.maxValues);

				o.options.forEach((opt) => {
					cbg.addOptions({
						label: opt.label,
						value: opt.value,
						description: opt.description,
						default: opt.default
					});
				});

				const label = new LabelBuilder()
					.setLabel(o.label)
					.setCheckboxGroupComponent(cbg);
				if (o.description) label.setDescription(o.description);

				modal.addLabelComponents(label);
				break;
			}
			case "radio_group": {
				const o = f as ModalFieldRadioGroupOptions;
				const rb = new RadioGroupBuilder().setCustomId(o.customId);

				if (o.required !== undefined) rb.setRequired(o.required);

				o.options.forEach((opt) => {
					rb.addOptions({
						label: opt.label,
						value: opt.value,
						description: opt.description,
						default: opt.default
					});
				});

				const label = new LabelBuilder()
					.setLabel(o.label)
					.setRadioGroupComponent(rb);
				if (o.description) label.setDescription(o.description);

				modal.addLabelComponents(label);
				break;
			}
			case "text_display": {
				const o = f as ModalFieldTextDisplayOptions;
				modal.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(o.content)
				);
				break;
			}
		}
	});

	return modal.toJSON();
}

const cache: number[] = [];

export async function iHorizonModalResolve(
	modalOptions: ModalOptionsBuilder,
	interaction: Interaction
): Promise<ModalSubmitInteraction<"cached"> | undefined> {
	const { deferUpdate = true } = modalOptions;
	modalOptions.deferUpdate = deferUpdate;

	const modal = iHorizonModalBuilder(modalOptions);

	await (interaction as MessageComponentInteraction).showModal(modal);

	const response = await (
		interaction as MessageComponentInteraction<"cached">
	).awaitModalSubmit({
		filter: (i) =>
			i.customId === modalOptions.customId &&
			i.user.id === interaction.user.id,
		time: 1_240_000
	});

	if (cache.includes(parseInt(response.id))) {
		return undefined;
	}
	cache.push(parseInt(response.id));
	if (deferUpdate) {
		await response.deferUpdate();
	}

	return response;
}

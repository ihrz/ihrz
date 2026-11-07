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

export async function changeVoiceChannelStatus(
	channelId: string,
	status: string
): Promise<boolean> {
	const res = await fetch(
		`https://discord.com/api/v10/channels/${channelId}/voice-status`,
		{
			method: "PUT",
			headers: {
				Authorization: `Bot ${client.token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				status
			})
		}
	);

	if (res.status === 200) return true;
	return false;
}

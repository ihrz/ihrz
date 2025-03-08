/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/


import { Client } from 'discord.js';

import { BotCollection, Custom_iHorizon, OwnIHRZ_New_Expire_Time_Object, OwnIHRZ_New_Owner_Object } from "../../../types/ownihrz.js";

import { OwnIhrzCluster, ClusterMethod } from "../functions/apiUrlParser.js";
import { AxiosResponse, axios } from "../functions/axios.js";
import logger from "../logger.js";

class OwnIHRZ {
	private client: Client;

	constructor(client: Client) {
		this.client = client
	}

	async Startup_Cluster() {
		this.client.config.core.cluster.forEach(async (x, index) => {
			await axios.post(
				OwnIhrzCluster({
					cluster_method: ClusterMethod.StartupCluster,
					cluster_number: index
				}),
				{ adminKey: this.client.config.api.apiToken }
			);
		})
	}

	// Working
	async Startup_Container() {
		var table_1 = this.client.db.table("OWNIHRZ");

		(await table_1.all()).forEach(async owner_one => {
			var cluster_ownihrz = owner_one.value;

			for (let owner_id in cluster_ownihrz) {
				for (let bot_id in cluster_ownihrz[owner_id]) {
					if (cluster_ownihrz[owner_id][bot_id].PowerOff || !cluster_ownihrz[owner_id][bot_id].Code) continue;

					let response = await axios.get(
						OwnIhrzCluster({
							cluster_method: ClusterMethod.StartupContainer,
							cluster_number: parseInt(cluster_ownihrz[owner_id][bot_id].Cluster),
							bot_id
						})
					);

					logger.log(response.data);
				}
			};
		})
	};

	// Working
	async ShutDown(cluster_id: number, id_to_bot: string, modifyDb: boolean) {
		axios.get(
			OwnIhrzCluster({
				cluster_method: ClusterMethod.ShutdownContainer,
				cluster_number: cluster_id,
				bot_id: id_to_bot,
				forceDatabaseSet: modifyDb
			})
		).then(response => {
			logger.log(response.data)
		}).catch(error => { logger.err(error); });
		return 0;
	};

	// Working
	async PowerOn(cluster_id: number, id_to_bot: string) {
		axios.get(
			OwnIhrzCluster({
				cluster_method: ClusterMethod.PowerOnContainer,
				cluster_number: cluster_id,
				bot_id: id_to_bot,
			})
		).then(response => {
			logger.log(response.data)
		}).catch(error => { logger.err(error); });
		return 0;
	};


	// Working
	async Delete(cluster_id: number, id_to_bot: string) {
		axios.get(
			OwnIhrzCluster({
				cluster_method: ClusterMethod.DeleteContainer,
				cluster_number: cluster_id,
				bot_id: id_to_bot,
			})
		).then(response => {
			logger.log(response.data)
		}).catch(error => { logger.err(error); });
		return 0;
	};

	// Working
	async QuitProgram() {
		for (const cluster_number of this.client.config.core.cluster.keys()) {
			await axios.post(
				OwnIhrzCluster({
					cluster_method: ClusterMethod.ShutDownCluster,
					cluster_number
				}),
				{ adminKey: this.client.config.api.apiToken }
			);
		}
	}

	async Change_Token(cluster_id: number, botId: string, bot_token: string) {
		axios.get(OwnIhrzCluster({
			cluster_method: ClusterMethod.ChangeTokenContainer,
			cluster_number: cluster_id!,
			bot_id: botId,
			discord_bot_token: bot_token
		}))
			.then(async () => {
			})
			.catch(error => {
				logger.err(error)
			});

		return;
	};

	async Create_Container(cluster_id: number, botData: Custom_iHorizon): Promise<AxiosResponse<any>> {
		return await axios.post(OwnIhrzCluster({
			cluster_method: ClusterMethod.CreateContainer,
			cluster_number: cluster_id,
		}),
			botData,
			{
				headers: {
					'Accept': 'application/json'
				}
			}
		);
	};

	async Active_Intents(token: string) {
		try {
			const response = await fetch("https://discord.com/api/v10/applications/@me", {
				method: "PATCH",
				headers: {
					Authorization: "Bot " + token,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ flags: 565248 }),
			});
			return await response.json();

		} catch (err) {
			logger.err((err as unknown as string));
		}
	};

	async Get_Bot(discord_bot_token: string): Promise<AxiosResponse<any>> {
		return await axios.get('https://discord.com/api/v10/applications/@me', {
			headers: {
				Authorization: `Bot ${discord_bot_token}`
			}
		});
	};

	async Change_Owner(cluster_id: number, botId: string, OwnerData: OwnIHRZ_New_Owner_Object) {
		return await axios.post(OwnIhrzCluster({
			cluster_method: ClusterMethod.ChangeOwnerContainer,
			cluster_number: cluster_id,
		}),
			{
				adminKey: this.client.config.api.apiToken,
				botId,
				OwnerData
			},
			{ headers: { 'Accept': 'application/json' } }
		);
	}

	async Change_Time(cluster_id: number, botId: string, data: OwnIHRZ_New_Expire_Time_Object) {
		return await axios.post(OwnIhrzCluster({
			cluster_method: ClusterMethod.ChangeExpireTime,
			cluster_number: cluster_id,
		}),
			{
				adminKey: this.client.config.api.apiToken,
				botId,
				data
			},
			{ headers: { 'Accept': 'application/json' } }
		);
	}

	async GetOwnersList() {
		let ownihrzTable = this.client.db.table("OWNIHRZ");
		let ownihrzData = await ownihrzTable.get("CLUSTER") as BotCollection;

		const owners: string[] = [];

		for (const botGroup of Object.values(ownihrzData)) {
			for (const botInstance of Object.values(botGroup)) {
				if (!owners.includes(botInstance.OwnerOne)) {
					owners.push(botInstance.OwnerOne);
				}
				if (botInstance.OwnerTwo && !owners.includes(botInstance.OwnerTwo)) {
					owners.push(botInstance.OwnerTwo);
				}
			}
		}

		return owners;
	}
}

export { OwnIHRZ }
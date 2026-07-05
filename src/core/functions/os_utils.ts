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

import { existsSync } from "node:fs";
import os from "node:os";

export function niceBytes(kb: number): string {
	const units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

	const unitIndex = Math.min(
		Math.floor(Math.log(kb * 1024) / Math.log(1024)),
		units.length - 1
	);

	const bytes = (kb * 1024) / Math.pow(1024, unitIndex);

	return `${bytes < 10 && unitIndex > 0 ? bytes.toFixed(2) : bytes.toFixed(0)} ${units[unitIndex]}`;
}

export async function getMemoryInfo(): Promise<{
	MemTotal: number;
	MemFree: number;
	MemAvailable: number;
}> {
	// Linux
	if (existsSync("/proc/meminfo")) {
		const data = await Bun.file("/proc/meminfo").text();

		const memInfo: Record<string, number> = {};

		for (const line of data.split("\n")) {
			const [key, value] = line.split(":");

			if (!key || !value) continue;

			memInfo[key.trim()] = parseInt(value.trim().split(/\s+/)[0], 10);
		}

		return {
			MemTotal: memInfo.MemTotal ?? 0,
			MemFree: memInfo.MemFree ?? 0,
			MemAvailable: memInfo.MemAvailable ?? 0
		};
	}

	// Windows
	if (process.platform === "win32") {
		try {
			const proc = Bun.spawn([
				"powershell.exe",
				"-NoProfile",
				"-Command",
				[
					"$os = Get-CimInstance Win32_OperatingSystem",
					"Write-Output ($os.TotalVisibleMemorySize.ToString() + ',' + $os.FreePhysicalMemory.ToString())"
				].join("; ")
			]);

			const stdout = (await new Response(proc.stdout).text()).trim();
			const stderr = (await new Response(proc.stderr).text()).trim();

			const exitCode = await proc.exited;

			if (exitCode !== 0) {
				throw new Error(
					`PowerShell exited with code ${exitCode}: ${stderr}`
				);
			}

			const match = stdout.match(/^(\d+),(\d+)$/m);

			if (!match) {
				throw new Error(`Unexpected PowerShell output: ${stdout}`);
			}

			const total = Number(match[1]);
			const free = Number(match[2]);

			return {
				MemTotal: total,
				MemFree: free,
				MemAvailable: free
			};
		} catch {
			return {
				MemTotal: Math.floor(os.totalmem() / 1024),
				MemFree: Math.floor(os.freemem() / 1024),
				MemAvailable: Math.floor(os.freemem() / 1024)
			};
		}
	}

	// macOS
	try {
		const sysctl = Bun.spawn(["sysctl", "-n", "hw.memsize", "hw.pagesize"]);

		const sysctlOutput = (await new Response(sysctl.stdout).text()).trim();

		const [totalBytesStr, pageSizeStr] = sysctlOutput.split("\n");

		const totalBytes = Number(totalBytesStr);
		const pageSize = Number(pageSizeStr || 4096);

		const vmStat = Bun.spawn(["vm_stat"]);

		const vmOutput = await new Response(vmStat.stdout).text();

		let freePages = 0;
		let inactivePages = 0;

		for (const line of vmOutput.split("\n")) {
			if (line.includes("Pages free:")) {
				freePages = Number(line.match(/\d+/)?.[0] ?? 0);
			} else if (line.includes("Pages inactive:")) {
				inactivePages = Number(line.match(/\d+/)?.[0] ?? 0);
			}
		}

		return {
			MemTotal: Math.floor(totalBytes / 1024),
			MemFree: Math.floor((freePages * pageSize) / 1024),
			MemAvailable: Math.floor(
				((freePages + inactivePages) * pageSize) / 1024
			)
		};
	} catch (err) {
		throw new Error(
			`Unable to retrieve memory information: ${String(err)}`
		);
	}
}

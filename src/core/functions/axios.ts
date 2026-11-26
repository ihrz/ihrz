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

/**
 * Default body type, as in axios: callers read `data` without declaring
 * its shape (about thirty call sites do).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios-compatible untyped default for response bodies
type AnyBody = any;

interface AxiosResponse<T = AnyBody> {
	data: T;
	status: number;
	statusText: string;
	headers: Headers;
	config?: AxiosRequestConfig;
}

interface AxiosError<T = AnyBody> extends Error {
	config?: AxiosRequestConfig;
	code?: string;
	request?: unknown;
	response?: AxiosResponse<T>;
}

interface AxiosRequestConfig {
	url?: string;
	method?: string;
	baseURL?: string;
	headers?: Record<string, string>;
	/** Accepted for axios compatibility, not sent (never was). */
	params?: unknown;
	data?: unknown;
	timeout?: number;
	responseType?: "json" | "arrayBuffer" | "arraybuffer";
}

class AxiosClass {
	async request<T = AnyBody>(
		config: AxiosRequestConfig
	): Promise<AxiosResponse<T>> {
		const {
			url = "",
			method = "GET",
			baseURL = "",
			headers = {},
			data,
			timeout,
			responseType = "json"
		} = config;
		const requestUrl = baseURL ? baseURL + url : url;

		const options: RequestInit = {
			method,
			headers: {
				"Content-Type": "application/json",
				...headers
			},
			body: data ? JSON.stringify(data) : undefined
		};

		if (timeout) {
			options["signal"] = AbortSignal.timeout(timeout);
		}

		if (responseType === "arrayBuffer" || responseType === "arraybuffer") {
			if (!options.headers) options.headers = {};
			(options.headers as Record<string, string>)["Accept"] =
				"application/octet-stream";
		}

		try {
			const response = await fetch(requestUrl, options);
			const contentType = response.headers.get("content-type");
			const isJSON =
				contentType && contentType.includes("application/json");

			if (responseType === "json" || isJSON) {
				const responseData = isJSON
					? await response.json()
					: await response.text();

				return {
					data: responseData,
					status: response.status,
					statusText: response.statusText,
					headers: response.headers
				};
			} else {
				const responseData = await response.arrayBuffer();

				return {
					data: responseData as unknown as T,
					status: response.status,
					statusText: response.statusText,
					headers: response.headers
				};
			}
		} catch (error) {
			throw this.handleRequestError(error);
		}
	}

	async head<T = AnyBody>(
		url: string,
		config?: AxiosRequestConfig
	): Promise<AxiosResponse<T>> {
		return this.request({ ...config, url, method: "HEAD" });
	}

	get<T = AnyBody>(
		url: string,
		config?: AxiosRequestConfig
	): Promise<AxiosResponse<T>> {
		return this.request({ ...config, url, method: "GET" });
	}

	post<T = AnyBody>(
		url: string,
		data?: unknown,
		config?: AxiosRequestConfig
	): Promise<AxiosResponse<T>> {
		return this.request({ ...config, url, method: "POST", data });
	}

	put<T = AnyBody>(
		url: string,
		data?: unknown,
		config?: AxiosRequestConfig
	): Promise<AxiosResponse<T>> {
		return this.request({ ...config, url, method: "PUT", data });
	}

	private handleRequestError<T = AnyBody>(error: unknown): AxiosError<T> {
		return error as AxiosError<T>;
	}
}

const axios = new AxiosClass();

export { axios, AxiosError, AxiosRequestConfig, AxiosResponse };

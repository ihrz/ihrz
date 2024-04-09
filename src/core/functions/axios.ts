/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config?: any;
}

interface AxiosError<T = any> extends Error {
    config?: any;
    code?: string;
    request?: any;
    response?: AxiosResponse<T>;
}

interface AxiosRequestConfig {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: any;
    params?: any;
    data?: any;
    timeout?: number;
}

class Axios {
    async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const { url = '', method = 'GET', baseURL = '', headers = {}, params, data, timeout } = config;
        const requestUrl = baseURL ? baseURL + url : url;

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: data ? JSON.stringify(data) : undefined,
        };

        try {
            const response = await fetch(requestUrl, options);
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                const responseData = await response.json() as T;

                return {
                    data: responseData,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                };
            } else {
                const responseData = await response.text() as unknown as T;

                return {
                    data: responseData,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                };
            }
        } catch (error) {
            throw this.handleRequestError(error);
        }
    }

    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.request({ ...config, url, method: 'GET' });
    }

    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.request({ ...config, url, method: 'POST', data });
    }

    private handleRequestError<T = any>(error: any): AxiosError<T> {
        // Customize error handling as needed
        return error;
    }

};

export { Axios, AxiosError, AxiosRequestConfig, AxiosResponse };
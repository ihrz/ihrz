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
class AxiosClass {
    async request(config) {
        const { url = '', method = 'GET', baseURL = '', headers = {}, params, data, timeout, responseType = 'json' } = config;
        const requestUrl = baseURL ? baseURL + url : url;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: data ? JSON.stringify(data) : undefined,
        };
        if (responseType === 'arrayBuffer' || responseType === 'arraybuffer') {
            if (!options.headers)
                options.headers = {};
            options.headers['Accept'] = 'application/octet-stream';
        }
        try {
            const response = await fetch(requestUrl, options);
            const contentType = response.headers.get('content-type');
            const isJSON = contentType && contentType.includes('application/json');
            if (responseType === 'json' || isJSON) {
                const responseData = isJSON ? await response.json() : await response.text();
                return {
                    data: responseData,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                };
            }
            else {
                const responseData = await response.arrayBuffer();
                return {
                    data: responseData,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                };
            }
        }
        catch (error) {
            throw this.handleRequestError(error);
        }
    }
    async head(url, config) {
        return this.request({ ...config, url, method: 'HEAD' });
    }
    get(url, config) {
        return this.request({ ...config, url, method: 'GET' });
    }
    post(url, data, config) {
        return this.request({ ...config, url, method: 'POST', data });
    }
    handleRequestError(error) {
        return error;
    }
}
const axios = new AxiosClass();
export { axios };

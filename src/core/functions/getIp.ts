/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

const endpoint_v4 = 'https://api.ipify.org';
const endpoint_v6 = 'https://api6.ipify.org';

interface CacheValueTyping {
    ipv4: string;
    ipv6: string;
};

const CacheValue: CacheValueTyping = {
    ipv4: '',
    ipv6: ''
}

export default async function getIP({ useIPv6 = false }: { useIPv6?: boolean } = {}) {
    const endpoint = useIPv6 ? endpoint_v6 : endpoint_v4;

    if (useIPv6 && CacheValue.ipv6 !== '') {
        return CacheValue.ipv6;
    } else if (!useIPv6 && CacheValue.ipv4 !== '') {
        return CacheValue.ipv4;
    }

    const response = await fetch(endpoint, { method: 'GET' });

    if (!response.ok) {
        throw new Error('Failed to fetch IP address');
    }

    const ipAddress = await response.text();

    if (useIPv6) {
        CacheValue.ipv6 = ipAddress;
    } else {
        CacheValue.ipv4 = ipAddress;
    }

    return ipAddress;
};
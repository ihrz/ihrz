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
export var ClusterMethod;
(function (ClusterMethod) {
    ClusterMethod[ClusterMethod["CreateContainer"] = 0] = "CreateContainer";
    ClusterMethod[ClusterMethod["DeleteContainer"] = 1] = "DeleteContainer";
    ClusterMethod[ClusterMethod["StartupContainer"] = 2] = "StartupContainer";
    ClusterMethod[ClusterMethod["ShutdownContainer"] = 3] = "ShutdownContainer";
    ClusterMethod[ClusterMethod["PowerOnContainer"] = 4] = "PowerOnContainer";
    ClusterMethod[ClusterMethod["ChangeTokenContainer"] = 5] = "ChangeTokenContainer";
    ClusterMethod[ClusterMethod["ChangeOwnerContainer"] = 6] = "ChangeOwnerContainer";
    ClusterMethod[ClusterMethod["ChangeExpireTime"] = 7] = "ChangeExpireTime";
    ClusterMethod[ClusterMethod["StartupCluster"] = 8] = "StartupCluster";
    ClusterMethod[ClusterMethod["ShutDownCluster"] = 9] = "ShutDownCluster";
})(ClusterMethod || (ClusterMethod = {}));
;
export var GatewayMethod;
(function (GatewayMethod) {
    GatewayMethod[GatewayMethod["GenerateOauthLink"] = 0] = "GenerateOauthLink";
    GatewayMethod[GatewayMethod["CreateRestoreCordGuild"] = 1] = "CreateRestoreCordGuild";
    GatewayMethod[GatewayMethod["ForceJoinRestoreCord"] = 2] = "ForceJoinRestoreCord";
    GatewayMethod[GatewayMethod["AddSecurityCodeAmount"] = 3] = "AddSecurityCodeAmount";
    GatewayMethod[GatewayMethod["ChangeRole"] = 4] = "ChangeRole";
    GatewayMethod[GatewayMethod["UserInfo"] = 5] = "UserInfo";
})(GatewayMethod || (GatewayMethod = {}));
;
export function assetsFinder(body, type) {
    return `https://raw.githubusercontent.com/ihrz/assets/main/${type}/${Math.floor(Math.random() * body[type])}.gif`;
}
;

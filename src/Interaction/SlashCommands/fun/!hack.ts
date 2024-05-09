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

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    User,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import crypto from 'crypto';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        let victim = interaction.options.getUser("user") as User;

        var ip = [
            '1', '100', '168', '254', '345', '128', '256', '255', '0', '144',
            '38', '67', '97', '32', '64', '192', '10', '172', '12', '200', '87',
            '150', '42', '99', '76', '211', '172', '18', '86', '55', '220', '7'
        ];

        var hackerNames = [
            'cyberpunk', 'zeroday', 'blackhat', 'hackmaster', 'shadowbyte', 'crypt0',
            'phishr', 'darknet', 'rootaccess', 'sploit3r', 'hack3rman', 'v1rus',
            'bytebandit', 'malware', 'scriptkiddie', 'hackgenius', 'hackmaster', 'cyberghost',
            'codecracker', 'darkness', 'hackerhood', 'hackermania', 'hacktivist', 'zerocool',
            'crashoverride', 'theplague', 'phreak', 'megaspoof', 'bytebasher', 'cryptokeeper',
            'malicious', 'virusvandal', 'rootkit', 'wormwhisperer', 'codecommando', 'trollcoder',
            'glitchguru', 'webwrecker', 'firewallfiend', 'cipherfreak', 'exploitmaster', 'hackninja',
            'cryptoking', 'darkbyte', 'phishfinder', 'hackhound', 'technoterror', 'geekgod', 'digitaldaemon',
            'shadowbyte', 'blackbeard', 'cybersniper', 'cybercommander', 'firewallfreak', 'cryptomaster',
            'darkshadow', 'virusvampire', 'n3m3sys', 'codezombie', 'cryptocraze', 'hackboss', 'viralvillain',
            'cybercreature', 'hackzilla', 'cyberchaser', 'virusvanquisher', 'codecrusader', 'darkdude',
            'hacklegend', 'digitalwarrior', 'cyberjunkie', 'geekguru', 'firewallfighter', 'virusvirtuoso',
            'codecaptain', 'cyberwarlock', 'hackmaniac', 'digitaldaredevil', 'cyberslayer', 'hackwarrior',
            'codegladiator', 'darkhero', 'virusvindicator', 'cyberwizard', 'hacktitan', 'digitaldestroyer',
            'cyberknight', 'codephoenix', 'hackpharaoh', 'cyberphoenix', 'virusphoenix', 'hackphoenix',
            'cyberwarrior', 'cyberpharaoh', 'viruswarrior', 'viruswizard', 'digitalpharaoh', 'digitalwizard',
            'cyberlegend', 'hackwarlock', 'codehero', 'virusknight', 'cyberdestroyer', 'digitalwarlock',
            'hackwizard', 'codelegend', 'viruspharaoh', 'cybergladiator', 'hackdestroyer', 'digitalknight',
            'cybercrusader', 'codecrusader', 'cybergladiator', 'hackcrusader', 'digitalgladiator', 'codegladiator',
            'viruscrusader', 'cyberwarrior', 'digitalwarrior', 'viruswarrior', 'hackwarrior', 'codephoenix',
            'digitalphoenix', 'virusphoenix', 'cyberphoenix', 'hackphoenix', 'cybercrusader', 'digitalcrusader',
            'viruscrusader', 'hackcrusader', 'codecrusader', 'cybergladiator', 'digitalgladiator', 'virusgladiator',
            'hackgladiator', 'codegladiator', 'cyberdestroyer', 'digitaldestroyer', 'virusdestroyer', 'hackdestroyer',
            'codedestroyer', 'cyberknight', 'digitalknight', 'virusknight', 'hackknight', 'codeknight',
            'cyberlord', 'digitallord', 'viruslord', 'hacklord', 'codelord', 'cyberninja', 'digitalninja',
            'virusninja', 'hackninja', 'codeninja', 'cyberpharaoh', 'digitalpharaoh', 'viruspharaoh',
            'hackpharaoh', 'codepharaoh', 'cyberwizard', 'digitalwizard', 'viruswizard', 'hackwizard', 'codewizard',
            'cyberhero', 'digitalhero', 'virushero', 'hackhero', 'codehero', 'cybershadow', 'digitalshadow',
            'virusshadow', 'hackshadow', 'codeshadow', 'cyberghost', 'digitalghost', 'virusghost', 'hackghost',
            'codeghost', 'cyberbeast', 'digitalbeast', 'virusbeast', 'hackbeast', 'codebeast', 'cybermaster',
            'digitalmaster', 'virusmaster', 'hackmaster', 'codemaster', 'cyberbyte', 'digitalbyte', 'virusbyte',
            'hackbyte', 'codebyte', 'cyberterror', 'digitalterror', 'virusterror', 'hackterror', 'codeterror',
            'cyberhacker', 'digitalhacker', 'virushacker', 'hackhacker', 'codehacker', 'cyberspy', 'digitalspy',
            'virusspy', 'hackspy', 'codespy', 'cybermercenary', 'digitalmercenary', 'virusmercenary', 'hackmercenary',
            'codemercenary', 'cyberwarrior', 'digitalwarrior', 'viruswarrior', 'hackwarrior', 'codewarrior'
        ];

        var hackerDomains = [
            "hackmail.com", "darkweb.net", "blackhat.org", "zerodaymail.com", "phishmail.net", "cryptomail.org",
            "sploitmail.com", "hackergang.com", "rootmail.org", "v1rusmail.com", "hackers.com", "hackzone.com",
            "hacknet.com", "hackworld.com", "hackerhub.com", "hackerland.com", "hackersquad.com", "hackerforce.com",
            "hackerspace.com", "hackersguild.com", "hackersociety.com", "hackerslab.com", "hackerszone.com",
            "hackersploit.com", "hackerdomain.com", "hackersbay.com", "hackerhaven.com", "hackershack.com",
            "hackershideout.com", "hackershideaway.com", "hackerscave.com", "hackerstower.com", "hackersfortress.com",
            "hackersstronghold.com", "hackerscastle.com", "hackerskeep.com", "hackersden.com", "hackersdungeon.com",
            "hackerslair.com", "hackerstemple.com", "hackerssanctuary.com", "hackersasylum.com", "hackersretreat.com",
            "hackerssafehouse.com", "hackersnest.com", "hackerstation.com", "hackerstop.com", "hackerspot.com",
            "hackersplace.com", "hackersroom.com", "hackerscrib.com", "hackersturf.com", "hackersterritory.com",
            "hackersdomain.com", "hackersspace.com", "hackersstreet.com", "hackersvillage.com", "hackersalley.com",
            "hackerscourt.com", "hackerscircle.com", "hackersjunction.com", "hackerscrossing.com", "hackerssquare.com",
            "hackersblock.com", "hackersplaza.com", "hackerspark.com", "hackersyard.com", "hackersfield.com",
            "hackersgrove.com", "hackersgarden.com", "hackersoasis.com", "hackerswood.com", "hackersmeadow.com",
            "hackershill.com", "hackersridge.com", "hackerssummit.com", "hackerspeak.com", "hackersview.com",
            "hackerslookout.com", "hackersoverlook.com", "hackersoutlook.com", "hackersprospect.com",
            "hackersviewpoint.com", "hackersoutpost.com", "hackersvista.com", "hackerspanorama.com",
            "hackersvantage.com", "hackersscenic.com", "hackersscenery.com", "hackersperspective.com",
            "hackershorizon.com", "hackersbeyond.com", "hackersinfinity.com", "hackerseternity.com",
            "hackersuniverse.com", "hackerscosmos.com", "hackersworld.com", "hackersrealm.com", "hackersplanet.com",
            "hackersgalaxy.com", "hackerssystem.com", "hackersgrid.com", "hackersmatrix.com", "hackerssphere.com",
            "hackersorbit.com", "hackersrange.com", "hackersland.com", "hackersarea.com", "hackerssector.com",
            "hackersdistrict.com", "hackersprovince.com", "hackersstate.com", "hackerscountry.com"
        ];

        var hackerPasswords = [
            "5up3rP@$$w0rd", "H4x0r!z3d", "N0s3cur1ty", "3vilG3nius", "0bscureC0de", "Hacker123!", "P@$$phr4s3",
            "D3c3pt10n", "0v3rwr1t3", "V1rtu4lInf1ltr4t0r", "R3v3rse3ng1n33r", "C0mpl3xM4tr1x", "D1g1t4lS3cr3t",
            "Myst3ryH4ck", "Ph4nt0mC0ntrol", "BruteForc3!", "S3cur1ty!", "D4rkW3b!", "Crypt0Gr4ph!", "H4ckThePl4n3t!",
            "Cybern3t1cs!", "Ph1sh3rM4n!", "R0b0t1cs!", "G3n1usC0d3!", "S3cur3L1n3!", "H4ck3rM1nd!", "V1rtu4lC0ntr0l!",
            "R3v3rs3Eng1n33r!", "C0d3M4tr1x!", "H4ck3rW0rld!", "Cyb3rPh4nt0m!", "N3tSecur1ty!", "D4t4Encrypti0n!",
            "H4ck3rZ0ne!", "S3cr3tC0d3!", "Ph4nt0mH4ck!", "D1g1t4lV1rus!", "M4lwar3Att4ck!", "R00t4cc3ss!",
            "C0d3Break3r!", "Bl4ckH4t!", "D3v1lC0d3!", "V1rtu4lW0rld!", "H4ck3rZ3r0!", "Ph4nt0mS3cur1ty!",
            "W1r3l3ssH4ck!", "C0d3M4n1ac!", "H4ck3rL1f3!", "S3cur1tyH3r0!", "H4ckTh3W3b!", "H4ck3r4l3rt!",
            "V1rtu4lL1f3!", "R3dC0d3!", "H4ck3rC0d3!", "D1g1t4lS4f3!", "H4ck3rZ0n3!", "D4rkW3bM4n!", "Blu3t00thH4ck!",
            "H4ck3rPh1sh!", "V1rtu4lR3al1ty!", "H4ck3rC0d3M4n!", "C0d3Warri0r!", "H4ck3rP0w3r!", "D4rkW3bC0d3!",
            "Ph4nt0mH4ck3r!", "W1r3l3ssS3cur1ty!", "H4ck3rN3tw0rk!", "Bl4ckH4tH4ck3r!", "D1g1t4lPh4nt0m!",
            "S3cur1tyPh4nt0m!", "H4ck3rC0d3Br3ak!", "Ph4nt0mC0d3M4n!", "H4ck3rW1r3l3ss!", "D4rkW3bS3cur1ty!",
            "Bl4ckH4tPh4nt0m!", "H4ck3rC0d3H3r0!", "C0d3Br3ak3r!", "H4ck3rPh4nt0mC0d3!", "S3cur1tyC0d3M4n!",
            "D4rkW3bPh4nt0m!", "Bl4ckH4tC0d3Br3ak!", "H4ck3rPh4nt0mH3r0!", "V1rtu4lPh4nt0mC0d3!", "S3cur1tyC0d3Br3ak!",
            "D4rkW3bPh4nt0mH4ck!", "Bl4ckH4tPh4nt0mC0d3!", "H4ck3rC0d3Br3ak3r!", "Ph4nt0mC0d3M4nH4ck3r!",
            "H4ck3rW1r3l3ssPh4nt0m!", "D4rkW3bS3cur1tyPh4nt0m!", "Bl4ckH4tPh4nt0mC0d3Br3ak!", "H4ck3rPh4nt0mC0d3H3r0!"
        ];

        function generateRandomNumber() {
            const randomBytes = crypto.randomBytes(4);
            const randomNumber = randomBytes.readUInt32BE(0);
            return randomNumber.toString();
        };

        var generatedIp = `${ip[Math.floor(crypto.randomInt(0, ip.length))]}.${ip[Math.floor(crypto.randomInt(0, ip.length))]}.${ip[Math.floor(crypto.randomInt(0, ip.length))]}.${ip[Math.floor(crypto.randomInt(0, ip.length))]}`;
        var generatedUsername = `${hackerNames[Math.floor(crypto.randomInt(0, hackerNames.length))]}${generateRandomNumber()}`;
        var generatedEmail = `${generatedUsername}@${hackerDomains[Math.floor(crypto.randomInt(0, hackerDomains.length))]}`;
        var generatedPassword = hackerPasswords[Math.floor(crypto.randomInt(0, hackerPasswords.length))];

        let embed = new EmbedBuilder()
            .setColor("#800000")
            .setDescription(data.hack_embed_description
                .replace(/\${victim\.id}/g, victim.id)
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
            )
            .addFields({ name: data.hack_embed_fields_ip, value: `\`${generatedIp}\`` },
                { name: data.hack_embed_fields_email, value: `\`${generatedEmail}\`` },
                { name: data.hack_embed_fields_password, value: `\`${generatedPassword}\`` })
            .setTimestamp()

        await interaction.editReply({ embeds: [embed] });
        return;
    },
};
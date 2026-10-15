# Serial Parity Report

Structure-mode TS-vs-Rust registry comparison (one command at a time).

| command | verdict | reason |
| --- | --- | --- |
| Convert to MP4 | MATCH | in sync |
| Estimate the love | MATCH | in sync |
| Play it in a voice channel | MATCH | in sync |
| Pose a question! | MATCH | in sync |
| User Lookup | MATCH | in sync |
| add-react | MATCH | rust leaf legacy add-react |
| allowlist | MATCH | in sync |
| andru | MATCH | in sync |
| antiexe | MATCH | rust leaf legacy antiexe |
| antispam | EXEMPT | bare TS leaves vs Rust !leg group expansion (matcher alias artifact) |
| authrestore | MATCH | in sync |
| autologs | MATCH | in sync |
| automod | MATCH | in sync |
| autoreact | MATCH | in sync |
| autorespond | MATCH | rust leaf legacy autorespond |
| backup | MATCH | in sync |
| banner | MATCH | in sync |
| blacklist | MATCH | in sync |
| bledit | MATCH | in sync |
| blinfo | MATCH | in sync |
| blogger | MATCH | in sync |
| botinfo | MATCH | in sync |
| channel | MATCH | in sync |
| commandlimit | MATCH | in sync |
| confession | EXEMPT | ADOPT Rust-only count-only mod tool |
| counter | MATCH | in sync |
| custom | MATCH | in sync |
| economy | MATCH | in sync |
| embed | MATCH | ts leaf utils embed |
| ether | MATCH | in sync |
| eval | MATCH | in sync |
| fexini | MATCH | rust leaf legacy fexini |
| fun | MATCH | in sync |
| git | MATCH | in sync |
| grosbg | MATCH | in sync |
| guildconfig | EXEMPT | deliberate stateless replacement for the TS collector pager |
| gw | MATCH | in sync |
| h | MATCH | rust leaf legacy h |
| h247 | MATCH | in sync |
| help | MATCH | in sync |
| helpall | MATCH | rust leaf legacy helpall |
| honeypot | EXEMPT | TS interactive panel fields exposed as slash params |
| inv | MATCH | in sync |
| invite | MATCH | in sync |
| iris | MATCH | in sync |
| join-ghostping | EXEMPT | Rust-only prefix reader, no TS slash home |
| kawaeine | MATCH | rust leaf legacy kawaeine |
| kisakay | MATCH | in sync |
| langstats | MATCH | rust leaf legacy langstats |
| lastfm | MATCH | in sync |
| legacy | EXEMPT | Rust-only prefix organizer; TS has no legacy command |
| links | MATCH | in sync |
| list-react | MATCH | rust leaf legacy list-react |
| membercount | MATCH | in sync |
| mod | EXEMPT | deliberate additive pagination extra |
| music | EXEMPT | optional search param mirroring the TS leg read |
| nightmode | MATCH | in sync |
| nitrofdp | MATCH | rust leaf legacy nitrofdp |
| noaimie | MATCH | in sync |
| notifier | MATCH | in sync |
| owner | MATCH | in sync |
| perm | MATCH | in sync |
| pfps | MATCH | in sync |
| ping | MATCH | in sync |
| prefix | MATCH | in sync |
| profil | MATCH | in sync |
| protect | EXEMPT | allowlist legs merged under protect (mod.rs frozen) |
| punishpub | MATCH | in sync |
| ranks | MATCH | in sync |
| rap-vs-reality | MATCH | rust leaf legacy rap-vs-reality |
| remove-react | MATCH | rust leaf legacy remove-react |
| report | MATCH | in sync |
| rolebutton | MATCH | in sync |
| rolereaction | MATCH | in sync |
| rolesaver | MATCH | in sync |
| roleselect | MATCH | in sync |
| say | MATCH | in sync |
| schedule | EXEMPT | TS option-less interactive root; Rust deliberate slash surface |
| securewebhook | MATCH | rust leaf legacy securewebhook |
| security | MATCH | in sync |
| setlang | MATCH | in sync |
| setlogs | MATCH | in sync |
| setsuggest | MATCH | in sync |
| shardinfo | MATCH | rust leaf legacy shardinfo |
| skullboard | MATCH | in sync |
| starboard | MATCH | in sync |
| stats | MATCH | in sync |
| status | MATCH | in sync |
| status-embed | MATCH | rust leaf legacy status-embed |
| sticker | MATCH | rust leaf utils sticker |
| sticky | MATCH | in sync |
| suggest | MATCH | in sync |
| support | MATCH | in sync |
| tag | EXEMPT | kept single-role toggle; multi-select panel intentionally unported |
| ticket | MATCH | in sync |
| toggle-react | MATCH | in sync |
| top | MATCH | rust leaf utils top |
| tts | MATCH | in sync |
| two-sides | MATCH | rust leaf legacy two-sides |
| unban-all | MATCH | in sync |
| unblacklist | MATCH | in sync |
| unowner | MATCH | in sync |
| unslowmode | MATCH | in sync |
| updates | MATCH | rust leaf legacy updates |
| util | MATCH | in sync |
| utils | EXEMPT | prefix-only MessageCommand ports, no TS slash home |
| utilss | MATCH | in sync |
| voice | MATCH | in sync |
| welcomer | MATCH | in sync |

serial: total=109 match=97 divergent=0 exempt=12

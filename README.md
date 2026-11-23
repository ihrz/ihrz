<div align="center">

# 🌐 iHorizon

### _The most complete Discord bot on GitLab & GitHub_

<br>
<br>
<br>

<img src="https://www.ihorizon.org/assets/img/ihorizon.png" width="15%">

<br>
<br>
<br>

[![GitLab Release](https://img.shields.io/gitlab/v/release/ihrz/ihrz?style=for-the-badge&logo=gitlab&color=5865F2)](https://gitlab.com/ihrz/ihrz/-/releases)
[![GitHub Stars](https://img.shields.io/github/stars/ihrz/ihrz?style=for-the-badge&logo=github&color=FFD700)](https://github.com/ihrz/ihrz)
[![Discord](https://img.shields.io/discord/972538524790304788?style=for-the-badge&logo=discord&color=7289DA&label=Support%20Server)](http://discord.ihorizon.org/)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-orange?style=for-the-badge)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

**iHorizon** is a powerful and feature-rich Discord bot built with [TypeScript](https://www.typescriptlang.org/) and [discord.js](https://npmjs.com/discord.js). Designed to simplify Discord server management, it combines stability, performance, and a robust modular architecture: **710 commands** in **36 categories**, **13 languages**, a full **web dashboard**, and modern Discord cards (Components V2) everywhere.

[**📚 Documentation (BETA)**](https://www.ihorizon.org/docs) • [**🖥️ Dashboard**](https://dash.ihorizon.org) • [**🔍 Command Search**](https://www.ihorizon.org/search) • [**💬 Support Server**](http://discord.gg/ihorizon) • [**➕ Invite the Bot**](https://discord.com/api/oauth2/authorize?client_id=945202900907470899&permissions=8&scope=bot)

---

<div align="left">

## ✨ Key Features

### 🛡️ **Moderation & Security**

- **Complete Moderation Tools**: Ban, kick, warn, tempban, tempmute, temprole with detailed reason tracking, all answered with clean Components V2 cards
- **Smart Warn System**: Private staff notes, automatic expiry, and automatic sanctions per threshold (timeout, kick or ban at N active warnings), configurable with `/mod warnconfig` or the dashboard
- **Infraction Management**: Track, remove, and clear warnings across members
- **Advanced Logging**: Every server log (bans, kicks, boosts, channels, deleted and edited messages with their files, roles, voice, tickets, economy) as a colour-coded card
- **Native AutoMod & Honeypot**: Discord AutoMod rules set up for you, and a trap channel that catches raid bots
- **Anti-Spam Protection**: Intelligent spam detection with customizable thresholds and auto-punishments
- **Mass Moderation**: Unban all, clear all warns, and bulk role operations
- **Channel Control**: Lock/unlock channels, hide/unhide, and permission management
- **User Protection**: Block too-new accounts, mass mention protection, and bot addition controls

### 🎉 **Community Engagement & Events**

- **Giveaway System**: Create timed giveaways with custom requirements, winner selection, and reroll capabilities
- **Advanced Ticket System**: Customizable support tickets with panels, member management, and category organization, plus web transcripts at `ticket.ihorizon.org` that look like Discord (sign-in required, readable only by the ticket's members and the server staff)
- **Suggestion Module**: Structured suggestion system with accept/deny/reply functionality
- **Role Management**: Role reactions, role buttons, role selection menus, and automated role assignment
- **Invite Tracking**: Complete invite system with leaderboards, add/remove invites, and detailed analytics
- **Member Counter**: Dynamic channels showing member count, bot count, boost count, and more with custom formatting
- **Voice Dashboard**: Join-to-create voice channels with customizable interface and permission management

### 🎮 **Entertainment & Fun**

- **Interactive Commands**: Kiss, hug, slap, hack simulations, and love compatibility
- **Image Manipulation**: Cat say, captions, bubbles, to-gif conversion, and custom memes
- **Social Media Mocks**: Fake YouTube comments and Twitter tweets generator
- **Animals**: Random cat, dog, and duck pictures
- **Games & Random**: Dice rolls, heads or tails, random number generation, and question bot
- **Text Styling**: Morse code conversion and special character transformations
- **Pride Support**: Transgender flag overlay and LGBTQ+ friendly features

### 💰 **Economy System**

- **Full Economy**: Complete money system with bank accounts, deposits, and withdrawals
- **Income Sources**: Daily, weekly, monthly rewards, work commands, and rob mechanics
- **Trading**: Pay other users and secure transactions
- **Shop System**: Buy roles with money, customizable prices, and role marketplace
- **Leaderboards**: Server-wide wealth rankings and competition
- **Boost System**: Role-based money multipliers and economic perks
- **Custom Configuration**: Adjust reward amounts, cooldowns, and economic balance

### 📊 **Leveling & Progression**

- **XP System**: Automatic experience gain from messages and activity
- **Role Rewards**: Assign roles at specific level milestones
- **Leaderboards**: Server and global ranking systems
- **Customization**: Custom level-up messages, designated XP channels, and ignored channels
- **User Stats**: Detailed profile displays with experience tracking
- **Reset Options**: Individual or server-wide level resets for fresh starts

### 🎵 **Music Player**

- **Full Music Bot**: Play music from YouTube, Spotify, Deezer, SoundCloud, Apple Music, TIDAL and more, with queue management
- **Web & Discord Activity Player**: Control the music from the dashboard, or open the player right inside Discord from a voice channel
- **Playlists & Likes**: Personal playlists and liked tracks, importable from music sites and shareable on `music.ihorizon.org`
- **Synced Lyrics**: Karaoke-style lyrics that follow the track, Equalizer APO presets and 24/7 mode
- **Playback Controls**: Play, pause, resume, skip, stop, and shuffle
- **Queue System**: View current queue and song history
- **Loop Modes**: Track loop, queue loop, and autoplay
- **Now Playing**: Real-time display of current track with progress
- **Lyrics Finder**: Search and display song lyrics instantly
- **Last.fm & TTS**: Scrobbling stats and a text-to-speech voice in voice channels

### 🔧 **Advanced Utilities**

- **Channel Operations**: Mass channel creation, sync to category, hide/unhide all, and renewal
- **Member Management**: Mass move between voice channels, bring all to category, wake up inactive users, and derank
- **Role Operations**: Mass role assignment/removal, role member lists, admin role detection, and role limits
- **File Processing**: Zip/unzip emojis and stickers, emoji batch upload
- **Information Tools**: Server info, user info, banner/avatar display, and previous username lookup
- **Voice Tools**: Voice kick, leash/unleash users, and voice state monitoring
- **Webhook Management**: List and manage all server webhooks
- **Custom Tools**: Invite info lookup, mention role setter, nick-based kicking, and vanity URL generator

### 💾 **Backup & Configuration**

- **Complete Server Backup**: Save entire server structure including roles, channels, and permissions
- **Member Backup**: OAuth2-based role restoration system with verification buttons
- **Message Archival**: Optional message history backup
- **Easy Restoration**: One-command server recovery from backups
- **Backup Management**: List, load, and delete multiple backup versions
- **Guild-Specific Settings**: Owner-only backup restrictions and security controls

### 📢 **Content Notifications**

- **Multi-Platform Support**: Track YouTube channels, Twitch streamers, and blogs (Blogger)
- **Custom Notifications**: Set custom messages for new content alerts
- **Channel Routing**: Designate specific channels for notification delivery
- **Author Management**: Add, remove, and list followed content creators

### 🔐 **Security & Verification**

- **Captcha System**: Custom captcha verification for new members
- **Role Management**: Automatic role assignment/removal upon verification
- **Security Channel**: Designated verification channel setup
- **AuthRestore**: Link-based verification system with role recovery
- **Force Join**: Bulk member invite system for backup restoration

### 🎨 **Customization & Profiling**

- **Bot Appearance**: Custom name, avatar, banner, and bio per server
- **User Profiles**: Set age, gender, pronouns, birthday, and personal description
- **Public Profile Card**: An opt-in public card at `discord.wf/@username` with badges, links, Last.fm and stats
- **Profile Display**: Rich profile cards with statistics and customization
- **Support Badges**: Auto-role for members with server info in bio
- **Auto-React**: Set automatic emoji reactions in specific channels

### 📅 **Automation & Scheduling**

- **Auto-Renew**: Automatically recreate channels at set intervals
- **Scheduled Tasks**: Time-based command execution and automation
- **Cooldowns**: Channel-specific slowmode management
- **Member Counter**: Auto-updating member statistics channels
- **PFPS Module**: Automatic random profile picture sharing
- **Night Mode**: Advanced time-based feature toggles

### 🎓 **Server Management**

- **Permission System**: Granular command permissions, custom roles, and user-specific access
- **Prefix Customization**: Change bot prefix per server
- **Language Selection**: Choose from 13 supported languages with `/setlang`
- **Web Dashboard**: Configure every module, read the activity journal, manage sanctions, members, tickets, giveaways and backups at [dash.ihorizon.org](https://dash.ihorizon.org)
- **Module Toggles**: Enable/disable entire feature categories
- **Join/Leave System**: Custom messages, ghost ping prevention, and welcome DMs
- **Auto-Moderation**: Link blocking, invite filtering, and configurable punishments
- **Confession System**: Anonymous confession channel with cooldowns and threading

### 📈 **Statistics & Analytics**

- **User Statistics**: Individual member activity tracking and leaderboards
- **Guild Statistics**: Server-wide analytics and progression metrics
- **Command Usage**: Track most-used commands and features
- **Invite Analytics**: Detailed invite tracking and attribution
- **Economy Rankings**: Wealth distribution and top earners
- **XP Leaderboards**: Most active members and level progression

### 🎫 **Tags & Quick Responses**

- **Custom Tags**: Create reusable text snippets and commands
- **Sticky Messages & Starboard**: Messages that stay at the bottom of a channel, starboard and skullboard
- **Role Restrictions**: Whitelist roles for tag creation and usage
- **Embed Support**: Rich embed tags with formatting
- **Tag Management**: Edit, delete, list, and get info on all tags
- **Quick Access**: Instant responses with mention and reply options

_**And dozens of other features**_

---

## 🌍 Supported Languages

iHorizon speaks **13 languages**, and the dashboard is translated into all of them:

| Language           | Code    | Language      | Code    |
| ------------------ | ------- | ------------- | ------- |
| 🇪🇬 Egyptian Arabic | `ar-EG` | 🇯🇵 Japanese   | `jp-JP` |
| 🇬🇧 English         | `en-US` | 🇰🇷 Korean     | `ko-KR` |
| 🇫🇷 French          | `fr-FR` | 🇵🇱 Polish     | `pl-PL` |
| 🤬 Rude French     | `fr-ME` | 🇵🇹 Portuguese | `pt-PT` |
| 🇩🇪 German          | `de-DE` | 🇷🇺 Russian    | `ru-RU` |
| 🇮🇹 Italian         | `it-IT` | 🇪🇸 Spanish    | `es-ES` |
|                    |         | 🇺🇦 Ukrainian  | `uk-UA` |

Slash command descriptions and choices are also translated in Discord's `/` menu for French, German, Italian, Spanish, Brazilian Portuguese, Polish, Russian, Ukrainian, Japanese and Korean (they follow each member's Discord language).

---

## 📊 Statistics

### 🔥 Community Trust

| Metric                   | Value                   |
| ------------------------ | ----------------------- |
| 👥 **Users**             | 460,000+                |
| 🏢 **Servers**           | 3,250+                  |
| 🧩 **Shards**            | 6                       |
| ⌨️ **Commands**          | 710 in 36 categories    |
| 🌍 **Languages**         | 13                      |
| ✅ **Discord Certified** | Verified since Jun 2023 |
| ⭐ **GitHub Stars**      | 80+                     |

---

## 🚀 Installation & Self-Hosting

### 📦 One-Line Provisioning Script

```bash
curl -fsSL https://ihorizon.org/install | bash
```

That's it! The script handles everything for you: dependencies (Bun), configuration, installation, and first launch.

🖥️ **Operating System**: Linux, macOS, or Windows

---

## 📚 Resources & Links

| Resource                          | Link                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------- |
| 🖥️ **Dashboard**                  | [dash.ihorizon.org](https://dash.ihorizon.org)                                  |
| 📖 **Full Documentation**         | [www.ihorizon.org/docs](https://www.ihorizon.org/docs)                          |
| 🔍 **Command Search**             | [www.ihorizon.org/search](https://www.ihorizon.org/search)                      |
| 💬 **Main Discord Server**        | [discord.ihorizon.org](http://discord.ihorizon.org/)                            |
| 🔗 **Backup Discord Server Link** | [discord.gg/ZpBPGNsAsu](https://discord.gg/ZpBPGNsAsu)                          |
| 🤖 **Invite iHorizon**            | [Click Here](https://discord.com/oauth2/authorize?client_id=945202900907470899) |
| 🦊 **GitLab (Main)**              | [gitlab.com/ihrz](https://gitlab.com/ihrz/ihrz)                                 |
| 🐙 **GitHub (Mirror)**            | [github.com/ihrz/ihrz](https://github.com/ihrz/ihrz)                            |

---

## 🏆 Development Team

<table>
	<tr>
		<td align="center" width="33%">
			<img src="https://github.com/Kisakay.png" width="100px" style="border-radius:50%" /><br />
			<b>Kisakay</b><br />
			<i>Main Creator</i><br />
			<sub>She/Her</sub><br />
			<a href="https://gitlab.com/Kisakay">GitLab</a> /
			<a href="https://github.com/Kisakay">GitHub</a>
		</td>
		<td align="center" width="33%">
			<img src="https://github.com/name-shitty-github-profile.png" width="100px"
				style="border-radius:50%" /><br />
			<b>Noémie</b><br />
			<i>Creator & Marketing Manager</i><br />
			<sub>She/Her</sub><br />
			<a href="https://github.com/name-shitty-github-profile">GitHub</a>
		</td>
	</tr>
</table>

> 💜 **Team Note**: Kisakay has embraced her true identity and now uses she/her pronouns. In the license files, the name **Anaïs Saraiva** appears as the owner.

## 💝 Contributors's walls

<table>
<tr>
  <td align="center" width="33%">
    <img src="https://github.com/lavecat.png" width="100px" style="border-radius:50%"/><br/>
    <b>lavecat</b><br/>
    <i>Contributor</i><br/>
    <sub>He/Him</sub><br/>
    <a href="https://github.com/lavecat">GitHub</a>
  </td>

  <td align="center" width="33%">
    <img src="https://gitlab.com/uploads/-/system/user/avatar/34776844/avatar.png" width="100px" style="border-radius:50%"/><br/>
    <b>82hw</b><br/>
    <i>Contributor</i><br/>
    <sub>any</sub><br/>
    <a href="https://gitlab.com/82hw">GitLab</a>
  </td>

  <td align="center" width="33%">
    <img src="https://gitlab.com/uploads/-/system/user/avatar/9658266/avatar.png" width="100px" style="border-radius:50%"/><br/>
    <b>simnJS</b><br/>
    <i>Contributor</i><br/>
    <sub>He/Him/Femboy</sub><br/>
    <a href="https://simnjs.fr">Website</a> / <a href="https://github.com/simnJS">GitHub</a>
  </td>

</tr>
</table>

## Alumni

Past developers and contributors who have helped make iHorizon what it is today.

<table>
	<tr>
        <td align="center" width="33%">
			<img src="https://github.com/irisihrz.png" width="100px" style="border-radius:50%" /><br />
			<b>IrisWeb</b><br />
			<i>Old Core Developer</i><br />
			<sub>She/Her</sub><br />
			<a href="https://github.com/irisihrz">GitHub</a>
		</td>
		<td align="center" width="33%">
    		<img src="https://github.com/veryuhq.png" width="100px" style="border-radius:50%"/><br/>
    		<b>Ether</b><br/>
    		<i>Former contributor</i><br/>
    		<sub>He/Him</sub><br/>
    		<a href="https://gitlab.com/veryuhq">GitLab</a> / <a href="https://github.com/veryuhq">GitHub</a>
  		</td>
    	<td align="center" width="33%">
    		<img src="https://github.com/NymiiTechTips.png" width="100px" style="border-radius:50%"/><br/>
      		<b>NymiiTechTips</b><br/>
        	<i>Contributor</i><br/>
         	<sub>She/Her</sub><br/>
        	<a href="https://github.com/NymiiTechTips">GitHub</a>
     	</td>	
        <td align="center" width="33%">
    		<img src="https://github.com/Mxi1n.png" width="100px" style="border-radius:50%"/><br/>
    		<b>Maxine</b><br/>
    		<i>Former contributor</i><br/>
    		<sub>She/Her</sub><br/>
    		<a href="https://github.com/Mxi1n">GitHub</a>
		</td>
		<td align="center" width="33%">
    		<img src="https://github.com/Luxinenglish.png" width="100px" style="border-radius:50%"/><br/>
    		<b>Lux_</b><br/>
    		<i>Former contributor</i><br/>
    		<sub>He/Him</sub><br/>
    		<a href="https://github.com/Luxinenglish">GitHub</a>
  		</td>
	</tr>
</table>

---

## 📜 History & Evolution

🚀 **September 2020**: Initial project launch with discord.js v12  
📈 **2021-2023**: Continuous growth and major feature additions  
🔄 **2024**: Migration to GitLab for better development management  
⚡ **2025**: Modern architecture with latest discord.js version and Bun runtime  
😎 **2026**: Enforcing bot structure, features, community, adding major philosophical changes

---

## 📄 License & Terms of Use

iHorizon is distributed under **[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)** license.

### ✅ **Permitted**

✔️ **Share**: Copy and redistribute the material  
✔️ **Adapt**: Remix, transform, and build upon the material

### ❌ **Restrictions**

❌ **Attribution**: You must credit the work and indicate changes  
❌ **Non-Commercial Use**: No commercial use  
❌ **Share Alike**: Modifications must retain the same license  
❌ **No Additional Restrictions**: No additional legal or technological restrictions

---

## 💬 Support & Contact

Need help? Several options are available:

**Discord Server**: Join our community at [discord.ihorizon.org](http://discord.ihorizon.org/)  
**Documentation**: Check [www.ihorizon.org/docs](https://www.ihorizon.org/docs/)  
**Direct Contact**: Reach out to the owners via Discord

---

## ⚠️ Code of Conduct

🚨 **Zero Tolerance for Hate**: Any form of hate towards contributors will not be tolerated, regardless of type or level.

🌈 **Inclusivity**: iHorizon is an open and welcoming project for everyone, regardless of origin, gender identity, sexual orientation, or any other characteristic.

---

### 🎉 Thank you for using iHorizon

<sub>Developed with ❤️ by the iHorizon community</sub>

[![Made with TypeScript](https://img.shields.io/badge/Made%20with-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Powered by discord.js](https://img.shields.io/badge/Powered%20by-discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)

</div>

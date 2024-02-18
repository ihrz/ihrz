import { DescriptionLocalizations } from "./command"

export interface BotContent {
    cmd: string,
    category: string,
    desc: string,
    desc_localized: DescriptionLocalizations,
    messageCmd: boolean,
}
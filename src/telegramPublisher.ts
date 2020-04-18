import TelegramBot from 'node-telegram-bot-api'
import { IPublisher } from './interfaces';

export default class TelegramPublisher implements IPublisher {
    private bot: TelegramBot

    constructor(token: string, private chatId: string){
        this.bot = new TelegramBot(token)
    }

    publisherDescription(){
        return `telegram publisher-chatId: ${this.chatId}`
    }

    public async publish(message: string){
        this.bot.sendMessage(this.chatId, message)
    }
}
import {IPublisher} from './interfaces'

export default class ConsolePublisher implements IPublisher{
    async publish(date: Date, description: string, chargedAmount: number) {
        console.log(`published transaction ${description} on date ${date} with ammount ${chargedAmount}`)
    }
}

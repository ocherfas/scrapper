import {ScrapeTime, IsraeliScrapper, Credentials, Publisher, Transaction} from './interfaces'
import {orderBy, last} from 'lodash'


class IntervalScrapper {
    options: any
    scrapeTime: ScrapeTime
    israeliScrapper: IsraeliScrapper
    credentials: Credentials
    publisher: Publisher

    constructor(
        options: any, 
        scrapeTime: ScrapeTime, 
        israeliScrapper: IsraeliScrapper, 
        credentials: Credentials, 
        publisher: Publisher
    ){
        this.options = options
        this.scrapeTime =  scrapeTime
        this.israeliScrapper = israeliScrapper
        this.credentials = credentials
        this.publisher = publisher
    }

    async scrape(){
        const lastScrapeTime = await this.scrapeTime.getLastScrapeTime()
        const currentDate = new Date()
        const result = await this.israeliScrapper.scrape({...this.options, startDate: lastScrapeTime}, this.credentials)
        
        if (result?.success){
            const transactions = result.accounts?.[0]?.txns ?? []
            const transactionsDate = transactions.map((transaction) => {
                return {
                    ...transaction,
                    date: new Date(transaction.date)
                }
            })

            const orderedTransactions = orderBy(transactionsDate, transaction => transaction.date)
            for (const transaction of orderedTransactions){
                await this.publisher.publish(
                    new Date(transaction.date), 
                    transaction.description, 
                    transaction.chargedAmount
                )
            }

            const latestTransaction = last(transactionsDate)
            if (latestTransaction && latestTransaction.date > currentDate) {
                await this.scrapeTime.saveLastScrapeTime(latestTransaction.date)
            } else {
                await this.scrapeTime.saveLastScrapeTime(currentDate)
            }
        }
    }
}

export {IntervalScrapper}


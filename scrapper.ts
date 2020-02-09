import {ScrapeTime, IsraeliScrapper, Credentials, Publisher, Logger} from './interfaces'
import {orderBy, last} from 'lodash'


class IntervalScrapper {
    options: any
    scrapeTime: ScrapeTime
    israeliScrapper: IsraeliScrapper
    credentials: Credentials
    publisher: Publisher
    logger: Logger

    constructor(
        options: any, 
        scrapeTime: ScrapeTime, 
        israeliScrapper: IsraeliScrapper, 
        credentials: Credentials, 
        publisher: Publisher,
        logger: Logger
    ){
        this.options = options
        this.scrapeTime =  scrapeTime
        this.israeliScrapper = israeliScrapper
        this.credentials = credentials
        this.publisher = publisher
        this.logger = logger
    }

    async scrape(){
        let lastScrapeTime: Date;
        
        try{
            lastScrapeTime = await this.scrapeTime.getLastScrapeTime()
        } catch (error) {
            this.logger.log(`Could not get last scrape time due to: ${error}`, 'error')
            return
        }
        
        const currentDate = new Date()
        const result = (await this.israeliScrapper.scrape({...this.options, startDate: lastScrapeTime}, this.credentials))
        
        if (!result) {
            this.logger.log(`Error scrapping ${this.options.companyId}, did not get result`, 'error')
            return
        }

        if (result.success){
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
                try{
                    await this.scrapeTime.saveLastScrapeTime(currentDate)
                } catch (error) {
                    this.logger.log(`Error updating scrapping date, message: ${error}`, 'error')
                }
            }
        } else {
            this.logger.log(`Error scrapping ${this.options.companyId}, type: ${result?.errorType}, message: ${result.errorMessage}`, 'error')
        }
    }
}

export {IntervalScrapper}


import {IScrapeTime, IIsraeliScrapper, Credentials, IPublisher, ILogger} from './interfaces'
import {orderBy, last} from 'lodash'


class IntervalScrapper {
    options: any
    scrapeTime: IScrapeTime
    israeliScrapper: IIsraeliScrapper
    credentials: Credentials
    publisher: IPublisher
    logger: ILogger
    initialScrapeTime: Date

    constructor(
        options: any, 
        scrapeTime: IScrapeTime, 
        israeliScrapper: IIsraeliScrapper, 
        credentials: Credentials, 
        publisher: IPublisher,
        logger: ILogger,
        initialScrapeTime: Date
    ){
        this.options = options
        this.scrapeTime =  scrapeTime
        this.israeliScrapper = israeliScrapper
        this.credentials = credentials
        this.publisher = publisher
        this.logger = logger
        this.initialScrapeTime = initialScrapeTime
    }

    async scrape(){
        let lastScrapeTime: Date;
        
        try{
            lastScrapeTime = await this.scrapeTime.getLastScrapeTime()
        } catch (error) {
            this.logger.log(`Could not get last scrape time due to: ${error}`, 'error')
            return
        }

        if (!lastScrapeTime) {
            lastScrapeTime = this.initialScrapeTime
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

            let timeToUpdate: Date
            if (transactionsDate.length > 0){
                timeToUpdate = last(transactionsDate).date
            } else {
                timeToUpdate = currentDate
            }

            try{
                await this.scrapeTime.saveLastScrapeTime(timeToUpdate)
            } catch (error) {
                this.logger.log(`Error updating scrapping date, message: ${error}`, 'error')
            }

        } else {
            this.logger.log(`Error scrapping ${this.options.companyId}, type: ${result?.errorType}, message: ${result.errorMessage}`, 'error')
        }
    }
}

export {IntervalScrapper}


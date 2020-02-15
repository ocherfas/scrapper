import {IScrapeTime, IIsraeliScrapper, Credentials, IPublisher} from './interfaces'
import {orderBy } from 'lodash'


export default class IntervalScrapper {
    options: any
    scrapeTime: IScrapeTime
    israeliScrapper: IIsraeliScrapper
    credentials: Credentials
    publisher: IPublisher
    initialScrapeTime: Date

    constructor(
        options: any, 
        scrapeTime: IScrapeTime, 
        israeliScrapper: IIsraeliScrapper, 
        credentials: Credentials, 
        publisher: IPublisher,
        initialScrapeTime: Date
    ){
        this.options = options
        this.scrapeTime =  scrapeTime
        this.israeliScrapper = israeliScrapper
        this.credentials = credentials
        this.publisher = publisher
        this.initialScrapeTime = initialScrapeTime
    }

    async scrape(){
        let lastScrapeTime: Date;
        
        try{
            lastScrapeTime = await this.scrapeTime.getLastScrapeTime()
        } catch (error) {
            console.error(`Could not get last scrape time due to: ${error}`, 'error')
            return
        }

        if (!lastScrapeTime) {
            lastScrapeTime = this.initialScrapeTime
        }
        
        const currentDate = new Date()
        
        let result
        try{
            result = await this.israeliScrapper.scrape({...this.options, startDate: lastScrapeTime}, this.credentials)
        } catch(error){
            console.error(`Error scrapping ${this.options.companyId}: ${error}`)
            return
        }
        
        if (!result) {
            console.error(`Error scrapping ${this.options.companyId}, did not get result`)
            return
        }

        if (result.success){
            const transactions = result.accounts?.[0]?.txns ?? []
            let timeToUpdate: Date
            if (transactions.length > 0){
                const transactionsDate = transactions.map((transaction) => {
                    return {
                        ...transaction,
                        date: new Date(transaction.date)
                    }
                })

                const orderedTransactions = orderBy(transactionsDate, transaction => transaction.date)
                for (const transaction of orderedTransactions){
                    try{
                        await this.publisher.publish(
                            new Date(transaction.date), 
                            transaction.description, 
                            transaction.chargedAmount
                        )
                        timeToUpdate = transaction.date
                    } catch (error){
                        console.error(`Error publishing transaction ${transaction.description}, message: ${error}`)
                        break;
                    }
                }
            } else {
                timeToUpdate = currentDate
            }

            try{
                await this.scrapeTime.saveLastScrapeTime(timeToUpdate)
            } catch (error) {
                console.error(`Error updating scrapping date, message: ${error}`)
            }

        } else {
            console.error(`Error scrapping ${this.options.companyId}, type: ${result?.errorType}, message: ${result.errorMessage}`)
        }
    }
}


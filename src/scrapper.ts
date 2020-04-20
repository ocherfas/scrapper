import {IScrapeTime, IIsraeliScrapper, Credentials, IPublisher} from './interfaces'

export default class IntervalScrapper {
    constructor(
        private options: any, 
        private scrapeTime: IScrapeTime, 
        private israeliScrapper: IIsraeliScrapper, 
        private credentials: Credentials, 
        private publishers: IPublisher[],  
    ){}

    async scrape(){
        const dateTimeSearchFrom = new Date()
        dateTimeSearchFrom.setDate(dateTimeSearchFrom.getDate() - 2) // start scrapping from two days ago
        // TODO - maybe use the previous day to start the scrape

        let result
        try{
            result = await this.israeliScrapper.scrape({...this.options, startDate: dateTimeSearchFrom}, this.credentials)
        } catch(error){
            console.error(`Error scrapping ${this.options.companyId}: ${error}`)
            return
        }

        if (!result) {
            console.error(`Error scrapping ${this.options.companyId}, did not get result`)
            return
        }

        if (result.success) {
            const currentDateTransactions = await this.scrapeTime.dateTransactions(this.options.companyId, dateTimeSearchFrom)
            const transactions: any[] = result.accounts?.[0]?.txns ?? []

            const newTransactions = transactions.filter(txn => !currentDateTransactions.includes(txn.identifier))
            const successPublish = []
            for (const txn of newTransactions){
                const transactionMessage = `Transaction with amount ${txn.chargedAmount} with description '${txn.description}' was received on ${new Date(txn.date)}`
                for (const publisher of this.publishers){
                    try{
                        await publisher.publish(transactionMessage)
                    } catch(error){
                        console.error(`Error publishing transaction:\nPublisher:${publisher.publisherDescription()}\nTransaction: ${txn.identifier}: ${error}`)    
                    }
                }
            }

            await this.scrapeTime.addTransactions(this.options.companyId, dateTimeSearchFrom, successPublish.map(txn => txn.identifier))

        } else {
            console.error(`Error scrapping ${this.options.companyId}, type: ${result?.errorType}, message: ${result.errorMessage}`)
        }
    }
}


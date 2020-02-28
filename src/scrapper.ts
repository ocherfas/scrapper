import {IScrapeTime, IIsraeliScrapper, Credentials, IPublisher} from './interfaces'

export default class IntervalScrapper {
    constructor(
        private options: any, 
        private scrapeTime: IScrapeTime, 
        private israeliScrapper: IIsraeliScrapper, 
        private credentials: Credentials, 
        private publisher: IPublisher,  
    ){}

    async scrape(){
        const currentDate = new Date()
        // TODO - maybe use the previous day to start the scrape

        let result
        try{
            result = await this.israeliScrapper.scrape({...this.options, startDate: currentDate}, this.credentials)
        } catch(error){
            console.error(`Error scrapping ${this.options.companyId}: ${error}`)
            return
        }

        if (!result) {
            console.error(`Error scrapping ${this.options.companyId}, did not get result`)
            return
        }

        if (result.success) {
            const currentDateTransactions = await this.scrapeTime.dateTransactions(currentDate)
            const transactions: any[] = result.accounts?.[0]?.txns ?? []

            const newTransactions = transactions.filter(txn => !currentDateTransactions.includes(txn.identifier))
            const successPublish = []
            for (const txn of newTransactions){
                try{
                    await this.publisher.publish(
                        new Date(txn.date), 
                        txn.description, 
                        txn.chargedAmount
                    )
                    successPublish.push(txn)
                } catch(error){
                    console.error(`Error publishing transaction ${txn.identifier}: ${error}`)
                }
            }

            await this.scrapeTime.addTransactions(currentDate, successPublish.map(txn => txn.identifier))

        } else {
            console.error(`Error scrapping ${this.options.companyId}, type: ${result?.errorType}, message: ${result.errorMessage}`)
        }
    }
}


import {IIsraeliScrapper, Credentials, ScrapeResult} from './interfaces'
const {createScraper} = require('../dependencies/israeli-bank-scrapers/lib/')

class IsraeliScrapers implements IIsraeliScrapper{
    async scrape(options: any, credentials: Credentials) {
        const scraper = createScraper(options, credentials)    
        return scraper.scrape(credentials) as Promise<ScrapeResult>
    }
}

export default new IsraeliScrapers()
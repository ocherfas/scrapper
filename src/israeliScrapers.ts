import {IIsraeliScrapper, Credentials, ScrapeResult} from './interfaces'
const {createScraper} = require('israeli-bank-scrapers')

class IsraeliScrapers implements IIsraeliScrapper{
    async scrape(options: any, credentials: Credentials) {
        const scraper = createScraper(options, credentials)    
        return scraper.scrape(credentials) as Promise<ScrapeResult>
    }
}

export default new IsraeliScrapers()
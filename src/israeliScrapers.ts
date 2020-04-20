import {IIsraeliScrapper, Credentials, ScrapeResult} from './interfaces'
const {createScraper} = require('israeli-bank-scrapers')
const puppeteer = require('puppeteer')

class IsraeliScrapers implements IIsraeliScrapper{
    async scrape(options: any, credentials: Credentials) {
        const optionsWithBrowser = {
            ...options,
            browser: await puppeteer.launch({
                args: [
                    '--no-sandbox'
                ]
            })
        }
        const scraper = createScraper(optionsWithBrowser, credentials)
        return scraper.scrape(credentials) as Promise<ScrapeResult>
    }
}

export default new IsraeliScrapers()
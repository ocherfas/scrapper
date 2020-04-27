import {IIsraeliScrapper, Credentials, ScrapeResult} from './interfaces'
const {createScraper} = require('israeli-bank-scrapers')
const puppeteer = require('puppeteer')

class IsraeliScrapers implements IIsraeliScrapper{
    async scrape(options: any, credentials: Credentials) {
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox'
            ]
        })

        try {
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
        } finally {
            await browser.close()
        }
    }
}

export default new IsraeliScrapers()
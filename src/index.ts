require('dotenv').config()
import israeliScraper from './israeliScrapers'
import ScrapeTime from './scrapeTime'
import EmailPublisher from './emailPublisher'
import ConsolePublisher from './consolePublisher'
import Scraper from './scrapper'

const options = {
    companyId: 'otsarHahayal', // mandatory; one of 'hapoalim', 'hapoalimBeOnline', leumi', 'discount', 'mizrahi', 'otsarHahayal', 'visaCal', 'max', 'isracard', 'amex'
    // combineInstallments: boolean, // if set to true, all installment transactions will be combine into the first one
    // showBrowser: boolean, // shows the browser while scraping, good for debugging (default false)
    verbose: true, // include more debug info about in the output
    // browser : Browser, // optional option from init puppeteer browser instance outside the libary scope. you can get browser diretly from puppeteer via `puppeteer.launch()` command.
    // executablePath: string // optional. provide a patch to local chromium to be used by puppeteer. Relevant when using `israeli-bank-scrapers-core` library 
  }

const credentials = {
    username: process.env.BANK_USERNAME,
    password: process.env.BANK_PASSWORD
}; // different for each bank

// const publisher = new EmailPublisher({
//    to: "ocherfas@gmail.com",
//    from: "noone@noone.com"
// });

const publisher = new ConsolePublisher()

const scrapeTime = new ScrapeTime("./scrapeDates");
const scraper = new Scraper(options, scrapeTime, israeliScraper, credentials, publisher);
(async function() {
   try{
      await scraper.scrape()
      console.log('scraped')
   } catch(error){
      console.log(`no ok: ${error}`)
   }
})();

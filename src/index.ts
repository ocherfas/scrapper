require('dotenv').config()
const { createScraper } = require('israeli-bank-scrapers');

console.log('start to scrape')
const date = Date.parse('26 Jan 2020 00:00:00 GMT');

const options = {
    companyId: 'otsarHahayal', // mandatory; one of 'hapoalim', 'hapoalimBeOnline', leumi', 'discount', 'mizrahi', 'otsarHahayal', 'visaCal', 'max', 'isracard', 'amex'
    startDate: date, // the date to fetch transactions from (can't be before the minimum allowed time difference for the scraper)
    // combineInstallments: boolean, // if set to true, all installment transactions will be combine into the first one
    // showBrowser: boolean, // shows the browser while scraping, good for debugging (default false)
    verbose: true, // include more debug info about in the output
    // browser : Browser, // optional option from init puppeteer browser instance outside the libary scope. you can get browser diretly from puppeteer via `puppeteer.launch()` command.
    // executablePath: string // optional. provide a patch to local chromium to be used by puppeteer. Relevant when using `israeli-bank-scrapers-core` library 
  }

const credentials = {
    username: process.env.USERNAME,
    password: process.env.PASSWORD
}; // different for each bank

(async function() {
    try {
       const scraper = createScraper(options);
       const scrapeResult = await scraper.scrape(credentials);
    
       if (scrapeResult.success) {
         scrapeResult.accounts.forEach((account) => {
            console.log(`found ${account.txns.length} transactions for account number 
             ${account.accountNumber}`);
         });
       }
       else {
          throw new Error(scrapeResult.errorType);
       }
    } catch(e) {
       console.error(`scraping failed for the following reason: ${e.message}`);
    }
 })();


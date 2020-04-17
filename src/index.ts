import fs from 'fs-extra'
import {getScrappers, Config} from './scrapperFactory'
import cron from 'node-cron'


const configPath = process.env.CONFIG_PATH || "./config.json";

(async function() {
   const config = (await fs.readJSON(configPath)) as Config
   const scrapers = getScrappers(config)

   const scrapeOnce = async () => {
      try{
         console.log(`Starting to scrape`)
         await Promise.all(scrapers.map(scrapper => scrapper.scrape()))

         console.log('scraped')
      } catch(error) {
         console.error(`Error scrapping: ${error}`)
      }
   }

   try{
      scrapeOnce()
      const task = cron.schedule("* * * * *", scrapeOnce) // scrape every minute
      task.start()
   }catch (error){
      console.error(error)
   }
})();


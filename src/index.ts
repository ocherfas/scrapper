import fs from 'fs-extra'
import {getScrappers, Config} from './scrapperFactory'


const configPath = process.env.CONFIG_PATH || "./config.json";

(async function() {
   try{
      const config = (await fs.readJSON(configPath)) as Config
      const scrapers = getScrappers(config)

      console.log(`Starting to scrape`)
      await Promise.all(scrapers.map(scrapper => scrapper.scrape()))

      console.log('scraped')
   } catch(error){
      console.error(`Error scrapping: ${error}`)
   }
})();


import EmailPublisher from './emailPublisher'
import IntervalScrapper from './scrapper'
import ScrapeTime from './scrapeTime'
import israeliScraper from './israeliScrapers'

export function getScrappers(config: Config): IntervalScrapper[]{
    const publisher = new EmailPublisher(config.publisher)
    const scrapeTimes = new ScrapeTime(config.storagePath)

    return config.scrappers.map(scrapperConfig => {
        const credentials = {
            username: scrapperConfig.username,
            password: scrapperConfig.password
        }

        const options = {
            companyId: scrapperConfig.companyId,
            verbose: true
        }

        return new IntervalScrapper(options, scrapeTimes,israeliScraper, credentials, publisher)
    })
}

export type Config = {
   scrappers: {
      companyId: string,
      username: string,
      password: string
   }[],
   publisher: {
      to: string,
      from: string
      subject: string
   },
   storagePath: string
}
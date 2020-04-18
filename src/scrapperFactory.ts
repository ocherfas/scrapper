import EmailPublisher from './emailPublisher'
import IntervalScrapper from './scrapper'
import ScrapeTime from './scrapeTime'
import israeliScraper from './israeliScrapers'
import TelegramPublisher from './telegramPublisher'

export function getScrappers(config: Config): IntervalScrapper[]{
    const publishers = config.publishers.map(publisherConfig => {
        if ((publisherConfig as any).chatId) {
            const config = publisherConfig as TelegramPublisherConfig
            return new TelegramPublisher(config.token, config.chatId)
        } else {
            const config = publisherConfig as EmailPublisherConfig
            return new EmailPublisher(config)
        }
    })

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

        return new IntervalScrapper(options, scrapeTimes,israeliScraper, credentials, publishers)
    })
}

type EmailPublisherConfig = {
    to: string,
    from: string
    subject: string
}

type TelegramPublisherConfig = {
    chatId: string,
    token: string
}

export type Config = {
   scrappers: {
      companyId: string,
      username: string,
      password: string
   }[],
   publishers: (EmailPublisherConfig | TelegramPublisherConfig) [],
   storagePath: string
}
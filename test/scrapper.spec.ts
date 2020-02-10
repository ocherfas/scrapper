import { assert } from 'chai';
import 'mocha';
import {IntervalScrapper} from '../scrapper'
import {ScrapeTime, IsraeliScrapper, Publisher, ScrapeResult, Transaction, Logger} from '../interfaces'
import sinon, { stubInterface } from "ts-sinon";

describe('Scrapper Tests', 
  () => {
    // General stubs (should be overridden for specific tests)
    const scrapeTimeStub = stubInterface<ScrapeTime>()
    const scrapperStub = stubInterface<IsraeliScrapper>()
    const publisherStub = stubInterface<Publisher>()   
    const logger = stubInterface<Logger>()
    const options = {}
    const initialScrapeTime = null
    const credentials = {username: "", password: ""}

  it('should scrape with last scrape time in options object, and user correct options and credentials', async () => { 
    const scrapeTimeStub1 = stubInterface<ScrapeTime>()
    const scrapperStub1 = stubInterface<IsraeliScrapper>()
    const options1 = {key: "value"}
    const credentials = {username: "some-user", password: "some-password"}

    const date = new Date()
    const datePromise = new Promise<Date>((resolve) => {
      resolve(date)
    })

    scrapeTimeStub1.getLastScrapeTime.returns(datePromise)

    const scrapperInterval = new IntervalScrapper(options1, scrapeTimeStub1, scrapperStub1, credentials, publisherStub, logger, initialScrapeTime)
    await scrapperInterval.scrape()

    const rightCall = scrapperStub1.scrape.calledOnceWithExactly({...options1, startDate: date}, credentials)
    assert.equal(rightCall, true)
  });
  it('On success scraping: should save the time before the scrape', async () => {
    const scrapeTimeStub1 = stubInterface<ScrapeTime>()
    const scrapperStub1 = stubInterface<IsraeliScrapper>()
    const scrapeDate = new Date()
    scrapeDate.setSeconds(scrapeDate.getSeconds()+20)

    const scrapeResultPromise = new Promise<ScrapeResult>((resolve) => {
      resolve({
        success: true
      })
    })

    const clock = sinon.useFakeTimers({now: scrapeDate})

    scrapperStub1.scrape.returns(scrapeResultPromise)
    const scrapperInterval = new IntervalScrapper(options, scrapeTimeStub1, scrapperStub1, credentials, publisherStub, logger, initialScrapeTime)
    await scrapperInterval.scrape()

    assert.equal(scrapeTimeStub1.saveLastScrapeTime.calledOnceWith(scrapeDate), true)
    clock.restore()
  }); 
  it('On success scraping: should publish all transactions received, ordered by the time received', async () => {
    const scrapperStub1 = stubInterface<IsraeliScrapper>()
    const publisherStub1 = stubInterface<Publisher>()
    const firstDate = new Date()
    const laterDate = new Date()
    laterDate.setSeconds(laterDate.getSeconds() + 20)

    const firstTransaction: Transaction = {
      type: 'normal',
      date: firstDate.toISOString(), // ISO date string
      processedDate: "", // ISO date string
      originalAmount: 20,
      originalCurrency: "",
      chargedAmount: 100,
      description: "first transaction",
      installments: {
          number: 10, // the current installment number
          total: 20, // the total number of installments
      },
      status: 'completed'
    }

    const laterTransaction: Transaction = {
      type: 'normal',
      date: laterDate.toISOString(), // ISO date string
      processedDate: "", // ISO date string
      originalAmount: 20,
      originalCurrency: "",
      chargedAmount: 300,
      description: "later transaction",
      installments: {
          number: 0, // the current installment number
          total: 0, // the total number of installments
      },
      status: 'completed'
    }

    const scrapeResultPromise = new Promise<ScrapeResult>((resolve) => {
      resolve({
        success: true,
        accounts: [{
          accountNumber: "",
          txns: [
            laterTransaction, firstTransaction
          ]
        }]
      })
    })     

    scrapperStub1.scrape.returns(scrapeResultPromise)

    const scrapperInterval = new IntervalScrapper(options, scrapeTimeStub, scrapperStub1, credentials, publisherStub1, logger, initialScrapeTime)
    await scrapperInterval.scrape()

    const firstPublishOK = publisherStub1.publish.firstCall && publisherStub1.publish.firstCall.calledWithExactly(firstDate, firstTransaction.description, firstTransaction.chargedAmount)
    const secondPublishOK = publisherStub1.publish.secondCall && publisherStub1.publish.secondCall.calledWithExactly(laterDate, laterTransaction.description, laterTransaction.chargedAmount)

    assert.equal(firstPublishOK, true)
    assert.equal(secondPublishOK, true)
  }); 
  it('On success scraping, and got transaction after time of scrapping, should save time of last transaction', async () => {
    const scrapperStub1 = stubInterface<IsraeliScrapper>()
    const scrapeTimeSub1 = stubInterface<ScrapeTime>()

    const firstDate = new Date()
    const laterDate = new Date(firstDate)
    laterDate.setSeconds(laterDate.getSeconds() + 20)
    const transaction: Transaction = {
      type: 'normal',
      date: laterDate.toISOString(), // ISO date string
      processedDate: "", // ISO date string
      originalAmount: 20,
      originalCurrency: "",
      chargedAmount: 100,
      description: "first transaction",
      installments: {
          number: 10, // the current installment number
          total: 20, // the total number of installments
      },
      status: 'completed'
    }

    const scrapeResultPromise = new Promise<ScrapeResult>((resolve) => {
      resolve({
        success: true,
        accounts: [{
          accountNumber: "",
          txns: [
            transaction
          ]
        }]
      })
    })     

    scrapperStub1.scrape.returns(scrapeResultPromise)

    const clock = sinon.useFakeTimers({now: firstDate})
    const scrapperInterval = new IntervalScrapper(options, scrapeTimeSub1, scrapperStub1, credentials, publisherStub, logger, initialScrapeTime)
    await scrapperInterval.scrape()
    clock.restore()

    assert(scrapeTimeSub1.saveLastScrapeTime.calledOnceWithExactly(laterDate))
 }); 
  it('If failed to get transaction, do not update last scrape time and log error', async () => {
    const logger1 = stubInterface<Logger>()
    const scrapper1 = stubInterface<IsraeliScrapper>()
    const scrapeTime1 = stubInterface<ScrapeTime>()

    scrapper1.scrape.returns(new Promise<ScrapeResult>((resolve) => {
      resolve({
        success: false,
        errorType: "invalidPassword" 
      })
    }))

    const scrapperInterval = new IntervalScrapper(options, scrapeTime1, scrapper1, credentials, publisherStub, logger1, initialScrapeTime)
    await scrapperInterval.scrape()

    assert(scrapeTime1.saveLastScrapeTime.notCalled)
    assert(logger.log.calledWith(sinon.match.any, 'error'))
 }); 
  it('If failed to get last scrape time, log error and don\'t scrape', async () => {
    const logger1 = stubInterface<Logger>()
    const scrapper1 = stubInterface<IsraeliScrapper>()
    const scrapeTime1 = stubInterface<ScrapeTime>()

    scrapeTime1.getLastScrapeTime.throws('some error')

    const scrapperInterval = new IntervalScrapper(options, scrapeTime1, scrapper1, credentials, publisherStub, logger1, initialScrapeTime)
    await scrapperInterval.scrape()

    assert(scrapper1.scrape.notCalled)
    assert(logger.log.calledWith(sinon.match.any, 'error'))
  }); 
  it('if failed to update last scrape time, log error', async () => {
    const logger1 = stubInterface<Logger>()
    const scrapper1 = stubInterface<IsraeliScrapper>()
    const scrapeTime1 = stubInterface<ScrapeTime>()

    const transaction: Transaction = {
      type: 'normal',
      date: new Date().toISOString(), // ISO date string
      processedDate: "", // ISO date string
      originalAmount: 20,
      originalCurrency: "",
      chargedAmount: 100,
      description: "first transaction",
      installments: {
          number: 10, // the current installment number
          total: 20, // the total number of installments
      },
      status: 'completed'
    }

    const scrapeResultPromise = new Promise<ScrapeResult>((resolve) => {
      resolve({
        success: true,
        accounts: [{
          accountNumber: "",
          txns: [
            transaction
          ]
        }]
      })
    }) 

    scrapeTime1.saveLastScrapeTime.throws('some error')
    scrapper1.scrape.returns(scrapeResultPromise)

    const scrapperInterval = new IntervalScrapper(options, scrapeTime1, scrapper1, credentials, publisherStub, logger1, initialScrapeTime)
    await scrapperInterval.scrape()

    assert(logger.log.calledWith(sinon.match.any, 'error'))
  }); 
  it('if no last scrape time, scrape with provided initial scrape time', async () => {
    const initialScrapeTime = new Date()
    initialScrapeTime.setSeconds(initialScrapeTime.getSeconds() - 20)

    const scrapper1 = stubInterface<IsraeliScrapper>()
    const scrapeTime1 = stubInterface<ScrapeTime>()
    scrapeTime1.getLastScrapeTime.returns(new Promise<Date>((resolve) => resolve(null)))

    const scrapperInterval = new IntervalScrapper(options, scrapeTime1, scrapper1, credentials, publisherStub, logger, initialScrapeTime)
    await scrapperInterval.scrape()

    assert(scrapper1.scrape.calledOnceWithExactly({...options, startDate: initialScrapeTime}, credentials))
  }); 
});
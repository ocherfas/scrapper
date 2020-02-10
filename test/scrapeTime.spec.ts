import ScrapeTime from '../src/scrapeTime'
import { assert } from 'chai';
import fs from 'fs-extra'
import {ImportMock} from 'ts-mock-imports'
import sinon from 'sinon'

describe('scrapeTime tests - getLastScrapeTimeTest',
    () => {
        afterEach(() => {
            sinon.restore()
        })
        it('if file does not exists return null', async () => {
            const stub = ImportMock.mockFunction(fs.promises, 'access', new Promise<any>(() => {
                throw new Error('some error')
            }))

            const scrapeTime = new ScrapeTime("")
            const lastScrapeTime = await scrapeTime.getLastScrapeTime()

            assert.isNull(lastScrapeTime)
        })
        it('use file path to read the file', async () => {
            const path = "test-path"
            const accessStub = ImportMock.mockFunction(fs.promises, 'access')
            const readJsonStub = ImportMock.mockFunction(fs, 'readJSON')

            const scrapeTime = new ScrapeTime(path)
            try{
                await scrapeTime.getLastScrapeTime()
            } catch(error){}

            assert(accessStub.calledWithExactly(path))
            assert(readJsonStub.calledWithExactly(path))
        })
        it('data is not in correct foramt, should throw error', async () => {
            const accessStub = ImportMock.mockFunction(fs.promises, 'access')
            const readJsonStub = ImportMock.mockFunction(fs, 'readJSON', 40)

            const scrapeTime = new ScrapeTime("")

            let thrown
            try{
                await scrapeTime.getLastScrapeTime()
                thrown = false
            } catch(error){
                thrown = true
            }
            
            assert(thrown)
        })
        it('data is a date, should return it', async () => {
            const accessStub = ImportMock.mockFunction(fs.promises, 'access')
            const date = new Date()
            const readJsonStub = ImportMock.mockFunction(fs, 'readJSON', date)

            const scrapeTime = new ScrapeTime("")

            const result = await scrapeTime.getLastScrapeTime()
            
            assert.equal(result, date)
        })
    }
)
import {IScrapeTime} from './interfaces'
import fs from 'fs-extra'

export default class ScrapeTime implements IScrapeTime {

    lastScrapeTimeFile: string
    constructor(lastScrapeTimeFile: string){
        this.lastScrapeTimeFile = lastScrapeTimeFile
    }

    async getLastScrapeTime(){
        try{
            await fs.promises.access(this.lastScrapeTimeFile)
        } catch(error){
            return null
        }

        const data =  await fs.readJSON(this.lastScrapeTimeFile)
        if (data instanceof Date) {
            return data
        } else throw new Error(`Could not get last scrape time from file ${this.lastScrapeTimeFile}`)
    }

    async saveLastScrapeTime(date: Date){
    }
}
 
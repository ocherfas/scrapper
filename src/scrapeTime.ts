import {IScrapeTime} from './interfaces'
import fs from 'fs-extra'
import path from 'path'

export default class ScrapeTime implements IScrapeTime {

    constructor(private storageFolder: string){}

    async dateTransactions(subFolder: string, date: Date){
        try {
            const ids = await fs.readJSON(this.pathForDate(subFolder, date))
            return (ids as number[]) || []
        } catch(error){
            return []
        }
    }

    async addTransactions(subFolder: string, date: Date, ids: number[]){
        const currentIds = await this.dateTransactions(subFolder, date)
        await fs.ensureDir(path.join(this.storageFolder, subFolder))
        return fs.writeJSON(this.pathForDate(subFolder, date), [...currentIds, ...ids])
    }

    pathForDate(subFolder: string, date: Date){
        const dateString = date.toDateString()
        return path.join(this.storageFolder, subFolder, dateString)
    }
}
 
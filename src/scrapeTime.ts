import {IScrapeTime} from './interfaces'
import fs from 'fs-extra'
import path from 'path'

export default class ScrapeTime implements IScrapeTime {

    constructor(private storageFolder: string){}

    async dateTransactions(date: Date){
        try {
            const ids = await fs.readJSON(this.pathForDate(date))
            return (ids as number[]) || []
        } catch(error){
            return []
        }
    }

    async addTransactions(date: Date, ids: number[]){
        const currentIds = await this.dateTransactions(date)
        await fs.ensureDir(this.storageFolder)
        return fs.writeJSON(this.pathForDate(date), [...currentIds, ...ids], {flag: "w"})
    }

    pathForDate(date: Date){
        const dateString = date.toLocaleDateString()
        return path.join(this.storageFolder, dateString)
    }
}
 
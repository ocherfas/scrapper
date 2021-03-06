export interface IScrapeTime {
    dateTransactions(subFolder: string, date: Date): Promise<number[]>
    addTransactions(subFolder: string, date: Date, ids: number[]): Promise<void>
}

export type Credentials = {username: string, password: string}
export type Transaction = {
    type: 'normal' | 'installments',
    identifier?: number, // only if exists
    date: string, // ISO date string
    processedDate: string, // ISO date string
    originalAmount: number,
    originalCurrency: string,
    chargedAmount: number,
    description: string,
    memo?: string,
    installments: {
        number: number, // the current installment number
        total: number, // the total number of installments
    },
    status: 'completed' | 'pending'
}

export type ScrapeResult = {
    success: boolean,
    accounts?: [{
        accountNumber: string,
        txns: Transaction[],
    }],
    errorType?: "invalidPassword"|"changePassword"|"timeout"|"generic", // only on success=false
    errorMessage?: string, // only on success=false
}

export interface IIsraeliScrapper {
    scrape(options: any, credentials: Credentials): Promise<ScrapeResult>
}

export interface IPublisher {
    publisherDescription(): string
    publish(message: string): Promise<void>
}

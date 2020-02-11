import {IPublisher} from './interfaces'
import factory from 'sendmail'
const sendmail = factory({silent: true})

export type EmailPublisherOptions = {
    to: string,
    from?: string,
    subject?: string
}

const defaults = {
    from: "notifier@notifier.com",
    subject: "New Transaction"
}

export default class EmailPublisher implements IPublisher{
    options: EmailPublisherOptions

    constructor(options: EmailPublisherOptions){
        this.options = {...defaults, ...options}
    }

    publish(date: Date, description: string, chargedAmount: number) {
        return new Promise<void>((resolve, reject) => {
            sendmail({
                from: this.options.from,
                to: this.options.to,
                subject: this.options.subject,
                html: `Transaction with amount ${chargedAmount} with description '${description}' was received on ${date}`,
            }, (err, domain) => {
                if (err != null) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }
}

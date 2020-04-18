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

    publisherDescription(){
        return `email publisher to ${this.options.to}`
    }

    publish(message: string) {
        return new Promise<void>((resolve, reject) => {
            sendmail({
                from: this.options.from,
                to: this.options.to,
                subject: this.options.subject,
                html: message,
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

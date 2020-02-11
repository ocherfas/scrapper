import {IPublisher} from './interfaces'
import factory from 'sendmail'
const sendmail = factory({silent: true})

export default class EmailPublisher implements IPublisher{

    publish(date: Date, description: string, chargedAmount: number) {
        return new Promise<void>((resolve, reject) => {
            sendmail({
                from: "notifier@notifier.com",
                to: "ocherfas@gmail.com",
                subject: "New Transaction",
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

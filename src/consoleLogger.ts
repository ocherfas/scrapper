import {ILogger} from './interfaces'
export class ConsoleLogger implements ILogger{
    log(message: string, severity: 'info'| 'debug' | 'error'){
        if (severity == 'error'){
            console.error(message)
        } else if (severity == 'debug'){
            console.debug(message)
        } else {
            console.log(message)
        }
    }
}
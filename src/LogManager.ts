import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';

export class LogManager {
    private logsDirectory = 'logs';
    private loggerInstance: winston.Logger;

    constructor() {
        if (!fs.existsSync(this.logsDirectory)) {
            fs.mkdirSync(this.logsDirectory);
        }

        this.loggerInstance = this.configureLogger();
    }

    private configureLogger(): winston.Logger {
        const logFilePath = this.generateLogFilePath();

        const logger = winston.createLogger({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                // Log errors to a separate file
                new winston.transports.File({
                    filename: logFilePath,
                    level: 'error',
                }),

                // Log general messages to the same file
                new winston.transports.File({
                    filename: logFilePath,
                    level: 'info',
                }),

                // Also log to the console
                new winston.transports.Console(),
            ],
        });

        return logger;
    }

    private generateLogFilePath(): string {
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
        const fileName = `log_${timestamp}.txt`;
        return path.join(this.logsDirectory, fileName);
    }

    public info(message: string) {
        console.log(message);
        this.loggerInstance.info(message);
    }

    public error(message: string) {
        console.log(message);
        this.loggerInstance.error(message);
    }

    public createNewLogger() {
        this.loggerInstance = this.configureLogger();
        return this.loggerInstance;
    }
}
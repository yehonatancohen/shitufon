import { Group } from './Group';
import { ClientController } from './ClientController';
import { Client } from 'whatsapp-web.js';
import { ClientsManager } from './ClientsManager';
import { generate } from 'qrcode-terminal';

class Session {
    protected sessionId: number;
    protected cm: ClientsManager;
    clients: string[];
    messages: string[];
    sessionType: string;
    recipients: string[];

    constructor(sessionType : string) {
        this.sessionId = this.generateId();
    }

    protected generateId()
    {
        if (this.sessionId)
        {
            const err = new Error("Session id already exits");
            this.handleError(err);
            return 0;
        }
        // generate id
        return 1;
    }

    public async startSession(clientIds: string[])
    {
        await this.connectClient(clientIds);
    }

    protected async connectClient(clientIds: string[])
    {

    }

    protected handleError(error: Error)
    {
        switch (error.message)
        {
            case "Session id already exits":
                ;
                break;
        }
    }
}
import { ClientController } from './ClientController';
import { ClientsManager } from './ClientsManager';

export class Session {
    protected sessionId: number;
    protected cm: ClientsManager;
    protected clients: { [clientId: string]: ClientController };
    protected clientIds: string[];
    protected sessionType: string;

    constructor(cm: ClientsManager) {
        this.cm = cm;
        this.sessionType = "General";
        this.sessionId = this.generateId();
        this.clients = {};
        this.clientIds = [];
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
        // start session
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

    protected async connectClients(clientIds: string[])
    {
        return await this.cm.connectClients(clientIds);
    }

    protected async initClients(clientIds: string[])
    {
        let clients = await this.connectClients(clientIds);
        for (let client of clients) {
            this.clients[client.getClientId()] = client;
        }
    }

    protected getClientsLength()
    {
        return Object.keys(this.clients).length;
    }

    protected loadSession()
    {
        // load session
    }

    protected saveSession()
    {
        // save session
    }
}
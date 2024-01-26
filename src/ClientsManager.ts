import { Client, LocalAuth } from 'whatsapp-web.js';
import { ClientController } from './ClientController';

export class ClientsManager {
    public clients: { [clientId: string]: ClientController };;

    constructor() {
        this.clients = {};
    }

    public async getClient(clientId: string) {
        return this.clients[clientId];
    }

    public newClient(clientId: string){
        if (this.clients[clientId] != null){
            throw new Error('Client already exists');
        }
        this.clients[clientId] = new ClientController(clientId, undefined, undefined, this);
    }

    public async addClient(Client: ClientController) {
        this.clients[Client.getClientId()] = Client;
    }

    public async connectClients(clientIds: string[]){
        let clients = [];
        for (let clientId of clientIds){
            let client = await this.connectClient(clientId);
            clients.push(client);
        }
        return clients;
    }

    private async getDisconnectedClients() {
        let disconnectedClients: ClientController[] = [];
        for (let clientId in this.clients){
            if (!(await this.clients[clientId].isPaired()))
                disconnectedClients.push(this.clients[clientId]);
        }
        return disconnectedClients;
    }

    private async connectClient(clientId: string) {
        if (this.clients[clientId] != null){  
            let client = this.clients[clientId];
            //if ((await client.clientObj.getState()) == 'UNPAIRED')
            await this.clients[clientId].connect();
        }
        return this.clients[clientId];
        //this.clients[clientId] = new Client({ authStrategy: new LocalAuth({ clientId: clientId }) });
        //await this.clients[clientId].initialize();
    }

    public async getClientIds(clients: ClientController[]) {
        let clientIds: string[] = [];
        for (let client of clients) {
            clientIds.push(client.getClientId());
        }
        return clientIds;
    }

    private async pair(clientId: string) {
        let client = this.clients[clientId]; 
        await client.connect();
    }

    public async qrReceived(clientId: string, qr: string) {
        let client = this.clients[clientId];
        await client.recievedQrCode(qr);
    }
}
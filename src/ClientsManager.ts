import { Client, LocalAuth } from 'whatsapp-web.js';
import { ClientController } from './ClientController';
import { sleep } from './Util';

export class ClientsManager {
    public clients: { [clientId: string]: ClientController };

    constructor() {
        this.clients = {};
    }

    public getClient(clientId: string) {
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
            console.log("Connecting client " + clientId);
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

    public getClientIds(clients: ClientController[]) {
        let clientIds: string[] = [];
        for (let client of clients) {
            clientIds.push(client.getClientId());
        }
        return clientIds;
    }

    public getAllClients() {
        let clients: string[] = [];
        for (let clientId in this.clients) {
            clients.push(clientId);
        }
        return clients;
    }

    private async pair(clientId: string) {
        let client = this.clients[clientId]; 
        await client.connect();
    }

    public async qrReceived(clientId: string, qr: string) {
        let client = this.clients[clientId];
        await client.recievedQrCode(qr);
    }

    public async clientReady(clientId: string) {
        let client = this.clients[clientId];
    }

    public async message_multiple_clients(clientIds: string[], phone_numbers: string[], message: string, sleepTime: number = 5, every: number = 20, wait: number = 60) {
        const clients = [];
        for (let clientId of clientIds){
            let client = this.getClient(clientId);
            clients.push(client);
        }

        let client_index = 0;
        let current_messages = 0
        for (let phone_number of phone_numbers) {
            const client = clients[client_index];
            await client.sendMessage(phone_number, message);
            client_index = (client_index + 1) % clients.length;
            await sleep(sleepTime);
            current_messages++;
            if (current_messages % every == 0) {
                console.log(`Sent ${current_messages} messages, sleeping for ${wait} seconds`);
                await sleep(wait);
            }
        }
    }

    public client_ids_to_object(clientIds: string[]) {
        const clients = [];
        for (let clientId of clientIds){
            let client = this.getClient(clientId);
            clients.push(client);
        }
        return clients;
    }

    public async add_participants_multiple_clients(clientIds: string[], groupId: string, phone_numbers: string[], sleepTime: number = 20, every: number = 20, wait: number = 300) {
        const clients = [];
        for (let clientId of clientIds){
            let client = this.getClient(clientId);
            clients.push(client);
        }

        const group = await clients[0].getGroupById(groupId);

        let client_index = 0;
        let current_messages = 0
        for (let phone_number of phone_numbers) {
            const client = clients[client_index];
            client_index = (client_index + 1) % clients.length;
            // add to group
            await sleep(sleepTime);
            current_messages++;
            if (current_messages % every == 0) {
                console.log(`Sent ${current_messages} messages, sleeping for ${wait} seconds`);
                await sleep(wait);
            }
        }
    }
}
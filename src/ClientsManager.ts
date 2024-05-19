import WAWebJS, { GroupChat } from 'whatsapp-web.js';
import { ClientController } from './ClientController';
import { MessageData } from './MessageData';
import { formatPhoneNumber, sleep } from './Util';
import { LogManager } from './LogManager';
import { Group } from './Group';
import { Participant } from './Participant';

export class ClientsManager {
    public clients: { [clientId: string]: ClientController };
    static logManager: LogManager;
    public groupsObj: GroupChat[];
    private groups: Group[];

    constructor() {
        this.clients = {};
        this.groupsObj = [];
        this.groups = [];
        ClientsManager.logManager = new LogManager();
        ClientsManager.logManager.info("ClientsManager initialized");
    }

    public getClient(clientId: string) {
        return this.clients[clientId];
    }

    public add_group(group: Group){
        this.groupsObj.push(group.get_group_obj() as GroupChat);
        this.groups.push(group);
    }

    public set_levels(clientsIds: string[], messagingLevel: number[])
    {
        for (let i = 0; i < clientsIds.length; i++)
        {
            this.clients[clientsIds[i]].messagingLevel = messagingLevel[i];
        }
    }

    public async add_group_id(group_id: string){
        let group = await this.get_group_by_id(group_id);
        if (group == null){
            ClientsManager.logManager.error(`Group ${group_id} not found`);
            return;
        }
        this.groupsObj.push(group);
    }

    public async add_group_ids(group_ids: string[]){
        for (let group_id of group_ids){
            await this.add_group_id(group_id);
        }
    }

    public async get_group_by_id(group_id: string){
        for (let clientId in this.clients){
            let client = this.clients[clientId];
            let group = await client.get_group_by_id(group_id);
            if (group != null && typeof group != "string")
                return group;
        }
    }

    public async get_groups_by_name(group_name: string){
        let groups: GroupChat[] = [];
        for (let clientId in this.clients){
            let client = this.clients[clientId];
            let group = await client.get_group_by_name(group_name);
            if (group != null)
                groups.push(group);
        }
        return groups;
    }

    public get_client_numbers(client_ids?: string[]){
        if (client_ids == undefined){
            let numbers = [];
            for (let clientId in this.clients){
                let client = this.clients[clientId];
                numbers.push(client.get_phone_number());
            }
            return numbers;
        }
        let numbers = [];
        for (let i = 0; i < client_ids.length; i++){
            let client = this.clients[client_ids[i]];
            if (client)
                numbers.push(client.get_phone_number());
        }
        return numbers;
    }

    public get_client_ids(){
        let numbers = [];
        for (let clientId in this.clients){
            let client = this.clients[clientId];
            numbers.push(client.getClientId());
        }
        return numbers;
    }

    public get_connected_client_ids() {
        let numbers = [];
        for (let clientId in this.clients){
            let client = this.clients[clientId];
            if (client.connected)
                numbers.push(client.getClientId());
        }
        return numbers;
    }

    private get_client_by_number(phone_number: string){
        for (let clientId in this.clients){
            let client = this.clients[clientId];
            if (client.get_phone_number() == phone_number){
                return client;
            }
        }
        return "Client not found";
    }

    public get_client_by_id(client_id: string){
        for (let clientId in this.clients){
            let client = this.clients[clientId];
            if (client.getClientId() == client_id){
                return client;
            }
        }
        return "Client not found";
    }

    public get_clients_by_number(phone_numbers: string[]){
        let clients = [];
        for (let phone_number of phone_numbers){
            let client = this.get_client_by_number(phone_number);
            clients.push(client);
        }
        return clients;
    }

    public async addClient(client: ClientController) {
        this.clients[client.getClientId()] = client;
        let groups_ids = await client.get_groups_ids();
        this.add_group_ids(groups_ids);
    }

    public async connectClients(clientIds: string[]){
        let clients = [];
        for (let clientId of clientIds){
            console.log("Connecting client " + clientId);
            let client = await this.connectClient(clientId);
            ClientsManager.logManager.info(`Client ${clientId} connected`);
            clients.push(client);
        }
        return clients;
    }

    public async get_group(group_id: string, clients: string[]){
        for (let group of this.groups){
            let g = group.get_group_obj();
            if (g != null && g.id._serialized == group_id){
                return group;
            }
        }
        //await this.create_exiting_group(group_id, clients);
    }

    public get_clients(participant_ids: string[]){
        let clients = [];
        for (let participant_id of participant_ids){
            let client = this.get_client_by_number(participant_id);
            if (client != "Client not found")
                clients.push(client as ClientController);
        }
        return clients;
    }

    private async connectClient(clientId: string) {
        let client = this.clients[clientId] = new ClientController(clientId, undefined, undefined, this);
        if (this.clients[clientId] != null && this.clients[clientId].clientObj.pupBrowser == null){  
            await client.connect();
        }
        return client;
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

    public async qrReceived(clientId: string, qr: string) {
        let client = this.clients[clientId];
        await client.recievedQrCode(qr);
    }


    public async recieve_message(main_client : string, phone_number: string)
    {
        phone_number = formatPhoneNumber(phone_number);
        let client = this.get_client_by_id(main_client);
        if (client == "Client not found") {
            return "Client not found";
        }
        client = client as ClientController;
        
        let sent_message = await client.sendMessage(phone_number, "Please send me a message");
        
        let not_recieved = true;

        let returned_message = "";

        await client.clientObj.on('message', async (message) => {
            let quoted_message = await message.getQuotedMessage();
            
            if (message.from === phone_number && message.hasQuotedMsg && quoted_message.id._serialized == sent_message.id._serialized) {
                not_recieved = false;
                returned_message = message.body;
            }
        });
        while (not_recieved)
        {
            await sleep(1);
        }

        return returned_message;
    }

    public async find_admin_of_group(group_id: string): Promise<string | ClientController[]>{
        let group;
        let admins = [];
        for (let clientId in this.clients){ // Loop through all clients to check if any of them is in the group
            let client = this.clients[clientId];
            group = await client.get_group_by_id(group_id);
            if (group != null && typeof group != "string")
                break;
        }
        if (group == null){
            return "Group not found";
        }
        group = group as GroupChat;
        let client_ids = this.get_client_numbers();
        for (let participant of group.participants){
            if (participant.isAdmin && client_ids.includes(participant.id._serialized)){
                admins.push(this.get_client_by_number(participant.id._serialized) as ClientController);
            }
        }
        if (admins.length > 0){
            return admins;
        }
        return "Admin not found in group " + group_id;
    }

    public client_ids_to_object(clientIds: string[]) {
        const clients = [];
        for (let clientId of clientIds){
            let client = this.getClient(clientId);
            clients.push(client);
        }
        return clients;
    }

    
}
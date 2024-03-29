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

    public add_group(group: GroupChat){
        this.groupsObj.push(group);
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

    private get_client_by_number(phone_number: string){
        for (let clientId in this.clients){
            let client = this.clients[clientId];
            if (client.get_phone_number() == phone_number){
                return client;
            }
        }
        return "Client not found";
    }

    private get_client_by_id(client_id: string){
        for (let clientId in this.clients){
            let client = this.clients[clientId];
            if (client.get_phone_number() == client_id){
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
            //let groups_ids = await client.get_groups_ids();
            //await this.add_group_ids(groups_ids);
            //ClientsManager.logManager.info(`Loaded ${groups_ids.length} groups from client ${clientId}`);
            clients.push(client);
        }
        return clients;
    }

    private async get_group(group_id: string, clients: string[]){
        for (let group of this.groups){
            let g = group.get_group_obj();
            if (g != null && g.id._serialized == group_id){
                return group;
            }
        }
        await this.create_exiting_group(group_id, clients);
    }

    public get_clients(participant_ids: string[]){
        let clients = [];
        for (let participant_id of participant_ids){
            let client = this.getClient(participant_id);
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

    private async create_exiting_group(group_id: string, clients: string[]){
        let groupObj = await this.get_group_by_id(group_id);
        if (groupObj == null){
            ClientsManager.logManager.error(`Group ${group_id} not found`);
            return;
        }
        let owner = this.get_client_by_id(groupObj.owner._serialized);
        if (owner == null || typeof owner == "string"){
            ClientsManager.logManager.error(`Owner of group ${group_id} not found`);
            return;
        }
        let group = new Group(owner);
        let title = groupObj.name;
        let image = "";
        let participants = groupObj.participants;
        let description = groupObj.description;

        await group.initialize(title, [],  clients, description, image, false, groupObj);
        return group;
    }

    public async redirect_message(clientId: string, message: string, phone_number: string) {
        let client = this.clients[clientId];
        await client.sendMessage(phone_number, message);
    }

    public async message_callback(clientId: string, message: WAWebJS.Message, sender_number: string, main_number: string = "", main_client: string = "") {
        let client = this.clients[clientId];
        if (message.type != WAWebJS.MessageTypes.TEXT || message.body == undefined || message.body == null)
            return;
        let main_client_obj = main_client == "" ? clientId : main_client;
        main_number = main_number == "" ? client.get_phone_number() : main_number;
        main_number = formatPhoneNumber(main_number);
        if (sender_number == main_number)
        {
            if (message.hasQuotedMsg) {
                let org_message = await message.getQuotedMessage();
                let sliced_message = org_message.body.split("\n");
                let recepient_number = sliced_message.slice(0)[0];
                let clientId =  sliced_message.slice(1)[0];
                if (clientId == "" || clientId == undefined || clientId == null)
                    return;
                let client = this.getClient(clientId);
                await client.sendMessage(recepient_number, message.body);
            }
        }
        else
        {
            let edited_message =  sender_number + "\n" + clientId + "\n" + message.body;
            this.redirect_message(main_client, edited_message, main_number);
            ClientsManager.logManager.info(`Received message from ${sender_number} to ${client.getClientId()}: ${message.body}`);
        }
    
    }

    public async add_message_listener(clientIds: string[], main_number: string = "", main_client: string = "") {
        for (let clientId of clientIds){
            let client = this.clients[clientId];
            console.log("added listener");
            client.clientObj.on('message', async message =>{
                await this.message_callback(clientId, message, message.from, main_number, main_client);
            });
        }
    }

    public async send_messages(clientIds: string[], phone_numbers: string[], messages: string[], sleepTime: number = 5, every: number = 20, wait: number = 60) {
        let current_messages = 0
        if (clientIds.length == 1) {
            const client = this.getClient(clientIds[0]);
            for (let phone_number of phone_numbers) {
                await client.sendMessage(phone_number, messages[current_messages % messages.length]);
                ClientsManager.logManager.info(`Sent message to ${phone_number} from ${client.getClientId()}`);
                await sleep(sleepTime);
                current_messages++;
                if (current_messages % every == 0) {
                    ClientsManager.logManager.info(`Sent ${current_messages} messages, sleeping for ${wait} seconds`);
                    await sleep(wait);
                }
            }
            return;
        }
        
        const clients = [];
        for (let clientId of clientIds){
            let client = this.getClient(clientId);
            clients.push(client);
        }

        let client_index = 0;
        for (let phone_number of phone_numbers) {
            const client = clients[client_index];
            await client.sendMessage(phone_number, messages[current_messages % messages.length]);
            ClientsManager.logManager.info(`Sent message to ${phone_number} from ${client.getClientId()}`);
            client_index = (client_index + 1) % clients.length;
            await sleep(sleepTime);
            current_messages++;
            if (current_messages % every == 0) {
                ClientsManager.logManager.info(`Sent ${current_messages} messages, sleeping for ${wait} seconds`);
                await sleep(wait);
            }
        }
    }

    public async create_group(owner: string, title: string, participants: string[], admins: string[] = [], description: string = "", image: string = "", adminsOnly: boolean = false)
    {
        let owner_client = this.getClient(owner);
        admins = this.get_client_numbers(admins);
        let created_group = await owner_client.createGroup(title, participants, admins, description, image, adminsOnly);
        if (created_group.get_group_obj() == undefined){
            ClientsManager.logManager.error(`Error creating group ${title}: ${created_group}`);
            return;
        }
        let groupObj = created_group.get_group_obj();
        if (groupObj) {
            this.add_group(groupObj);
        }
        ClientsManager.logManager.info(`Finished creating group ${title} with ${participants.length} participants`);
        return created_group;
    }

    public async auto_respond(messages : string[], response : string)
    {
        let not_recieved = true;
        let returned_message = "";
        let client = this.clients[Object.keys(this.clients)[0]];
        client.clientObj.on('message', async (message) => {
            if (messages.includes(message.body)) {
                not_recieved = false;
                returned_message = response;
                await client.sendMessage(message.from, response);
            }
        });
        while (not_recieved)
        {
            await sleep(1);
        }
        return returned_message;
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

    public async find_admin_of_group(group_id: string): Promise<string | ClientController>{
        let group;
        for (let clientId in this.clients){
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
        let adminClient = group.participants.find((participant) => {
            return participant.isAdmin && client_ids.includes(participant.id._serialized);
        });

        if (adminClient) {
            return this.get_client_by_id(adminClient.id._serialized);
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

    public async add_participants_to_group(clientIds: string[], groupId: string, phone_numbers: string[], sleepTime: number = 20, every: number = 20, wait: number = 300) {
        ClientsManager.logManager.info(`Starting task: Adding ${phone_numbers.length} participants to group ${groupId}`);
        let admin = await this.find_admin_of_group(groupId);
        if (typeof admin == "string"){
            ClientsManager.logManager.error(`Error adding participants to group ${groupId}: ${admin}`);
            return;
        }
        admin = admin as ClientController;
        let group = await this.get_group(groupId, clientIds);
        if (group == null || typeof group == "string"){
            ClientsManager.logManager.error(`Error adding participants to group ${groupId}: ${group}`);
            return;
        }
        let current_added = 0
        if(clientIds.length == 1){
            for (let phone_number of phone_numbers) {
                let result = await admin.add_participant(groupId, phone_number);
                if (!result){
                    ClientsManager.logManager.error(`Error adding ${phone_number} to ${groupId}: ${result}`);
                }
                await sleep(sleepTime);
                current_added++;
                if (current_added % every == 0) {
                    ClientsManager.logManager.info(`Added ${current_added} participants to group ${groupId}, waiting for ${wait} seconds`);
                    await sleep(wait);
                }
            }
            return;
        }

        let client_index = 0;
        for (let phone_number of phone_numbers) {
            const client = this.clients[client_index];
            client_index = (client_index + 1) % clientIds.length;
            let result = await client.add_participant(groupId, phone_number);
            if (!result){
                ClientsManager.logManager.error(`Error adding ${phone_number} to ${groupId}: ${result}`);
            }
            await sleep(sleepTime);
            current_added++;
            if (current_added % every == 0) {
                ClientsManager.logManager.info(`Added ${current_added} participants to group ${groupId}, waiting for ${wait} seconds`);
                await sleep(wait);
            }
        }
    }
}
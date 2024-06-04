import { Session, SessionStatus } from './Session';
import { SessionManager } from './SessionManager';
import { ClientController } from '../ClientController';
import { ClientsManager } from '../ClientsManager';
import { sleep } from '../Util';
import { MessageData } from '../MessageData';

export class MessagesSession extends Session {
    protected toSendMessage: MessageData[];
    protected sentMessages: MessageData[] = [];
    protected phoneNumbers: string[];
    private messageBody: string[];
    private sleepTime: number;
    private every: number;
    private wait: number;

    constructor(cm: ClientsManager, sm: SessionManager, clientIds: string[], phoneNumbers: string[], messageBody: string[], sleepTime: number = 5, every: number = 20, wait: number = 60) {
        super(cm, sm);
        this.sessionType = "Messages";
        this.sessionId = this.generateId();
        this.toSendMessage = [];
        this.sleepTime = sleepTime;
        this.every = every;
        this.wait = wait;
        this.clientIds = clientIds;
        this.messageBody = messageBody;
        this.phoneNumbers = phoneNumbers;
    }

    public getSentMessage() {
        return this.sentMessages;
    }

    public async init() {
        this.initClients(this.clientIds);
        this.initMessages();
    }

    public async startSession() {
        super.startSession();
        await this.send_messages(this.clientIds, this.phoneNumbers, this.messageBody);
    }
    
    private async send_messages(clientIds: string[], phone_numbers: string[], messages: string[]) {
        let current_messages = 0        
        const clients = [];
        for (let clientId of clientIds){
            let client = this.cm.getClient(clientId);
            clients.push(client);
        }

        let client_index = 0;
        for (let phone_number of phone_numbers) {
            const client = clients[client_index];
            if (client.connected == false)
            {
                this.clientIds = this.clientIds.filter((value) => value != client.getClientId());
                ClientsManager.logManager.info(`Client ${client.getClientId()} not connected, skipping`);
                client_index = (client_index + 1) % clients.length;
                const c = clients[client_index];
                this.sessionManager.logUser(`Client ${client.getClientId()} disconnected`);
                delete phone_numbers[]
            }
            while (this.status == SessionStatus.PAUSED) {
                await sleep(1);
            }
            if (this.status == SessionStatus.STOPPED){
                break;
            }
            await client.sendMessage(phone_number, messages[current_messages % messages.length]);
            ClientsManager.logManager.info(`Sent message to ${phone_number} from ${client.getClientId()}`);
            client_index = (client_index + 1) % clients.length;
            this.sentMessages.push(this.toSendMessage[current_messages]);
            this.toSendMessage.splice(current_messages, 1);
            await sleep(this.sleepTime);
            current_messages++;
            if (current_messages % this.every == 0) {
                ClientsManager.logManager.info(`Sent ${current_messages} messages, sleeping for ${this.wait} seconds`);
                await sleep(this.wait);
            }
        }
    }

    private initMessages()
    {
        ClientsManager.logManager.info("Initializing messages");
        let clientIndex = 0;
        let messageIndex = 0;
        for (let phone_number of this.phoneNumbers) {
            let messageData = new MessageData(this.messageBody[messageIndex % this.messageBody.length], this.clients[clientIndex % this.getClientsLength()], phone_number);
            this.toSendMessage.push(messageData);
        }
        ;
    }
}
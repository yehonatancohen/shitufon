import { Session } from './Session';
import { SessionManager } from './SessionManager';
import { ClientsManager } from '../ClientsManager';
import WAWebJS, { GroupChat, MessageMedia } from 'whatsapp-web.js';
import { formatPhoneNumber, idToPhoneNumber} from '../Util';
import { sleep } from '../Util';
import * as fs from 'fs';
import { group } from 'console';

export class WarmingSession extends Session {

    protected mainNumber: string;
    protected groupId: string;
    protected sentences: string[];
    protected locker: boolean = false;

    constructor(cm: ClientsManager, sm: SessionManager, clientIds: string[], mainNumber: string = "") {
        super(cm, sm);
        this.sessionType = "Warming";
        this.clientIds = clientIds;
        this.mainNumber = mainNumber;
        this.groupId = "";
        this.sentences = this.loadSentences();
    }

    private loadSentences()
    {
        let data = fs.readFileSync('sentences.txt', 'utf8');
        let s = data.split("\n").map((sentence) => sentence.trim());
        return s;
    }

    public async init() {
        this.initClients(this.clientIds);
    }

    public async startSession() {
        super.startSession();
        await this.add_message_listener();
    }

    private async message_callback(clientId: string, message: WAWebJS.Message, sender_number: string, main_number: string = "", main_client: string = "") {
        let client = this.cm.getClient(clientId);
        const chatType = await message.getChat() 
        if (message.type != WAWebJS.MessageTypes.TEXT || message.body == undefined || message.body == null)
            return;
        let mainClientObj = this.cm.getClient(main_client);
        main_number = main_number == "" ? client.get_phone_number() : main_number;
        main_number = formatPhoneNumber(main_number);
        if (sender_number == main_number)
        {
            switch (message.body.toLocaleLowerCase())
            {
                case "group":
                    if ((await message.getChat()).isGroup && this.groupId == "")
                    {
                        this.groupId = (await message.getChat()).id._serialized;
                        this.cm.getClient(clientId).sendGroupMessage(this.groupId, "Group set");
                    }
                    break;
                case "up":
                    await mainClientObj.sendMessage(main_number, "Up");
                    break;
            }
        }
        else
        {
            if ((message.from == this.groupId && clientId == this.clientIds[0]) || (this.locker && clientId == this.clientIds[1]))
            {
                if (this.locker)
                {
                    this.locker = false;
                }
                let currentTurn = Math.floor(Math.random() * this.clientIds.length);
                if (currentTurn == 0)
                {
                    this.locker = true;
                }
                let sleep_time = Math.random() * (180 - 35) + 35;
                ClientsManager.logManager.info(`Client ${this.clientIds[currentTurn]} sleeping for ${sleep_time} seconds`);
                await sleep(sleep_time);
                this.cm.getClient(clientId).sendGroupMessage(this.groupId, this.sentences[Math.floor(Math.random() * this.sentences.length)]);
                ClientsManager.logManager.info(`Sent message to ${this.groupId}`);
            }
        }

    }

    private async all_clients_in_group(group_id: string)
    {
        let group = await this.clients[this.clientIds[0]].clientObj.getChatById(group_id) as GroupChat;
        let participants = await group.participants;
        let participants_numbers = [];
        for (let participant of participants)
        {
            participants_numbers.push(idToPhoneNumber(participant.id._serialized));
        }
        return participants_numbers;
    }

    private async add_message_listener() {
        for (let clientId of this.clientIds){
            let client = this.cm.clients[clientId];
            ClientsManager.logManager.info(`Adding message listener for ${client.getClientId()}`);
            client.clientObj.on('message', async message => {
                let author = message.author ? message.author : message.from;
                await this.message_callback(clientId, message, author, this.mainNumber);
            });
        }
    }
}
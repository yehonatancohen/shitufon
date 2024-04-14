import { Session } from './Session';
import { ClientsManager } from './ClientsManager';
import WAWebJS, { MessageMedia } from 'whatsapp-web.js';
import { formatPhoneNumber, idToPhoneNumber} from './Util';
import { sleep } from './Util';
import * as fs from 'fs';

export class WarmingSession extends Session {

    protected mainNumber: string;
    protected groupId: string;
    protected sentences: string[];

    constructor(cm: ClientsManager, clientIds: string[], mainNumber: string = "") {
        super(cm);
        this.sessionType = "Warming";
        this.clientIds = clientIds;
        this.mainNumber = mainNumber;
        this.groupId = "";
        this.sentences = this.loadSentences();
    }

    private loadSentences()
    {
        let data = fs.readFileSync('sentences.txt', 'utf8');
        let s = data.split("\n");
        return s;
    }

    public async init() {
        await this.initClients(this.clientIds);
    }

    public async startSession() {
        await this.add_message_listener();
    }

    private async message_callback(clientId: string, message: WAWebJS.Message, sender_number: string, main_number: string = "", main_client: string = "") {
        let client = this.clients[clientId];
        const chatType = await message.getChat()
        if (message.type != WAWebJS.MessageTypes.TEXT || message.body == undefined || message.body == null || chatType.isGroup == true)
            return;
        let mainClientObj = this.clients[main_client];
        main_number = main_number == "" ? client.get_phone_number() : main_number;
        main_number = formatPhoneNumber(main_number);
        if (sender_number == main_number)
        {
            switch (message.body.toLocaleLowerCase())
            {
                case "group":
                    if ((await message.getChat()).isGroup && this.groupId == "")
                        this.groupId = (await message.getChat()).id._serialized;
                    break;
                case "up":
                    await mainClientObj.sendMessage(main_number, "Up");
                    break;
            }
        }
        else
        {
            let client_turn = Math.floor(Math.random() * this.clientIds.length);
            if (message.from == this.groupId)
            {
                await sleep(Math.random() * (180 - 35) + 35);
                this.clients[this.clientIds[client_turn]].sendGroupMessage(this.groupId, this.sentences[Math.floor(Math.random() * this.sentences.length)]);
            }
            ClientsManager.logManager.info(`Sent message to ${this.groupId}`);
        }

    }

    private async add_message_listener() {
        let client = this.cm.clients[this.clientIds[0]];
        ClientsManager.logManager.info(`Adding message listener for ${client.getClientId()}`);
        client.clientObj.on('message', async message =>{
            await this.message_callback(this.clientIds[0], message, message.from, this.mainNumber);
        });
    }
}
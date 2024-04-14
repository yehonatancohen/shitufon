import { Session } from './Session';
import { ClientsManager } from './ClientsManager';
import WAWebJS, { MessageMedia } from 'whatsapp-web.js';
import { formatPhoneNumber, idToPhoneNumber} from './Util';
import { add } from 'winston';
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';


export class ListeningSession extends Session {

    protected mainNumber: string;
    protected mainClient: string;

    constructor(cm: ClientsManager, clientIds: string[], mainNumber: string = "", mainClient: string = "") {
        super(cm);
        this.sessionType = "Listening";
        this.clientIds = clientIds;
        this.mainNumber = mainNumber;
        this.mainClient = mainClient;
    }

    public async init() {
        await this.initClients(this.clientIds);
    }

    public async startSession() {
        await this.add_message_listener();
    }

    private async redirect_message(clientId: string, message: string, phone_number: string) {
        let client = this.clients[clientId];
        await client.sendMessage(phone_number, message);
    }

    private async message_callback(clientId: string, message: WAWebJS.Message, sender_number: string, main_number: string = "", main_client: string = "") {
        let client = this.clients[clientId];
        const chatType = await message.getChat()
        if (message.type != WAWebJS.MessageTypes.TEXT || message.body == undefined || message.body == null || chatType.isGroup == true)
            return;
        let main_client_obj = main_client == "" ? clientId : main_client;
        let mainClientObj = this.clients[main_client];
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
                let client = this.cm.getClient(clientId);
                switch (message.body.toLocaleLowerCase())
                {
                    case "pfp":
                        const url = await client.clientObj.getProfilePicUrl(formatPhoneNumber(recepient_number));
                        let pfp;
                        if (url == undefined || url == null){
                            await mainClientObj.sendMessage(main_number, "No profile picture found");
                            break;
                        }
                        else
                            pfp = await MessageMedia.fromUrl(url);
                        await mainClientObj.sendMedia(main_number, pfp);
                        break;
                    case "הסר":
                        const file = writeFileSync(path.join(path.join(__dirname, '..', 'logs'), "whitelist.txt"), recepient_number + "\n", {flag: 'a'});
                        await mainClientObj.sendMessage(main_number, `Added ${recepient_number} to whitelist`);
                        break;
                    default:
                        await client.sendMessage(recepient_number, message.body);
                }
            }
            else
            {
                switch (message.body.toLocaleLowerCase())
                {
                    case "up":
                        await mainClientObj.sendMessage(main_number, "Up");
                        break;
                }
            }
        }
        else
        {
            let edited_message =  idToPhoneNumber(sender_number) + "\n" + clientId + "\n" + message.body;
            this.redirect_message(main_client, edited_message, main_number);
            ClientsManager.logManager.info(`Received message from ${sender_number} to ${client.getClientId()}: ${message.body}`);
        }

    }

    private async add_message_listener() {
        for (let clientId of this.clientIds){
            let client = this.cm.clients[clientId];
            ClientsManager.logManager.info(`Adding message listener for ${client.getClientId()}`);
            client.clientObj.on('message', async message =>{
                await this.message_callback(clientId, message, message.from, this.mainNumber, this.mainClient);
            });
        }
    }
}
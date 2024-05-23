import { Session, SessionStatus } from './Session';
import { SessionManager } from './SessionManager';
import { ClientsManager } from '../ClientsManager';
import { ClientController } from '../ClientController';
import WAWebJS, { Message, MessageMedia } from 'whatsapp-web.js';
import { formatPhoneNumber, idToPhoneNumber} from '../Util';
import { sleep } from '../Util';
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';


export class ListeningSession extends Session {

    protected mainNumber: string;
    protected mainClient: string;
    protected mainClientObj: ClientController;
    protected autoResponses: {[message: string]: string };
    protected auto = false;

    constructor(cm: ClientsManager, sm: SessionManager, clientIds: string[], mainNumber: string = "", mainClient: string = "") {
        super(cm, sm);
        this.sessionType = "Listening";
        this.clientIds = clientIds;
        this.mainNumber = mainNumber;
        this.mainClient = mainClient;
        this.mainClientObj = this.clients[mainClient];
        this.autoResponses = {};
    }

    public async init() {
        await this.initClients(this.clientIds);
    }

    public async startSession() {
        super.startSession();
        await this.add_message_listener();
    }

    private async redirect_message(clientId: string, message: string | Message, phone_number: string) {
        let client = this.clients[clientId];
        if (typeof message == "string")
            await client.sendMessage(phone_number, message);
        else
            await message.forward(phone_number);
    }

    private async admin_command(mainClientObj: ClientController, clientId: string, message: WAWebJS.Message, main_number: string, sender_number: string) {
        let client = this.clients[clientId];
        if (message.hasQuotedMsg) {
            // Messsage is a reply
            let _org_message = await message.getQuotedMessage();
            let sliced_message = _org_message.body.split("\n");
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
                    const file = writeFileSync(path.join(path.join(__dirname, '../../', 'logs'), "whitelist.txt"), recepient_number + "\n", {flag: 'a'});
                    await mainClientObj.sendMessage(main_number, `Added ${recepient_number} to whitelist`);
                    break;
                default:
                    if (message.type == WAWebJS.MessageTypes.IMAGE || message.type == WAWebJS.MessageTypes.VIDEO || message.type == WAWebJS.MessageTypes.AUDIO || message.type == WAWebJS.MessageTypes.DOCUMENT || message.type == WAWebJS.MessageTypes.STICKER) {
                        let media = await message.downloadMedia();
                        await client.sendMedia(recepient_number, media);
                    } else {
                        await client.sendMessage(recepient_number, message.body);
                    }
            }
        }
        else
        {
            // Message is not a reply
            let sender = await message.author;
            const splitted = message.body.toLocaleLowerCase().split(" "); 
            let sessionId = undefined;
            if (splitted.length > 1 && this.sessionManager.getSessionById(splitted[1]) != undefined)
                sessionId = splitted[1];
            switch (splitted[0])
            {
                case "pause":
                    if (sessionId != undefined)
                        this.sessionManager.pauseSession(sessionId);
                    else
                        ClientsManager.logManager.error("No session id provided");
                    break;
                case "resume":
                    if (sessionId != undefined)
                        this.sessionManager.resumeSession(sessionId);
                    else
                        ClientsManager.logManager.error("No session id provided");
                    break;
                case "stop":
                    if (sessionId != undefined)
                        this.sessionManager.stopSession(sessionId);
                    else
                        ClientsManager.logManager.error("No session id provided");
                    break;
                case "up":
                    await mainClientObj.sendMessage(main_number, "Up");
                    break;
                default:
                    if (message.body.toLocaleLowerCase() in this.autoResponses)
                        await client.sendMessage(sender_number, this.autoResponses[message.body.toLocaleLowerCase()])
            }
        }
    }

    private async message_callback(clientId: string, message: WAWebJS.Message, sender_number: string, main_number: string = "", main_client: string = "") {
        let client = this.clients[clientId];
        const chatType = await message.getChat()
        let main_client_obj = main_client == "" ? clientId : main_client;
        let mainClientObj = this.clients[main_client];
        if (mainClientObj.connected == false) {
            this.mainClient = this.cm.get_connected_client_ids()[0];
            mainClientObj = this.clients[main_client];
        }
        main_number = main_number == "" ? client.get_phone_number() : main_number;
        main_number = formatPhoneNumber(main_number);
        if (sender_number == main_number)
        {
            this.admin_command(mainClientObj, clientId, message, main_number, sender_number);
        }
        else
        {
            if (message.type == WAWebJS.MessageTypes.IMAGE || message.type == WAWebJS.MessageTypes.VIDEO || message.type == WAWebJS.MessageTypes.AUDIO || message.type == WAWebJS.MessageTypes.DOCUMENT || message.type == WAWebJS.MessageTypes.STICKER) {
                let media = await message.downloadMedia();
                let media_type = message.type == WAWebJS.MessageTypes.IMAGE ? "image" : message.type == WAWebJS.MessageTypes.VIDEO ? "video" : message.type == WAWebJS.MessageTypes.AUDIO ? "audio" : message.type == WAWebJS.MessageTypes.DOCUMENT ? "document" : message.type == WAWebJS.MessageTypes.STICKER ? "sticker" : "unknown";
                let edited_message = idToPhoneNumber(sender_number) + "\n" + clientId + "\n" + `Received ${media_type}`;
                this.redirect_message(main_client, edited_message, main_number);
                await mainClientObj.sendMedia(main_number, media);
                ClientsManager.logManager.info(`Received ${media_type} from ${sender_number} to ${client.getClientId()}`);
            } else {
                let edited_message =  idToPhoneNumber(sender_number) + "\n" + clientId + "\n" + message.body;
                this.redirect_message(main_client, edited_message, main_number);
                ClientsManager.logManager.info(`Received message from ${sender_number} to ${client.getClientId()}: ${message.body}`);
            }
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
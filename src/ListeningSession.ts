import { Session } from './Session';
import { ClientsManager } from './ClientsManager';
import WAWebJS, { MessageMedia } from 'whatsapp-web.js';
import { formatPhoneNumber, idToPhoneNumber} from './Util';
import { sleep } from './Util';

export class ListeningSession extends Session {

    protected mainNumber: string;
    protected mainClient: string;
    protected autoResponses: {[message: string]: string };

    constructor(cm: ClientsManager, clientIds: string[], mainNumber: string = "", mainClient: string = "") {
        super(cm);
        this.sessionType = "Listening";
        this.clientIds = clientIds;
        this.mainNumber = mainNumber;
        this.mainClient = mainClient;
        this.autoResponses = {};
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
                let recepient_number = formatPhoneNumber(sliced_message.slice(0)[0]);
                let clientId =  sliced_message.slice(1)[0];
                if (clientId == "" || clientId == undefined || clientId == null)
                    return;
                let client = this.cm.getClient(clientId);
                switch (message.body.toLocaleLowerCase())
                {
                    case "pfp":
                        const url = await client.clientObj.getProfilePicUrl(recepient_number);
                        let pfp;
                        if (url == undefined || url == null){
                            await mainClientObj.sendMessage(main_number, "No profile picture found");
                            break;
                        }
                        else
                            pfp = await MessageMedia.fromUrl(url);
                        await mainClientObj.sendMedia(main_number, pfp);
                        break;
                    default:
                        await client.sendMessage(recepient_number, message.body);
                }
            }
            else
            {
                let sender = await message.author;
                switch (message.body.toLocaleLowerCase())
                {
                    case "up":
                        await mainClientObj.sendMessage(main_number, "Up");
                        break;
                    default:
                        if (message.body.toLocaleLowerCase() in this.autoResponses)
                            await client.sendMessage(sender_number, this.autoResponses[message.body.toLocaleLowerCase()])
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
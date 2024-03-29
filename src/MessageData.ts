import { Message, GroupParticipant } from 'whatsapp-web.js';
import { ClientsManager } from './ClientsManager';
import { ClientController } from './ClientController';

export class MessageData {
    private messageObj: Message | String;
    private senderObj: ClientController | GroupParticipant;
    private recipientObj: string | GroupParticipant;

    constructor(messageObj: Message | String, senderObj: ClientController | GroupParticipant, recipientObj: string | GroupParticipant) {
        this.messageObj = messageObj;
        if (typeof messageObj === 'string')
            this.messageObj = messageObj;
        else if ('body' in messageObj)
            this.messageObj = messageObj.body;
        else
            this.messageObj = "";
        this.senderObj = senderObj;
        this.recipientObj = recipientObj;
    }

    public getSender() {
        return this.senderObj;
    }

    public getMessageObj() {
        return this.messageObj;
    }

    public getRecipient() {
        return this.recipientObj;
    }

    public async sendMessage() {
        if (this.senderObj instanceof ClientController && typeof this.messageObj === 'string' && typeof this.messageObj === 'string')
        {
            this.messageObj = await this.senderObj.sendMessage(this.recipientObj as string , this.messageObj);
        }
        else
        {
            ClientsManager.logManager.error("Error sending message: Invalid sender or recipient object");
            return 0;
        }
        return 1;
    }
}
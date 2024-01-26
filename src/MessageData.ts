import { Client, GroupChat, Message, GroupParticipant, MessageMedia } from 'whatsapp-web.js';
import { Participant } from './Participant';

class MessageData {
    private messageObj: Message;
    private message: string;
    private senderObj: Participant;

    constructor(messageObj: Message, senderObj: Participant) {
        this.messageObj = messageObj;
        this.message = messageObj.body;
        this.senderObj = senderObj;
    }

    public getMessage() {
        return this.message;
    }

    public getSender() {
        return this.senderObj;
    }

    public getMessageObj() {
        return this.messageObj;
    }
}
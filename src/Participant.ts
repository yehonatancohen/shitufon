import { Client, GroupChat, Message, GroupParticipant } from 'whatsapp-web.js';
import { Group } from './Group';

export class Participant {
    private id = "";
    private isAdmin = false;
    private groups: Group[] = [];
    private participantObj: GroupParticipant | string = "";
    private sentMessages: Message[] = [];

    constructor(id : string) {
        this.id = id;
    }

    public async initialize(participantObj: GroupParticipant) {
        this.participantObj = participantObj;
        this.isAdmin = participantObj.isAdmin;
    }

    public addGroup(group: Group) {
        if (!this.groups.includes(group)) {
            this.groups.push(group);
        }
    }

    public getId() {
        return this.id;
    }

}

import { Client, GroupChat, Message, GroupParticipant } from 'whatsapp-web.js';
import { ClientController } from './ClientController';
import { Participant } from './Participant';

export class Group {
    private groupObj: GroupChat | string;
    private groupId: string;
    private clients: Client[];
    private messages: Message[];
    private totalParticipants: Participant[];
    private owner: ClientController;
    private createdAt: Date | undefined;
    private currentParticipants: Participant[];

    constructor(owner: ClientController) {
        this.groupId = "";
        this.clients = [];
        this.messages = [];
        this.totalParticipants = [];
        this.currentParticipants = [];
        this.groupObj = "";
        this.owner = owner;
        this.createdAt = undefined;
    }

    private async updateCurrentParticipants() {
        if (this.groupObj) {
            let groupObj = this.groupObj as GroupChat;
            let groupParticipants = await groupObj.participants;
            let participantIds = groupParticipants.map(participant => participant.id._serialized);
            this.currentParticipants = this.initParticipants(participantIds);
        }
    }

    private addParticipantList(totalParticipants: Participant[]) {
        let added = false;
        for (const participant of totalParticipants) {
            if (!this.totalParticipants.includes(participant)) {
                added = true;
                this.totalParticipants.push(participant);
            }
        }
        return added;
    }

    private getParticipantById(participantId: string) {
        for (const participant of this.totalParticipants) {
            if (participant.getId() == participantId) {
                return participant;
            }
        }
        return false;
    }

    private initParticipants(participantIds: string[]) {
        let res = [];
        for (const participant of participantIds) {
            res.push(this.createParticipant(participant));
        }
        return res;
    }

    private createParticipant(participantId: string) {
        let participantObj = this.getParticipantById(participantId);
        if (participantObj) {
            return participantObj;
        }
        participantObj = new Participant(participantId);
        participantObj.addGroup(this);
        this.totalParticipants.push(participantObj);
        return participantObj;
    }

    public async initialize(title: string, totalParticipants: string[], admins: ClientController[], description: string, image: string, adminsOnly: boolean) {
        let result = await this.owner.clientObj.createGroup(title, totalParticipants);
        this.initParticipants(totalParticipants);
        if (typeof result == "string"){
            return result; // ERROR
        }
        this.groupId = result.gid._serialized;
        this.groupObj = await this.owner.getGroupById(this.groupId);
        //this.addParticipantList(result.totalParticipants);
        //this.totalParticipants = formattotalParticipants(totalParticipants);
        this.createdAt = new Date();
        //this.clients = admins;
        this.messages = [];
    
    }

    public async getParticipants() {
        let res;
        if (this.groupObj) {
            res = this.totalParticipants;
        }
        return res;
    }
}
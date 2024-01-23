import { Client, GroupChat, Message, GroupParticipant, MessageMedia } from 'whatsapp-web.js';
import { ClientController } from './ClientController';
import { ClientsManager } from './ClientsManager';
import { Participant } from './Participant';
import { sleep } from './Util';

export class Group {
    private groupObj: GroupChat | string;
    private groupId: string;
    private clients: ClientController[];
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
            this.currentParticipants = await this.initParticipants(participantIds);
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

    private async addParticipants(participant: Participant) {
        if (this.totalParticipants.includes(participant)) {
            return;
        }
        if (typeof this.groupObj == "string") {
            return;
        }
        await this.groupObj.addParticipants([participant.getId()], {autoSendInviteV4: false});
        await this.updateCurrentParticipants();
    }

    private getParticipantById(participantId: string) {
        for (const participant of this.totalParticipants) {
            if (participant.getId() == participantId) {
                return participant;
            }
        }
        return false;
    }

    private async initParticipants(participantIds: string[]) {
        let res = [];
        for (const participant of participantIds) {
            res.push(await this.createParticipant(participant));
        }
        return res;
    }

    private async createParticipant(participantId: string) {
        let participantObj = this.getParticipantById(participantId);
        if (participantObj) {
            return participantObj;
        }
        participantObj = new Participant(participantId);
        participantObj.addGroup(this);
        await this.updateCurrentParticipants();
        return participantObj;
    }

    public async setImage(image: string) {
        if (typeof this.groupObj == "string") {
            return false;
        }
        let created_image = await MessageMedia.fromUrl(image) as MessageMedia;
        let result = await this.groupObj.setPicture(created_image);
        if (result == null) {
            return false;
        }
        return true;
    }

    public async setDescription(description: string) {
        if (typeof this.groupObj == "string") {
            return false;
        }
        let result = await this.groupObj.setDescription(description);
        if (result == null) {
            return false;
        }
        return true;
    }

    private getClientIds(clients: ClientController[]) {
        let clientIds: string[] = [];
        for (let client of clients) {
            clientIds.push(client.getClientId());
        }
        return clientIds;
    }

    private addAdmins(admins: ClientController[]) {
        if(typeof this.groupObj == "string") {
            return;
        }
        this.groupObj.addParticipants(this.getClientIds(admins), {autoSendInviteV4: false});
        for (const admin of admins) {
            if (!this.clients.includes(admin)) {
                this.clients.push(admin);
            }
        }
    }

    public async initialize(title: string, totalParticipants: string[], admins: ClientController[], description: string, image: string, adminsOnly: boolean) {
        let result = await this.owner.clientObj.createGroup(title, totalParticipants);
        await this.initParticipants(totalParticipants);
        if (typeof result == "string"){
            return result; // ERROR
        }
        await this.updateCurrentParticipants();
        this.groupId = result.gid._serialized;
        this.groupObj = await this.owner.getGroupById(this.groupId);
        if (image != "") {
            await this.setImage(image);
        }
        if (description != "") {
            await this.setDescription(description);
        }
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
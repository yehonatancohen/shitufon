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

    public async wasParticipantInGroup(participantId: string) {
        // Checking if the participant was in the group before
        await this.updateCurrentParticipants();
        if (this.groupObj) {
            let groupObj = this.groupObj as GroupChat;
            let groupParticipants = await groupObj.participants;
            let participantIds = groupParticipants.map(participant => participant.id._serialized);
            return participantIds.includes(participantId);
        }
        return false;
    }
    
    public async getParticipants() {
        let res;
        if (this.groupObj) {
            res = this.totalParticipants;
        }
        return res;
    }

    public getClients() {
        return this.clients;
    }

    public async promoteParticipant(participantId: string) {
        if (typeof this.groupObj == "string") {
            return;
        }
        let groupObj = this.groupObj as GroupChat;
        await groupObj.promoteParticipants([participantId]);
    }

    private async updateCurrentParticipants() {
        // Update the current participants list and total participants according to the group
        if (this.groupObj) {
            let groupObj = this.groupObj as GroupChat;
            let groupParticipants = await groupObj.participants;
            let participantIds = groupParticipants.map(participant => participant.id._serialized);
            this.currentParticipants = await this.initParticipants(participantIds);
            this.addParticipantList(this.currentParticipants);
        }
    }

    private addParticipantList(totalParticipants: Participant[]) {
        // Add the new participants to the total participants list
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

    private getParticipantByClient(client: ClientController) {
        for (const participant of this.totalParticipants) {
            if (participant.getId() == client.getClientId()) {
                return participant;
            }
        }
        return "Participant not found";
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
        // Create a participant object for each new participant id
        let res = [];
        for (const participant of participantIds) {
            res.push(await this.createParticipant(participant));
        }
        return res;
    }

    private async createParticipant(participantId: string) {
        // Create a participant object for each new participant id
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

    private async addAdmins(admins: ClientController[]) {
        // Adds clients to the group as admins
        if(typeof this.groupObj == "string") {
            return;
        }
        await this.groupObj.addParticipants(this.getClientIds(admins), {autoSendInviteV4: false});
        for (const admin of admins) {
            if (!this.clients.includes(admin)) {
                let participant = await this.createParticipant(admin.getClientId());
                if (typeof participant == "string") {
                    return;
                }
                await this.promoteParticipant(participant.getId());
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
        await this.addAdmins(admins);
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
}
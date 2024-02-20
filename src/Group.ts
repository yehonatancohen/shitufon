import { Client, GroupChat, Message, GroupParticipant, MessageMedia } from 'whatsapp-web.js';
import { ClientController } from './ClientController';
import { ClientsManager } from './ClientsManager';
import { Participant } from './Participant';
import { sleep, formatPhoneNumber } from './Util';

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

    public get_group_obj() {
        if (this.groupObj == "") {
            return;
        }
        return this.groupObj as GroupChat;
    }

    public getGroupId() {
        return this.groupId;
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
        this.owner.Manager.logManager.info(`Changed image in group ${this.groupId}`);
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
        this.owner.Manager.logManager.info(`Changed description in group ${this.groupId}`);
        return true;
    }

    private getClientIds(clients: ClientController[]) {
        let clientIds: string[] = [];
        for (let client of clients) {
            clientIds.push(client.getClientId());
        }
        return clientIds;
    }

    private get_client_by_id(clientId: string) {
        for (let client of this.clients) {
            if (client.getClientId() == clientId) {
                return client;
            }
        }
        return "Client not found";
    }

    private async addAdmins(admins: string[]) {
        // Adds clients to the group as admins
        if(typeof this.groupObj == "string") {
            return;
        }
        if (admins.length == 0) {
            return;
        }
        await this.groupObj.addParticipants(admins, {autoSendInviteV4: false});
        let clients = await this.owner.Manager.get_clients(admins);
        await this.add_participants(admins);

        for (let admin of admins) {
            await this.promoteParticipant(admin);
        }
        this.owner.Manager.logManager.info(`Promoted admins in group ${this.groupId}`);
        for (let client of clients) {
            this.clients.push(client);
        }
    }

    public async initialize(title: string, totalParticipants: string[], admins: string[], description: string, image: string, adminsOnly: boolean, group?: GroupChat) {
        if(group){
            this.groupObj = group;
            this.groupId = group.id._serialized;
            if (admins){
                await this.addAdmins(admins);
            }
            await this.updateCurrentParticipants();
            return;
        }
        let result = await this.owner.clientObj.createGroup(title, admins);
        this.owner.Manager.logManager.info(`Created group ${title}`);
        await this.add_participants(totalParticipants);
        await this.initParticipants(totalParticipants);
        if (typeof result == "string"){
            this.owner.Manager.logManager.error(`Error creating group ${title}: ${result}`);
            return result; // ERROR
        }
        await this.updateCurrentParticipants();
        this.groupId = result.gid._serialized;
        let tries = 0;
        do {
            await sleep(1);
            this.groupObj = await this.owner.get_group_by_id(this.groupId);
            tries++;
        } while (this.groupObj == "Group not found" && tries < 10);
        if (this.groupObj == "Group not found") {
            return "Group not found";
        }
        await this.addAdmins(admins);
        if (image != "") {
            await this.setImage(image);
        }
        if (description != "") {
            await this.setDescription(description);
        }
        this.createdAt = new Date();
        this.messages = [];
    
    }

    public async add_participants(phone_numbers: string[], sleepTime: number = 20, every: number = 20, wait: number = 300) {
        // Adds participants to the group
        let client_index = 0;
        let current_participants = 0
        for (const phone_number of phone_numbers) {
            let participant_id = formatPhoneNumber(phone_number);
            let participant = await this.createParticipant(participant_id);
            if (this.totalParticipants.includes(participant)) {
                // Participant is already in the group
                continue;
            }
            if (typeof participant == "string") {
                // Participant not found
                continue;
            }
            const client = this.clients[client_index];
            client_index = (client_index + 1) % this.clients.length;
            await client.add_participant(this.groupId ,phone_number);
            await this.updateCurrentParticipants();
            current_participants++;
            if (current_participants % every == 0) {
                console.log(`Added ${current_participants} participants, sleeping for ${wait} seconds`);
                await sleep(wait);
            } else {
                await sleep(sleepTime);
            }

        }
    }
}
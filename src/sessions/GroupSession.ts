import { Session, SessionStatus } from "./Session";
import { ClientsManager } from "../ClientsManager";
import { Group } from "../Group";
import { Participant } from "../Participant";
import { ClientController } from "../ClientController";
import { sleep } from '../Util';
import { Status } from "whatsapp-web.js";

export class GroupSession extends Session
{
    protected groupCreated: Group | undefined;
    protected groupId: string | undefined;
    protected participantsAdded: Participant[];
    protected participantsToAdd: string[];
    protected ownerClient: ClientController | string;
    protected adminClients: ClientController[];

    constructor(cm: ClientsManager, clientIds: string[], owner_id: string, group_id: string | undefined, participants: string[])
    {
        super(cm);
        this.ownerClient = owner_id; 
        this.clientIds = clientIds;
        this.participantsAdded = [];
        this.adminClients = [];
        this.participantsToAdd = participants;
        if (group_id != undefined){
            this.groupId = group_id;
        }
    }

    public async init() {
        await this.initClients(this.clientIds);

        if (this.groupId != undefined) {
            let res = await this.cm.find_admin_of_group(this.groupId as string);
            if (typeof res == "string"){
                ClientsManager.logManager.error(`Error finding admin of group ${this.groupId}: ${res}`);
                return;
            }
            this.adminClients = res as ClientController[];
            ClientsManager.logManager.info(`Found ${this.adminClients.length} admins of group ${this.groupId}`);
            this.groupCreated = await this.create_exiting_group(this.groupId, this.clientIds);
        } else {
            this.groupCreated = await this.create_group(this.ownerClient as string, "Group", this.clientIds);
        }
    }

    public async startSession() {
        super.startSession();
        ClientsManager.logManager.info(`Starting session ${this.sessionId}`);
        if (this.groupCreated != undefined){
            this.groupCreated = this.groupCreated as Group;
        } else {
            return;
        }
        await this.add_participants_to_group(this.clientIds, this.groupId as string, this.participantsToAdd);
    }

    private async create_exiting_group(group_id: string, clients: string[]){
        let groupObj = await this.cm.get_group_by_id(group_id);
        if (groupObj == null){
            ClientsManager.logManager.error(`Group ${group_id} not found`);
            return;
        }
        let owner = groupObj.owner;
        if (owner == null || typeof owner == "string"){
            ClientsManager.logManager.error(`Owner of group ${group_id} not found`);
            return;
        }
        let group = new Group(this.adminClients[0]);
        let title = groupObj.name;
        let image = "";
        let participants = groupObj.participants;
        let description = groupObj.description;

        await group.initialize(title, [],  this.cm.get_client_numbers(), description, image, false, groupObj);
        if (group) {
            this.cm.add_group(group);
        }
        ClientsManager.logManager.info(`Finished getting group ${title} with ${participants.length} participants`);
        return group;
    }

    public async create_group(owner: string, title: string, participants: string[], admins: string[] = [], description: string = "", image: string = "", adminsOnly: boolean = false)
    {
        let owner_client = this.cm.getClient(owner);
        admins = this.cm.get_client_numbers(admins);
        let created_group = await owner_client.createGroup(title, participants, admins, description, image, adminsOnly);
        if (created_group.get_group_obj() == undefined){
            ClientsManager.logManager.error(`Error creating group ${title}: ${created_group}`);
            return;
        }
        if (created_group) {
            this.cm.add_group(created_group);
        }
        ClientsManager.logManager.info(`Finished creating group ${title} with ${participants.length} participants`);
        return created_group;
    }

    public async add_participants_to_group(clientIds: string[], groupId: string, phone_numbers: string[], sleepTime: number = 20, every: number = 20, wait: number = 300) {
        ClientsManager.logManager.info(`Starting task: Adding ${phone_numbers.length} participants to group ${groupId}`);
        let admins = await this.cm.find_admin_of_group(groupId);
        if (typeof admins == "string"){
            ClientsManager.logManager.error(`Error adding participants to group ${groupId}: ${admins}`);
            return;
        }
        let admin = admins[0] as ClientController;
        admin = admin as ClientController;
        let group = await this.cm.get_group(groupId, clientIds);
        if (group == null || typeof group == "string"){
            ClientsManager.logManager.error(`Error adding participants to group ${groupId}: ${group}`);
            return;
        }
        let current_added = 0;
        let client_index = 0;

        for (let phone_number of phone_numbers) {
            switch (this.status) {
                case SessionStatus.PAUSED:
                    ClientsManager.logManager.info(`Pausing session ${this.sessionId}`);
                    await sleep(5);
                    continue;
                case SessionStatus.STOPPED:
                    ClientsManager.logManager.info(`Terminating session ${this.sessionId}`);
                    break;
                case SessionStatus.RESUMED:
                    ClientsManager.logManager.info(`Resuming session ${this.sessionId}`);
                    break;
            }
            if (this.status == SessionStatus.STOPPED){
                break;
            }
            const client = this.clients[client_index];
            client_index = (client_index + 1) % clientIds.length;
            let result = await client.add_participant(groupId, phone_number);
            if (!result){
                ClientsManager.logManager.error(`Error adding ${phone_number} to ${groupId}: ${result}`);
            }
            await sleep(sleepTime);
            current_added++;
            if (current_added % every == 0) {
                ClientsManager.logManager.info(`Added ${current_added} participants to group ${groupId}, waiting for ${wait} seconds`);
                await sleep(wait);
            }
        }
    }


}
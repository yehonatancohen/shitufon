import { Session } from "./Session";
import { ClientsManager } from "./ClientsManager";
import { Group } from "./Group";
import { Participant } from "./Participant";
import { ClientController } from "./ClientController";
import { type } from "os";

export class GroupSession extends Session
{
    protected groupCreated: Group;
    protected participantsAdded: Participant[];
    protected participantsToAdd: Participant[];
    protected ownerClient: ClientController;

    constructor(cm: ClientsManager, owner_id: string, )
    {
        super(cm);
        if (typeof cm.get_client_by_id(owner_id) != "string")
        {
            this.ownerClient = cm.get_client_by_id(owner_id); 
        }
    }

    private async create_exiting_group(group_id: string, clients: string[]){
        let groupObj = await this.cm.get_group_by_id(group_id);
        if (groupObj == null){
            ClientsManager.logManager.error(`Group ${group_id} not found`);
            return;
        }
        let owner = this.cm.get_client_by_id(groupObj.owner._serialized);
        if (owner == null || typeof owner == "string"){
            ClientsManager.logManager.error(`Owner of group ${group_id} not found`);
            return;
        }
        let group = new Group(owner);
        let title = groupObj.name;
        let image = "";
        let participants = groupObj.participants;
        let description = groupObj.description;

        await group.initialize(title, [],  clients, description, image, false, groupObj);
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
        let groupObj = created_group.get_group_obj();
        if (groupObj) {
            this.cm.add_group(groupObj);
        }
        ClientsManager.logManager.info(`Finished creating group ${title} with ${participants.length} participants`);
        return created_group;
    }


}
import { ClientsManager } from './ClientsManager';
import { extractPhoneNumbers } from './Excel';
import * as path from 'path';
import { Group } from './Group';

let clientManager = new ClientsManager();

async function run(){
    let clientsIds = ["xxxx", "xxxx", "xxxx"];
    await clientManager.connectClients(clientsIds);
    let group = await clientManager.create_group("xxxx", "XXXX", [], clientsIds, "test", "", true) as Group;
    let groups = await clientManager.get_groups_by_name("test");
    let group_id = await group.get_group_obj()?.id._serialized;
    if (group_id == undefined){
        return;
    }
    const pathToFile = path.join(__dirname, '..', 'excel', 'test_data.xlsx');
    let data = await extractPhoneNumbers(pathToFile, "phone");
    let admins = clientManager.get_client_numbers();
    let image = "";
    await clientManager.add_participants_to_group(clientsIds, group_id, data);
}

run();
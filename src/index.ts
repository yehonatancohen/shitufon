import { ClientsManager } from './ClientsManager';
import { extractPhoneNumbers } from './Excel';
import * as path from 'path';
import { Group } from './Group';

let clientManager = new ClientsManager();

async function run(){
    let clientsIds = ["3311"];
    await clientManager.connectClients(clientsIds);
    let group = await clientManager.create_group("3311", "קבוצת בדיקה", [], [], "test", "", true) as Group;
    let group_id = group.getGroupId();
    if (group_id == undefined){
        return;
    }
    const pathToFile = path.join(__dirname, '..', 'excel', 'test_data.xlsx');
    let data = await extractPhoneNumbers(pathToFile, "phone");
    await clientManager.add_participants_to_group(clientsIds, group_id, data);
}

run();
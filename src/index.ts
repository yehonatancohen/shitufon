import { Client, LocalAuth, MessageMedia, GroupChat } from 'whatsapp-web.js';
import { ClientsManager } from './ClientsManager';

let clientManager = new ClientsManager();

async function run(){
    clientManager.newClient("client1");
    await clientManager.connectClients(["client1"]);
    let client = clientManager.getClient("client1");
}

run();
import { Client, GroupChat, MessageMedia } from 'whatsapp-web.js';
const {utils, sleep, getNumberIds, clientsToParticipants, formatParticipants, formatClients} = require("./Util");
const Contacts = require('./contacts');
const logs = require('./logs');

async function makeAdmins(clients: Client[], group: GroupChat) {
    const nonAdmins = [];
    const participants = await clientsToParticipants(clients, group);
    
    for (const participant of participants) {
        const isAdmin = participant.isAdmin; // Not working
        if (!isAdmin){
            nonAdmins.push(participant.id._serialized);
        }
    }

    if (nonAdmins.length > 0) {
        const result = await group.promoteParticipants(nonAdmins);
        for (const admin of nonAdmins) {
            logs.getLogger().info(`promoted ${admin} to admin in group ${group.name}`);
        }
        if (result == null) {
            logs.getLogger().error("error setting admins");
        }
        return nonAdmins;
    }
}

async function getGroup(client: Client, name: string) {
    const chats = await client.getChats();
    const groups = [];
    for (const chat of chats) {
        if (chat.name === name && chat.isGroup) {
            groups.push(chat);
        }
    }
    return groups;
}

async function getGroupById(client: Client, groupId: string)
{
    const group = await client.getChatById(groupId);
    return group;
}

async function createGroup(client: Client, title: string, participants: any, admins: Client[], description: string, image: string, adminsOnly: boolean)
{
    participants = formatParticipants(participants);
    let created_group = await client.createGroup(title, participants);
    if (typeof created_group == "string"){
        logs.getLogger().error("error creating group");
        return created_group;
    }

    for (const participant of participants) {
        logs.getLogger().info(`${client.info.wid._serialized} Added ${participant} to group ${created_group.title}`);
    }

    let gc = await getGroupById(client, created_group.gid._serialized) as GroupChat;
    let newadmins, result;

    if (adminsOnly){
        gc.setInfoAdminsOnly(true);
        gc.setMessagesAdminsOnly(true);
    }

    if (admins.length > 0)
    {
        newadmins = await makeAdmins(admins, gc);
    }

    if (description != "") 
    {
        result = await gc.setDescription(description);
        if (result == null){
            logs.getLogger().error("error setting group description");
        }
    }

    if (image != "")
    {
        let created_image = await MessageMedia.fromUrl(image);
        result = await gc.setPicture(created_image);
        if (result == null){
            logs.getLogger().error("error setting image");
        }
    }

    return gc;
}

async function getGroupAdmin(clients: Client[], group: GroupChat)
{
    const nonAdmins = [];
    const participants = await clientsToParticipants(clients, group);
    let index = 0;
    for (const participant of participants) {
        const isAdmin = participant.isAdmin; // Not working
        if (isAdmin){
            return clients[index];
        }
        index++;
    }
    return null;
}

async function addAllClients(clients: Client[], group: GroupChat, promote = false) {
    let adminClient = await getGroupAdmin(clients, group);

    if (!adminClient) {
        return "No admin client found";
    }

    const existingParticipants = await getGroupContacts(adminClient, group);
    const clientsToAdd = formatClients(clients).filter((client: Client) => !formatClients(existingParticipants).includes(client));
    //let participants = participants.filter((c: Client) => !formatClients(clients).includes(c));

    await addParticipantsToGroup(adminClient, group, clientsToAdd, [0]);

    if (promote && clientsToAdd.length > 0) {
        await makeAdmins(clientsToAdd, group);
    }
}

async function addParticipantsToGroup(client: Client, group: GroupChat, participants: string[], sleepTime = [250, 500])
{
    participants = formatParticipants(participants);
    let result = await group.addParticipants(participants, {sleep: sleepTime, autoSendInviteV4: false});
    if (result == null){
        logs.getLogger().error("error adding participants");
        return result;
    }
    for (const number in result) {
        const { message, code } = result[number];
        if (code == 200) {
            logs.getLogger().info(`${client.info.wid._serialized} Added ${number} to group ${group.name}`);
        }
        if (code == 403) {
            logs.getLogger().error(`${client.info.wid._serialized} ${number} Invites only`);
        }
        if (code == 404) {
            logs.getLogger().error(`${client.info.wid._serialized} ${number} Not found`);
        }
        if (code == 409) {
            logs.getLogger().error(`${client.info.wid._serialized} ${number} already in group ${group.name}`);
        }
        else if(message) {
            logs.getLogger().error(`${client.info.wid._serialized} ${number} ${message}`);
        }
        else {
            logs.getLogger().error(`${client.info.wid._serialized} ${number} Unknown error`);
        }
    }
    return result;
}

async function addParticipantMultipleClients(clients: Client[], group: GroupChat, participants: string[], batchSize: number, minutesBetweenBatches: number, sleepTime = [2500, 5000]) {
    const logger = logs.createNewLogger();
    await addAllClients(clients, group, true);
    participants = participants.filter((c) => !formatClients(clients).includes(c));

    const clientsAmount = clients.length;
    const participantsAmount = participants.length;
    const participantsPerClient = Math.ceil(participantsAmount / clientsAmount);
    const batchesAmount = Math.ceil(participantsAmount / batchSize);

    let addedParticipants = 0;

    while (addedParticipants < participantsAmount) {
        for (let i = 0; i < clientsAmount; i++) {
            const client = clients[i];

            // Calculate the number of participants to add for this client
            const participantsToAdd = Math.min(batchSize, participantsAmount - addedParticipants);

            if (participantsToAdd > 0) {
                const batchParticipants = participants.slice(addedParticipants, addedParticipants + participantsToAdd);

                await addParticipantsToGroup(client, group, batchParticipants, sleepTime);
                addedParticipants += batchParticipants.length;
            }
        }

        // Add a wait time between batches
        if (addedParticipants < participantsAmount) {
            await sleep(minutesBetweenBatches * 60 * 1000);
        }
    }
}

async function getGroupContacts(client: Client, group: GroupChat)
{
    let participants = await group.participants;
    let contacts = await Contacts.getContactByParticipant(client, participants);
    return contacts;
}

async function tagGroup(client: Client, group: GroupChat)
{
    const contacts = await getGroupContacts(client, group);
    let tagged = "";
    for (const contact of contacts) {
        tagged += `@${contact.number._serialized} `;
    }
    return tagged;

}

module.exports = {addParticipantMultipleClients, createGroup, addParticipantsToGroup,addAllClients, makeAdmins, getGroupById, getGroupContacts, tagGroup, getGroup};
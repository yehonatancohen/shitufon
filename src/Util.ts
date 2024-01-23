import { Client, GroupChat } from 'whatsapp-web.js';

export async function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export async function getNumberIds(client: Client, phoneNumbers: string[]) {
    var returnList = [];
    for (var i = 0; i < phoneNumbers.length; i++) {
        const serialized = await client.getNumberId(phoneNumbers[i]);
        if (serialized) {
            returnList.push(serialized._serialized);
        }
    }
    return returnList;
}

export async function clientsToParticipants(clients: Client[], gc: GroupChat) {
    var participants = [];
    for (const participant of gc.participants) {
        if (clients.some(client => client.info.wid._serialized  === participant.id._serialized)) {
            participants.push(participant);
        }
    }
    return participants;
}

export function formatPhoneNumber(phoneNumber: string) {
    const numericOnly = phoneNumber.replace(/\D/g, '');
    const trimmedNumber = numericOnly.startsWith('0') ? numericOnly.slice(1) : numericOnly;
    let formattedNumber = trimmedNumber.startsWith('972') ? trimmedNumber : `972${trimmedNumber}`;
    if (formattedNumber.length !== 12) return 'Invalid phone number';
    return formattedNumber.endsWith('@c.us') ? formattedNumber : `${formattedNumber}@c.us`;
}

export function formatParticipants(participants: any[]) {
    const formattedParticipants = [];
    for (const participant of participants) {
        if (participant === undefined || participant == null) continue;
        if (typeof participant === 'number') {
            formattedParticipants.push(formatPhoneNumber(participant.toString()));
        } else if (typeof participant === 'string') {
            formattedParticipants.push(formatPhoneNumber(participant));
        } else {
            formattedParticipants.push(formatPhoneNumber(participant.info.wid._serialized));
        }
    }
    return formattedParticipants;
}

export function formatClients(clients: any[]){
    const formattedClients = [];
    for (const client of clients) {
        try{
            formattedClients.push(formatPhoneNumber(client.info.wid.user));
        
        }
        catch{
            formattedClients.push(client.id._serialized);
        }
    }
    return formattedClients;
}

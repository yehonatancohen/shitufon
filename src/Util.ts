import { Client, GroupChat } from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';

export function findRecentTxtFiles (directory: string, amount: number): string[] {
    try {
        // Read the directory content
        const allFiles = fs.readdirSync(directory)
            .filter(file => file.endsWith('.txt'))  // Filter for .txt files
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(directory, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time)  // Sort files by modification time, descending

        // Array to hold valid file names
        const validFiles: string[] = [];

        // Check each file for more than 30 lines
        for (let i = 0; i < allFiles.length; i++){
            const file = allFiles[i];
            const lines = fs.readFileSync(path.join(directory, file.name), { encoding: 'utf-8' })
                .split('\n');
            if (lines.length > 30) {
                validFiles.push(path.join(directory, file.name));
                if (validFiles.length >= amount) return validFiles;
            }
        }

        return validFiles;
    } catch (error) {
        console.error('Error accessing files:', error);
        return [];
    }
};

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

export function idToPhoneNumber(participant_id: string) {
    const numericOnly = participant_id.replace(/\D/g, '');
    const trimmedNumber = numericOnly.startsWith('972') ? numericOnly.slice(3) : numericOnly;
    return `0${trimmedNumber}`;
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

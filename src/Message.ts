import { sleep } from './Util';
import { Client, GroupChat, MessageMedia } from 'whatsapp-web.js';

async function sendMessageGroups(client: Client, groups: GroupChat[], message: string, timeBetweenMessages = 0, messagesThreshold = 10, sleepTime = 20) {
    try {
        let sent_messages = []
        let currentMessageCount = 0;
        for (const group of groups) {
            let sent_message;
            if (client)
            {
                sent_message = await client.sendMessage(group.id._serialized, message);
            }
            else if(group)
            {
                sent_message = await group.sendMessage(message);
            }
            sent_messages.push(sent_message);

            currentMessageCount++;

            if (currentMessageCount >= messagesThreshold) {
                await sleep(sleepTime);
                currentMessageCount = 0; 
            } else {
                await sleep(timeBetweenMessages);
            }
        }
        return sent_messages;
    } catch (error: any) {
        console.error("Error sending messages:", error.message);
    }
}

async function sendMessage(client: Client, phoneNumber: string, message: string, timeBetweenMessages = 0, messagesThreshold = 10, sleepTime = 20) {
    try {
        let sent_messages = []
        let currentMessageCount = 0;
        const phoneNumbers = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber];
        for (const phoneNumber of phoneNumbers) {
            const numberId = await client.getNumberId(phoneNumber);
            if (numberId) {
                let sent_message = await client.sendMessage(numberId._serialized, message);
                sent_messages.push(sent_message);
            }

            currentMessageCount++;

            if (currentMessageCount >= messagesThreshold) {
                await sleep(sleepTime);
                currentMessageCount = 0; 
            } else {
                await sleep(timeBetweenMessages);
            }
        }
        return sent_messages;
    } catch (error: any) {
        console.error("Error sending messages:", error.message);
    }
}

async function sendMessagesWithMultipleClients(clients: Client[], phoneNumbers: string, message: string, timeBetweenMessages = 0, messagesThreshold = 10, sleepTime = 20) {
    try {
        let sent_messages = []
        const clientsCount = clients.length;
        const messagesPerClient = Math.ceil(phoneNumbers.length / clientsCount);

        for (let i = 0; i < messagesPerClient; i++) {
            for (let j = 0; j < clientsCount; j++) {
                const client = clients[j];
                const index = i * clientsCount + j;

                if (index >= phoneNumbers.length) {
                    // Break if all messages are sent
                    break;
                }

                const phoneNumber = phoneNumbers[index];
                let current_messages = await sendMessage(client, phoneNumber, message, timeBetweenMessages, messagesThreshold);
                sent_messages.push(current_messages);
                // Add a wait time between clients
                if (j < clientsCount - 1) {
                    await sleep(timeBetweenMessages);
                }
            }

            // Add a wait time between each batch of messages
            if (i < messagesPerClient - 1) {
                await sleep(sleepTime);
            }
        }
        return sent_messages;
    } catch (error: any) {
        console.error("Error sending messages with multiple clients:", error.message);
        // Handle or log the error accordingly
    }
}

module.exports = {sendMessage, sendMessagesWithMultipleClients, sendMessageGroups};
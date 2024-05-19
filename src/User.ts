import { ClientsManager } from './ClientsManager';
import { Session } from './Session';
import { extractPhoneNumbers } from './Excel';
import { MessagesSession } from './MessagesSession';
import { ListeningSession } from './ListeningSession';
import { WarmingSession } from './WarmingSession';
import * as path from 'path';
import * as fs from 'fs';
import { Group } from './Group';

class User {
    private clientManager: ClientsManager;
    private uid: string;
    private client_ids: string[];
    private sessions: Session[];

    constructor(uid: string, ) {
        this.clientManager = new ClientsManager();
        this.uid = uid;
        this.client_ids = [];
        this.sessions = [];
        if (!this.loadUser()) {
            ClientsManager.logManager.error(`Failed to load user ${this.uid}`);
            return;
        }
    }

    private loadUser() {
        const auth = this.authenticateUser(this.uid, "test");
        if (!auth)
            return;
        const user = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'users', `${this.uid}.json`), 'utf8'));
        if (user == null || user == undefined)
            return false;
        if (user.client_ids != undefined && user.client_ids != null)
            ClientsManager.logManager.info(`Found no client ids for user ${this.uid}`);
        else
            this.client_ids = user.client_ids;
        if (user.sessions != undefined && user.sessions != null)
            ClientsManager.logManager.info(`Found no sessions for user ${this.uid}`);
        else
            this.sessions = user.sessions;
        return true;
    }

    private authenticateUser(uid: string, password: string) {
        const firstSixLetters = uid.substring(0, 6);
        const seventhCharAscii = uid.charCodeAt(6);
        const eighthCharAscii = uid.charCodeAt(7);
        const lastTwoChars = uid.substring(uid.length - 2);
        const authPass = password == "test"; 
        if (firstSixLetters === this.uid && seventhCharAscii * eighthCharAscii === parseInt(lastTwoChars) && authPass) {
            ClientsManager.logManager.info(`User ${uid} authenticated`);
            return true;
        } else {
            ClientsManager.logManager.error(`User ${uid} not authenticated`);
            return false;
        }
    }

    startSession(sessionType: string) {
    }
}
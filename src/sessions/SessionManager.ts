import { GroupSession } from "./GroupSession";
import { ListeningSession } from "./ListeningSession";
import { MessagesSession } from "./MessagesSession";
import { WarmingSession } from "./WarmingSession";
import { ClientsManager } from "../ClientsManager";
import { Session } from "./Session";

export class SessionManager
{
    protected managerNumber: string;
    protected clientManager: ClientsManager;
    protected clientsIds: string[] = [];
    protected sessions: Session[] = [];
    protected sessionTypes: {[type: string]: any} = {
        "Group": GroupSession,
        "Listening": ListeningSession,
        "Messages": MessagesSession,
        "Warming": WarmingSession
    };
    
    constructor(cm: ClientsManager, managerNumber: string, clientIds: string[] = [])
    {
        this.clientManager = cm;
        this.managerNumber = managerNumber;
    }

    public getStatus() {

    }

    public async logUser(message: string) {
        await this.clientManager.clients[this.clientsIds[0]].sendMessage(this.managerNumber, message);
        ClientsManager.logManager.info(`Sent log message to ${this.managerNumber}: ${message}`);
    }

    public async sendStatus() {
        let allSessionTypes = [];
        const messageSessions = this.getSessionsByType("Messages");
        const listeningSessions = this.getSessionsByType("Listening");
        const groupSessions = this.getSessionsByType("Group");
        const warmingSessions = this.getSessionsByType("Warming");
        allSessionTypes.push(messageSessions);
        allSessionTypes.push(listeningSessions);
        allSessionTypes.push(groupSessions);
        allSessionTypes.push(warmingSessions);

        
        const totalMessage = "";
        let statusMessage = `Status:\n
        running ${this.sessions.length} sessions\n`;
        for (let sessionType of allSessionTypes) {
            if (sessionType.length <= 0) continue;
            statusMessage += '-----------\n';
            statusMessage += `${sessionType.length} sessions of type ${sessionType[0].sessionType}\n`
            for (let session of sessionType) {
                const startTime = messageSessions[0].getStartTime();
                const endTime = new Date().getTime();
                const elapsedTimeMs = endTime - startTime;
                const elapsedTimeMinutes = elapsedTimeMs / (1000 * 60);
                statusMessage += `session ${session.getId()}\n
                running for ${elapsedTimeMinutes} minutes\n
                with ${session.getClients().length} clients: ${Object.keys(session.getClients()).join(' ')}\n`;
                if (session.sessionType == "Messages") {
                    statusMessage += `Sent ${(session as MessagesSession).getSentMessage()} messages\n`
                }
            }
        }
        await this.clientManager.clients[this.clientsIds[0]].sendMessage(this.managerNumber, statusMessage);
        ClientsManager.logManager.info(`Sent log message to ${this.managerNumber}`);
    }

    public getSessions() {
        return this.sessions;
    }

    public getSession(sessionId: string) {
        return this.sessions.find(session => session.getId() === sessionId);
    }

    public pauseSession(sessionId: string) {
        let session = this.getSession(sessionId);
        if (session) {
            session.pause();
            this.clientManager.clients[this.clientsIds[0]].sendMessage(this.managerNumber, `Session ${sessionId} paused`);
        }
    }

    public resumeSession(sessionId: string) {
        let session = this.getSession(sessionId);
        if (session) {
            session.resume();
            this.clientManager.clients[this.clientsIds[0]].sendMessage(this.managerNumber, `Session ${sessionId} resumed`);
        }
    }

    public stopSession(sessionId: string) {
        let session = this.getSession(sessionId);
        if (session) {
            session.stop();
            this.clientManager.clients[this.clientsIds[0]].sendMessage(this.managerNumber, `Session ${sessionId} stopped`);
        }
    }

    public getSessionById(sessionId: string) {
        return this.sessions.find(session => session.getId() === sessionId);
    }

    protected getSessionsByType(type: string) {
        let ret = [];
        for (let session of this.sessions) { 
            if (session.sessionType == type) {
                ret.push(session);
            }
        }
        return ret;
    }

    public async informUser() {

    }

    public async createSession(sessionType: string, clientIds: string[], participants: string[] = [], ...args: any[])
    {
        this.clientsIds.push(...clientIds);
        if (!this.sessionTypes[sessionType]) { ClientsManager.logManager.error(`Session type ${sessionType} not found`); return; };
        let session;
        switch(sessionType) {
            case "Group":
                // cm: ClientsManager, sm: SessionManager, clientIds: string[], mainNumber?: string, mainClient?: string
                if (args.length < 1) { ClientsManager.logManager.error(`Missing owner id`); return; }
                if (participants.length < 1) { ClientsManager.logManager.error(`Missing participants`); return; }
                let owner_id = args[0];
                if (!participants.includes(owner_id)) { ClientsManager.logManager.error(`Owner id ${owner_id} not in participants`); return; }
                let group_id = args[1];
                session = new GroupSession(this.clientManager, this, clientIds, participants, owner_id, group_id);
                break;
            case "Listening":
                // cm: ClientsManager, sm: SessionManager, clientIds: string[], mainNumber?: string, mainClient?: string
                if (args.length < 1) { ClientsManager.logManager.error(`Missing main number`); return; }
                if (args.length < 2) { ClientsManager.logManager.error(`Missing main client`); return; }
                session = new ListeningSession(this.clientManager, this, clientIds, args[0], args[1]);
                break;
            case "Messages":
                // cm: ClientsManager, sm: SessionManager, clientIds: string[], phoneNumbers: string[], messageBody: string[], sleepTime?: number, every?: number, wait?: number
                if (args.length < 1) { ClientsManager.logManager.error(`Missing phone numbers`); return; }
                if (participants.length < 1) { ClientsManager.logManager.error(`Missing participants`); return; }
                session = new MessagesSession(this.clientManager, this, clientIds, participants, args[0], args[1], args[2], args[3])
                break;
            case "Warming":
                // cm: ClientsManager, sm: SessionManager, clientIds: string[], mainNumber?: string
                session = new WarmingSession(this.clientManager, this, clientIds, args[0])
                break;
            default:
                return;
        }

        this.sessions.push(session);
        await session.init();
        await session.startSession();
        return session;
    }
}
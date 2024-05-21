import { GroupSession } from "./GroupSession";
import { ListeningSession } from "./ListeningSession";
import { MessagesSession } from "./MessagesSession";
import { WarmingSession } from "./WarmingSession";
import { ClientsManager } from "../ClientsManager";
import { Session } from "./Session";

export class SessionManager
{
    protected clientManager: ClientsManager;
    protected clientsIds: string[] = [];
    protected sessions: Session[] = [];
    protected sessionTypes: {[type: string]: any} = {
        "Group": GroupSession,
        "Listening": ListeningSession,
        "Messages": MessagesSession,
        "Warming": WarmingSession
    };
    
    constructor(cm: ClientsManager, clientIds: string[] = [])
    {
        this.clientManager = cm;
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
        }
    }

    public resumeSession(sessionId: string) {
        let session = this.getSession(sessionId);
        if (session) {
            session.resume();
        }
    }

    public stopSession(sessionId: string) {
        let session = this.getSession(sessionId);
        if (session) {
            session.stop();
        }
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
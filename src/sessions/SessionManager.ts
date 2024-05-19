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



}
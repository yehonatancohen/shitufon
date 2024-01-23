import { Client, LocalAuth, MessageMedia, GroupChat } from 'whatsapp-web.js';
import { ClientsManager } from './ClientsManager';
import { Group } from './Group';
import QRCode from 'qrcode-terminal';

export class ClientController {
	private clientId;
	public clientObj;
	private name: string;
	private profilePic: MessageMedia;
	private Manager;

    constructor(clientId_: string, profilePic = new MessageMedia("", "", null, null), name = "", Manager: ClientsManager) {
        this.clientId = clientId_;
		this.Manager = Manager;
		this.clientObj = new Client({ authStrategy: new LocalAuth({ clientId: clientId_ })});
		this.profilePic = profilePic;
		this.name = name;
		if(name == ""){
			this.name = clientId_;
		}
	}

	public getClientId() {
		return this.clientId;
	}

	public async recievedQrCode(qr: string) {
		QRCode.generate(qr, { small: true });
		this.Manager.qrReceived(this.clientId, qr);
	}

	public async logOut(){
		if(!(await this.isConnected()))
			throw new Error('Client is not connected');
		await this.clientObj.logout();
	}

	public async isConnected() {
		return await this.clientObj.getState() == 'CONNECTED';
	}

	public async isPaired() {
		return ((await this.clientObj.getState()) == 'PAIRING') || ((await this.clientObj.getState()) == 'CONNECTED');
	}

	public async connect() {
		await this.start();
		if(this.profilePic != null){
			await this.clientObj.setProfilePicture(this.profilePic);
		}
		if(this.name != null){
			await this.clientObj.setDisplayName(this.name);
		}
   		await this.clientObj.sendPresenceAvailable();
	}

	public async changeName(name: string) {
		if(!(await this.isConnected()))
			throw new Error('Client is not connected');
		await this.clientObj.setDisplayName(name);
		this.name = name;
	}

	public async changeProfilePic(pic: MessageMedia) {
		if(!(await this.isConnected()))
			throw new Error('Client is not connected');
		await this.clientObj.setProfilePicture(pic);
		this.profilePic = pic;
	}

	public async start() {
		if(await this.isConnected())
			throw new Error('Client is already connected');
		await this.clientObj.initialize();
		await this.clientObj.on('qr', (qr) => {
			this.recievedQrCode(qr);
		});
		return new Promise<void>((resolve) => {
			this.clientObj.on('ready', () => {
				resolve();
			});
		});
	}

	public async createGroup(title: string, participants: string[], admins: ClientController[] = [], description: string = "", image: string = "", adminsOnly: boolean = false) {
		if(!(await this.isConnected()))
			throw new Error('Client is not connected');
		let group = new Group(this);
		await group.initialize(title, participants, admins, description, image, adminsOnly);
		return this.clientObj.createGroup(title, participants);
	}

	public async getGroupById(groupId: string) {
		let groups = await this.clientObj.getChats();
		for (let group of groups){
			if(group.id._serialized == groupId){
				return group as GroupChat;
			}
		}
		return "Group not found";
	}
}

function getClientIds(){

}

function setUpClient(){

}
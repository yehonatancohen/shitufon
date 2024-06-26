import { Client, LocalAuth, MessageMedia, GroupChat } from 'whatsapp-web.js';
import { ClientsManager } from './ClientsManager';
import { Group } from './Group';
import { formatPhoneNumber } from './Util';
import QRCode from 'qrcode-terminal';

export class ClientController {
	private clientId;
	public clientObj;
	private name: string;
	private profilePic: MessageMedia;
	public Manager;

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

	public get_phone_number(){
		return this.clientObj.info.wid._serialized;
	}

	public async isConnected() {
		return false;
		try {
			let state = await this.clientObj.getState();
			return state == 'CONNECTED';
		} catch (e) {
			return false;
		}
	}

	public async isPaired() {
		return ((await this.clientObj.getState()) == 'PAIRING') || ((await this.clientObj.getState()) == 'CONNECTED');
	}

	public async connect() {
		await this.start();
		if(this.profilePic.data != ""){
			await this.clientObj.setProfilePicture(this.profilePic);
		}
		if(this.name != null){
			await this.clientObj.setDisplayName(this.name);
		}
   		await this.clientObj.sendPresenceAvailable();
	}

	public async start() {
		await this.createClient();
	}

	private async createClient(){
		this.clientObj.on('qr', (qr) => {
			this.recievedQrCode(qr);
		});
	
		// Event listener for when the client is ready
		const clientReady = new Promise<void>((resolve) => {
			this.clientObj.on('ready', () => {
				resolve();
			})
		});
	
		// Log in the client
		this.clientObj.initialize();

		await clientReady;
	}
	
	public async recievedQrCode(qr: string) {
		QRCode.generate(qr, { small: true });
		//this.Manager.qrReceived(this.clientId, qr);
	}

	public async logOut(){
		await this.clientObj.logout();
	}

	public async changeName(name: string) {
		await this.clientObj.setDisplayName(name);
		this.name = name;
	}

	public async changeProfilePic(pic: MessageMedia) {
		await this.clientObj.setProfilePicture(pic);
		this.profilePic = pic;
	}

	public async createGroup(title: string, participants: string[], admins: string[] = [], description: string = "", image: string = "", adminsOnly: boolean = false) {
		let group = new Group(this);
		await group.initialize(title, participants, admins, description, image, adminsOnly);
		return group;
	}

	public async get_group_by_id(groupId: string) {
		let groups;
		try{
			groups = await this.clientObj.getChats();
		}
		catch{
			return "Client not found";
		}
		for (let group of groups){
			if(group.id._serialized == groupId){
				return group as GroupChat;
			}
		}
		return "Group not found";
	}

	public async get_groups_ids() {
		let groups = await this.clientObj.getChats();
		let groups_ids = [];
		for (let group of groups){
			groups_ids.push(group.id._serialized);
		}
		return groups_ids;
	}

	public async get_group_by_name(name: string){
		let groups = await this.clientObj.getChats();
		for (let group of groups){
			if(group.name == name){
				return group as GroupChat;
			}
		}
		return;
	}

	public async sendMessage(phoneNumber: string, message: string){
		const chatId = formatPhoneNumber(phoneNumber);
		const chat = await this.clientObj.getChatById(chatId);
		return await chat.sendMessage(message);
	}

	public async add_participant(groupId: string, phoneNumber: string){
		let chat = await this.clientObj.getChatById(groupId);
		if(chat.isGroup == false){
			return "Chat is not a group";
		}
		let result = await (chat as GroupChat).addParticipants([formatPhoneNumber(phoneNumber)], {autoSendInviteV4: false});
		if (result.code != 200){
			ClientsManager.logManager.error(`Error adding ${phoneNumber} to ${groupId}: ${result}`);
			return result;
		}
		else
		{
			ClientsManager.logManager.info(`Added ${phoneNumber} to ${groupId}`);
			return true;
		}
	}
}
import { Client, LocalAuth, MessageMedia, GroupChat, Message } from 'whatsapp-web.js';
import { ClientsManager } from './ClientsManager';
import { Group } from './Group';
import { formatPhoneNumber } from './Util';
import QRCode from 'qrcode-terminal';
import { error } from 'console';
import { LogManager } from './LogManager';

export class ClientController {
	private clientId;
	public messagingLevel;
	protected groupsLevel;
	public clientObj;
	private name: string;
	private profilePic: MessageMedia;
	public Manager;
	public connected: boolean;

    constructor(clientId_: string, profilePic = new MessageMedia("", "", null, null), name = "", Manager: ClientsManager) {
        this.clientId = clientId_;
		const wwebVersion = '2.2412.54';
		this.clientObj = new Client({
			 authStrategy: new LocalAuth({ clientId: clientId_ }),
			 webVersionCache: {
				type: 'remote',
				remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${wwebVersion}.html`,
			},
			puppeteer: {headless: true},
		});
		this.connected = false;
		this.messagingLevel = 0; // Initialize messagingLevel
		this.groupsLevel = 0; // Initialize messagingLevel
		this.profilePic = profilePic;
		this.name = name;
		this.loadClient();
		this.Manager = Manager;
		if(name == ""){
			this.name = clientId_;
		}
	}

	private loadClient()
	{
		// Load the client from the database
	}

	private saveClient()
	{
		// Save the client to the database 
	}

	public getClientId() {
		return this.clientId;
	}

	public get_phone_number(){
		return this.clientObj.info.wid._serialized;
	}

	public async connect() {
		await this.start();
		if(this.profilePic.data != ""){
			await this.changeProfilePic(this.profilePic);
		}
		if(this.name != null && this.name != this.clientId){
			await this.changeName(this.name);
		}
   		await this.clientObj.sendPresenceAvailable();
	}

	public async start() {
		await this.createClient().catch((error) => this.errorCallback(error));
	}

	private errorCallback(error: any)
	{
		ClientsManager.logManager.error(`Error creating client ${this.clientId}: ${error}`);
	}

	private async createClient(){
		this.clientObj.on('qr', (qr) => {
			this.recievedQrCode(qr);
		});

		this.clientObj.on('disconnected', (reason) => {
			if (reason == "NAVIGATION"){
				ClientsManager.logManager.error(`Client ${this.clientId} probably banned`);
				this.connected = false;
			}
			else
				ClientsManager.logManager.error(`Client ${this.clientId} disconnected: ${reason}`);
			this.connected = false;
		});

		this.clientObj.on('auth_failure', async (message) => {
			ClientsManager.logManager.error(`Client ${this.clientId} auth failure: ${message}`);
			this.connected = false;
		});
	
		// Event listener for when the client is ready
		const clientReady = new Promise<void>((resolve) => {
			this.clientObj.on('ready', () => {
				resolve();
			})
		});
		
		this.connected = true;
		
		// Log in the client
		await this.clientObj.initialize();

		await clientReady;
	}
	
	public async recievedQrCode(qr: string) {
		QRCode.generate(qr, { small: true });
		//this.Manager.qrReceived(this.clientId, qr);
	}

	public async logOut(){
		await this.clientObj.logout();
		this.connected = false;
	}

	public async changeName(name: string) {
		ClientsManager.logManager.info(`Changing name of ${this.clientId} to ${name}`);
		let succsed = await this.clientObj.setDisplayName(name);
		if (succsed){
			this.name = name;
			return true;
		} else {
			ClientsManager.logManager.info(`Failed to change name of ${this.clientId} to ${name}`);
		}
		this.name = name;
	}

	public async changeStatus(status: string) {
		ClientsManager.logManager.info(`Changing status of ${this.clientId} to ${status}`);
		await this.clientObj.setStatus(status);
	}

	public async changeProfilePic(pic: MessageMedia | string) {
		ClientsManager.logManager.info(`Changing profile picture of ${this.clientId}`);
		if (pic == ""){
			let pfp = new MessageMedia("", "", null, null);
			await this.clientObj.setProfilePicture(pfp);
			this.profilePic = pfp;
			return;
		}
		await this.clientObj.setProfilePicture(pic as MessageMedia);
		this.profilePic = pic as MessageMedia;
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
		this.messagingLevel++;
		return await chat.sendMessage(message);
	}

	public async sendGroupMessage(groupId: string, message: string){
		const chatId = groupId;
		const chat = await this.clientObj.getChatById(chatId);
		this.messagingLevel++;
		return await chat.sendMessage(message);
	}

	public async sendMedia(phoneNumber: string, media: MessageMedia){
		const chatId = formatPhoneNumber(phoneNumber);
		const chat = await this.clientObj.getChatById(chatId);
		this.messagingLevel++;
		return await chat.sendMessage(media);
	}

	public async add_participant(groupId: string, phoneNumber: string){
		let chat = await this.clientObj.getChatById(groupId);
		if(chat.isGroup == false){
			return "Chat is not a group";
		}
		let result = await (chat as GroupChat).addParticipants([formatPhoneNumber(phoneNumber)], {autoSendInviteV4: false});
		if (result != "200"){
			//ClientsManager.logManager.error(`Error adding ${phoneNumber} to ${groupId}: ${result}`);
			return true;
		}
		else
		{
			ClientsManager.logManager.info(`Added ${phoneNumber} to ${groupId}`);
			return true;
		}
	}
}
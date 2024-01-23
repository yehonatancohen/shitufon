import { Client, LocalAuth } from 'whatsapp-web.js';

async function test() {
	const client = new Client({
		authStrategy: new LocalAuth({ clientId: "client2" })
	});
	client.initialize();
	console.log(await client.getState());
}

test();

module.exports = {};
import {Client, LocalAuth, MessageMedia, WAState} from "whatsapp-web.js";

import qrcode from "qrcode-terminal";
import ConfigService, {CONFIGURATION} from "../services/config.service";
import {Worker} from "bullmq";
import MainController from "../controllers/main.controller";
import {queue} from '../config/config.json';
import path from "path";

const WppClient = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.resolve("./")
    })
});


WppClient.on('qr', (qr) => {
    console.log("QR")
    // NOTE: This event will not be fired if a session is specified.
    qrcode.generate(qr, {small: true});
});

WppClient.on('ready', async () =>{
    console.log('READY');
    await ConfigService.set(CONFIGURATION.CURRENT_PHONE_NUMBER, WppClient.info.wid.user);
    /* starting worker */
    const myWorker = new Worker(queue.queueName, MainController.workController, {
        connection: queue.connection
    });

});

WppClient.on('auth_failure', (msg) => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});



WppClient.initialize();

async function getMedia(url:string, fileName: string):Promise<MessageMedia | null>{
    try {
        return await MessageMedia.fromUrl(url,{
            unsafeMime: true,
            filename: fileName,
        });
    } catch (e){
        return null;
    }
}

async function getMediaFromBase64(data: string, fileName: string, mimeType: string):Promise<MessageMedia | null>{
    try {
        return await new MessageMedia(mimeType, data, fileName)
    } catch (e){
        return null;
    }
}

async function sendMessage(to: string, body: string | MessageMedia, caption: string | null = null){
    try {
        if(await WppClient.getState() !== WAState.CONNECTED) return null;
        const contactId = await WppClient.getNumberId(to);
        if(contactId == null) {
            return null;
        }
        return await WppClient.sendMessage(
            `${contactId.user}@${contactId.server}`,
            body, {caption: caption ?? ''}
        );
    } catch (e){
        return null;
    }
}

async function getContactFromNumber(number:string){
    try {
        if(await WppClient.getState() !== WAState.CONNECTED) return null;
        const contactId = await WppClient.getNumberId(number);
        if(!contactId) return null;
        return contactId;
    } catch (e){
        return null;
    }
}

export {WppClient, sendMessage, getMedia, getMediaFromBase64, getContactFromNumber};

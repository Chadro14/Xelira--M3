// index.js

import {
    default as makeWASocket,
    prepareWAMessageMedia,
    removeAuthsState,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    generateWAMessageFromContent,
    generateWAMessageContent,
    generateWAMessage,
    jidDecode,
    proto,
    delay,
    relayWAMessage,
    getContentType,
    generateMessageTag,
    getAggregateVotesInPollMessage,
    downloadContentFromMessage,
    fetchLatestWaWebVersion,
    interactiveMessage,
    makeCacheableSignalKeyStore,
    browsers,
    generateForwardMessageContent,
    messageRetryMap
} from "@whiskeysockets/baileys";
import pino from 'pino';
import FileType from 'file-type'; 
import readline from "readline";
import fs from 'fs';
import crypto from "crypto";
import path from "path";
import fetch from 'node-fetch'; 

import { spawn, exec, execSync } from 'child_process';
import { Boom } from '@hapi/boom'; 

// Import de votre configuration (CHEMIN CORRIGÉ pour la RACINE)
import configuration from './config.js'; 

// --- DÉFINITION INTERNE de la fonction color (REMPLACEMENT) ---
// Cette fonction empêche le crash et retourne simplement le texte sans couleur.
const color = (text, color) => text; 

// Import de vos bibliothèques locales (CHEMINS CORRIGÉS pour la RACINE)
// Le fichier color.js est remplacé par la fonction ci-dessus.
import { smsg, sleep, getBuffer } from './myfunction.js'; // <-- CORRIGÉ : Retire ./library/
import { imageToWebp, videoToWebp, writeExifImg, writeExifVid, addExif } from './exif.js'; // <-- CORRIGÉ : Retire ./library/

// --- Initialisation ---
const listcolor = ['cyan', 'magenta', 'green', 'yellow', 'blue'];
const randomColor = listcolor[Math.floor(Math.random() * listcolor.length)];

// Processus d'erreurs non capturées
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error); 

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        // La fonction color() est appelée ici, elle utilise la définition interne.
        rl.question(color(text, randomColor), (answer) => {
            resolve(answer);
            rl.close();
        });
    });
}

const clientStart = async() => {
    console.clear();
    console.log(color('Démarrage du bot WhatsApp...', 'green'));

    const store = makeInMemoryStore({
        logger: pino().child({ 
            level: 'silent', 
            stream: 'store' 
        })
    });
    
    // Utilisation de la configuration importée
    const { state, saveCreds } = await useMultiFileAuthState(`./${configuration.session}`);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(color(`Utilisation de Baileys v${version}${isLatest ? ' (dernière version)' : ''}`, 'yellow'));

    const client = makeWASocket({
        logger: pino({ level: "silent" }), 
        printQRInTerminal: configuration.status.terminal, 
        auth: state,
        browser: browsers.ubuntu('Chrome'), 
    });

    if (configuration.setPair && !client.authState.creds.registered) { 
        const phoneNumber = await question('/> Veuillez entrer votre numéro WhatsApp, ex: 243xxxxxxxxxx:\n> Numéro: ');
        console.log(color('La méthode de code de jumelage direct n\'est pas toujours supportée ou stable avec Baileys. Il est recommandé d\'utiliser le QR Code.', 'red'));
        console.log(color('Veuillez vous assurer que printQRInTerminal est sur true dans votre config pour voir le QR si besoin.', 'red'));
    }
    
    store.bind(client.ev);
    
    client.ev.on('creds.update', saveCreds);
    client.ev.on('messages.upsert', async chatUpdate => { 
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            mek.message =
                Object.keys(mek.message)[0] === 'ephemeralMessage' ? 
                mek.message.ephemeralMessage.message : mek.message;
            
            if (configuration.status.reactsw && mek.key && mek.key.remoteJid === 'statusBroadcast') {
                let emoji = [ '😘', '😭', '😂', '😹', '😍', '😋', '🙏', '😜', '😢', '😠', '🤫', '😎' ];
                let sigma = emoji[Math.floor(Math.random() * emoji.length)];
                await client.readMessages([mek.key]);
                client.sendMessage('statusBroadcast', { 
                    react: { 
                        text: sigma, 
                        key: mek.key 
                    }
                }, { statusJidList: [mek.key.participant] }); 
            }
            
            if (mek.key && mek.key.remoteJid.includes('newsletter')) return;
            if (!client.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
            if (mek.key.id.startsWith('laurine-') && mek.key.id.length === 12) return;
            
            const m = smsg(client, mek, store); 
            // Correction de l'import de handler
            try {
                // Utilisation d'import dynamique pour les modules ES
                const handler = await import("./handler.js"); // Chemin corrigé
                handler.default(client, m, chatUpdate, store); // Si handler.js exporte par défaut
            } catch (handlerErr) {
                console.error("Erreur lors du chargement ou de l'exécution de handler.js:", handlerErr);
            }
        } catch (err) {
            console.error("Erreur lors de la gestion des messages:", err); 
        }
    });

    client.decodeJid = (jid) => { 
        if (!jid) return jid;
        if (/:\d+/gi.test(jid)) {
            let decode = jidDecode(jid) || {}; 
            return decode.user && decode.server && decode.user + '' + decode.server || jid;
        } else return jid;
    };

    client.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = client.decodeJid(contact.id); 
            if (store && store.contacts) store.contacts[id] = {
                id,
                name: contact.notify
            };
        }
    });

    client.public = configuration.status.public; 
    
    client.ev.on('connection.update', (update) => {
        // La fonction konek doit aussi être adaptée aux modules ES et à votre configuration
        import('./connection.js') // <-- CORRIGÉ : Retire ./library/
            .then(module => module.konek({ client, update, clientStart, DisconnectReason, Boom })) 
            .catch(err => console.error("Erreur lors du chargement de connection.js:", err));
    });
    
    // --- Fonctions utilitaires du client ---

    client.deleteMessage = async (chatId, key) => { 
        try {
            await client.sendMessage(chatId, { delete: key });
            console.log(`Message supprimé: ${key.id}`);
        } catch (error) {
            console.error('Erreur lors de la suppression du message:', error);
        }
    };

    client.sendText = async (jid, text, quoted = '', options) => { 
        client.sendMessage(jid, {
            text: text,
            ...options
        },{ quoted });
    };
    
    client.downloadMediaMessage = async (message) => { 
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]); 
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]); 
        }
        return buffer;
    };

    client.sendImageAsSticker = async (jid, path, quoted, options = {}) => { 
        let buff = Buffer.isBuffer(path) ? 
            path : /^data:.*?\/.*?;base64,/i.test(path) ?
            Buffer.from(path.split(',')[1], 'base64') : /^https?:\/\//.test(path) ?
            await getBuffer(path) : fs.existsSync(path) ? 
            fs.readFileSync(path) : Buffer.alloc(0); 
        
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options); 
        } else {
            buffer = await addExif(buff); 
        }
        
        await client.sendMessage(jid, { 
            sticker: { url: buffer }, 
            ...options }, { quoted });
        return buffer;
    };
    
    client.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => { 
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || "";
        let messageType = message.mtype ? message.mtype.replace(/message/gi, "") : mime.split("/")[0];

        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        let type = await FileType.fromBuffer(buffer); 
        let trueFilename = attachExtension ? filename + "." + type.ext : filename;
        await fs.writeFileSync(trueFilename, buffer); 
        
        return trueFilename;
    };

    client.sendVideoAsSticker = async (jid, path, quoted, options = {}) => { 
        let buff = Buffer.isBuffer(path) ? 
            path : /^data:.*?\/.*?;base64,/i.test(path) ?
            Buffer.from(path.split(',')[1], 'base64') : /^https?:\/\//.test(path) ?
            await getBuffer(path) : fs.existsSync(path) ? 
            fs.readFileSync(path) : Buffer.alloc(0);

        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifVid(buff, options); 
        } else {
            buffer = await videoToWebp(buff); 
        }

        await client.sendMessage(jid, {
            sticker: { url: buffer }, 
            ...options }, { quoted });
        return buffer;
    };

    client.getFile = async (path, returnAsFilename) => { 
        let res, filename;
        const data = Buffer.isBuffer(path) ?
              path : /^data:.*?\/.*?;base64,/i.test(path) ?
              Buffer.from(path.split(',')[1], 'base64') : /^https?:\/\//.test(path) ?
              await (res = await fetch(path)).buffer() : fs.existsSync(path) ?
              (filename = path, fs.readFileSync(path)) : typeof path === 'string' ? 
              path : Buffer.alloc(0);
        if (!Buffer.isBuffer(data)) throw new TypeError('result is not a buffer'); 
        const type = await FileType.fromBuffer(data) || { 
            mime: 'application/octet-stream',
            ext: '.bin'
        };
        
        if (data && returnAsFilename && !filename) {
            // Note: On utilise un chemin relatif simple car __dirname n'est pas disponible en ESM.
            (filename = './tmp/' + new Date().getTime() + '.' + type.ext);
            await fs.promises.writeFile(filename, data);
        }
        return {
            res,
            filename,
            ...type,
            data,
            deleteFile() { 
                return filename && fs.promises.unlink(filename);
            }
        };
    };
    
    client.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => { 
        let type = await client.getFile(path, true);
        let { res, data: file, filename: pathfile } = type;
        if (res && res.status !== 200 || file.length <= 65536) {
            try {
                throw { json: JSON.parse(file.toString()) } 
            } catch (e) { if (e.json) throw e.json }
        }
        
        let opt = { filename };
        if (quoted) opt.quoted = quoted;
        if (!type) options.asDocument = true; 
        
        let mtype = '', mimetype = type.mime, convert;
        if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'; 
        else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'; 
        else if (/video/.test(type.mime)) mtype = 'video';
        else if (/audio/.test(type.mime)) {
            mtype = 'audio';
            mimetype = 'audio/ogg; codecs=opus';
        } else mtype = 'document';
        
        if (options.asDocument) mtype = 'document'; 
        
        let message = {
            ...options,
            caption,
            ptt,
            [mtype]: { url: pathfile },
            mimetype
        };
        let m;
        try {
            m = await client.sendMessage(jid, message, {
                ...opt,
                ...options
            });
        } catch (e) {
            console.error("Erreur lors de l'envoi du message avec URL:", e);
            m = null;
        } finally {
            if (!m) m = await client.sendMessage(jid, {
                ...message,
                [mtype]: file
            }, {
                ...opt,
                ...options 
            });
            return m;
        }
    };
    
    return client;
}

clientStart();

const ignoredErrors = [ 
    'socket connection timeout',
    'ekeytype',
    'item-not-found',
    'rate-overlimit',
    'connection closed',
    'timed out',
    'value not found'
];

// Gestion des mises à jour de fichier en ESM : on ne peut pas utiliser require.resolve et require.cache
// Le moyen le plus simple est de forcer un redémarrage si le fichier principal change.
let file = path.resolve(process.argv[1]); 
fs.watchFile(file, () => { 
  console.log(color(`Le fichier ${file} a été modifié, redémarrage du bot...`, 'yellow'));
  process.exit(0); // Quitte le processus pour qu'il soit redémarré par l'hébergeur/PM2
});

process.on('unhandledRejection', reason => {
    if (ignoredErrors.some(e => String(reason).includes(e))) return; 
    console.log('Unhandled Rejection:', reason);
});

const originalConsoleError = console.error; 
console.error = function (msg, ...args) {
    if (typeof msg === 'string' && ignoredErrors.some(e => msg.includes(e))) return;
    originalConsoleError.apply(console, [msg, ...args]);
};

const originalStderrWrite = process.stderr.write; 
process.stderr.write = function (msg, encoding, fd) {
    if (typeof msg === 'string' && ignoredErrors.some(e => msg.includes(e))) return;
    originalStderrWrite.apply(process.stderr, arguments);
};

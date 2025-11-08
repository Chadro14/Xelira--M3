import {
    getContentType,
    jidDecode,
    proto,
    delay
} from "@whiskeysockets/baileys";
import { default as fetch } from "node-fetch";

/**
 * Attente (sleep)
 * @param {Number} ms
 */
export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Obtient le Buffer à partir d'une URL
 * @param {String} url 
 * @param {Object} options 
 */
export const getBuffer = async (url, options) => {
    try {
        options = options || {};
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`Fetch échoué: ${res.statusText}`);
        return res.buffer();
    } catch (e) {
        console.error("Erreur getBuffer:", e);
        return null;
    }
};

/**
 * Simplifie le message (smsg)
 * @param {Object} client 
 * @param {Object} m 
 * @param {Object} store 
 */
export const smsg = (client, m, store) => {
    if (!m) return m;

    let M = proto.WebMessageInfo;
    m = M.fromObject(m);

    // Simplification basique
    m.isGroup = m.key.remoteJid.endsWith('@g.us');
    m.mtype = getContentType(m.message);

    if (m.mtype === 'conversation' || m.mtype === 'extendedTextMessage' || m.mtype === 'imageMessage' || m.mtype === 'videoMessage') {
        m.text = m.message.conversation || m.message?.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || '';
    } else {
        m.text = '';
    }
    
    return m;
};

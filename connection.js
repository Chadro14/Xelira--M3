// connection.js

import * as baileys from "@whiskeysockets/baileys";
import { delay } from "@whiskeysockets/baileys";
// La fonction color sera importée par index.js, mais nous allons créer une fonction simple ici au cas où
const color = (text, color) => text;

/**
 * Gère les événements de connexion (konek)
 * @param {Object} props
 */
export const konek = async ({ client, update, clientStart, DisconnectReason, Boom }) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        console.log(color(`[CLIENT] Connexion fermée. Code: ${reason}`, 'red'));

        if (reason === DisconnectReason.loggedOut) {
            console.log(color("Déconnecté. Veuillez supprimer le dossier de session et redémarrer.", 'red'));
        } else {
            console.log(color("Reconnexion nécessaire, redémarrage du client...", 'yellow'));
            await delay(3000);
            clientStart();
        }
    } else if (connection === 'open') {
        console.log(color('[CLIENT] Connexion réussie au WA.', 'green'));
    }
};

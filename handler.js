// handler.js

/**
 * Gère tous les messages entrants.
 * @param {Object} client L'objet client Baileys
 * @param {Object} m L'objet message simplifié (smsg)
 */
export default async function handler(client, m) {
    // Si ce n'est pas un message ou si c'est le bot lui-même, on ignore.
    if (!m || m.key.fromMe) return;
    
    // Définissez ici votre préfixe (doit être le même que dans config.js)
    const prefix = '.'; 
    const isCmd = m.text.startsWith(prefix);
    const command = isCmd ? m.text.slice(prefix.length).trim().split(' ')[0].toLowerCase() : false;

    if (isCmd) {
        console.log(`[CMD] Commande reçue: ${command}`);
    }

    // Exemple de commande simple
    if (command === 'ping') {
        const uptime = process.uptime();
        // client.sendText est une fonction que nous avons restaurée dans index.js
        await client.sendText(m.chat, `Pong! 🚀\nUptime: ${uptime.toFixed(2)} secondes`, m);
    }
    // Ajoutez ici toutes vos autres commandes
}

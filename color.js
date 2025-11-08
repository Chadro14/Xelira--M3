/**
 * Colore un texte pour la console (version sans dépendance).
 */
export const color = (text, color) => {
    const codes = {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m'
    };

    const code = codes[color] || codes.reset;
    return code + text + codes.reset;
};

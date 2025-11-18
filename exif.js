// exif.js

import { Sticker } from 'wa-sticker-formatter';

// Fonctions pour créer des stickers et ajouter des métadonnées EXIF

export const imageToWebp = async (buffer) => {
    const sticker = new Sticker(buffer, {
        pack: 'FakePack',
        author: 'FakeAuthor',
        type: 'full',
        quality: 100
    });
    return sticker.build();
};

export const videoToWebp = async (buffer) => {
    const sticker = new Sticker(buffer, {
        pack: 'FakePack',
        author: 'FakeAuthor',
        type: 'full',
        quality: 100
    });
    return sticker.build();
};

export const writeExifImg = async (buffer, metadata) => {
    const sticker = new Sticker(buffer, {
        pack: metadata.packname || 'Default Pack',
        author: metadata.author || 'Default Author',
        type: 'full',
        quality: 100
    });
    return sticker.build();
};

export const writeExifVid = async (buffer, metadata) => {
    const sticker = new Sticker(buffer, {
        pack: metadata.packname || 'Default Pack',
        author: metadata.author || 'Default Author',
        type: 'full',
        quality: 100
    });
    return sticker.build();
};

export const addExif = async (buffer, metadata) => {
    return writeExifImg(buffer, metadata || {});
};

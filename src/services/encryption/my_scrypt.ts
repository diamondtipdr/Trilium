"use strict";

import optionService from "../options.js";
import crypto from "crypto";

function getVerificationHash(password: crypto.BinaryLike) {
    const salt = optionService.getOption('passwordVerificationSalt');

    return getScryptHash(password, salt);
}

function getPasswordDerivedKey(password: crypto.BinaryLike) {
    const salt = optionService.getOption('passwordDerivedKeySalt');

    return getScryptHash(password, salt);
}

function getScryptHash(password: crypto.BinaryLike, salt: crypto.BinaryLike) {
    const hashed = crypto.scryptSync(password, salt, 32,
        {N: 16384, r:8, p:1});

    return hashed;
}

export default {
    getVerificationHash,
    getPasswordDerivedKey
};

import { STORAGE_KEYS } from './config.js';

const REDEEMED_KEY = STORAGE_KEYS.redeemedCodes || 'fn_redeemed_codes';
const HIDE_REDEEMED_KEY = STORAGE_KEYS.hideRedeemedCodes || 'fn_hide_redeemed_codes';
const ALERT_SETTING_KEY = STORAGE_KEYS.alertNewCodes || 'fn_alert_new_codes';

let warnedAboutReadFailure = false;
let warnedAboutWriteFailure = false;

function readString(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        if (!warnedAboutReadFailure) {
            warnedAboutReadFailure = true;
            console.warn('Browser storage is unavailable; code redemptions will be temporary.', error);
        }
        return null;
    }
}

function readArray(key) {
    try {
        const value = JSON.parse(readString(key));
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function readBoolean(key, defaultValue = false) {
    const val = readString(key);
    if (val === null) return defaultValue;
    return val === 'true';
}

function write(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (error) {
        if (!warnedAboutWriteFailure) {
            warnedAboutWriteFailure = true;
            console.warn('Unable to save code state; changes will be temporary.', error);
        }
    }
}

export class CodesStore {
    constructor() {
        this.listeners = new Set();
        const redeemedList = readArray(REDEEMED_KEY);
        this.redeemed = new Set(redeemedList.filter(c => typeof c === 'string' && c.trim()));
        this.hideRedeemed = readBoolean(HIDE_REDEEMED_KEY, false);
        this.alertNewCodes = readBoolean(ALERT_SETTING_KEY, true);
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(change = { type: 'all' }) {
        for (const listener of this.listeners) {
            listener(this, change);
        }
    }

    reload() {
        const redeemedList = readArray(REDEEMED_KEY);
        this.redeemed = new Set(redeemedList.filter(c => typeof c === 'string' && c.trim()));
        this.hideRedeemed = readBoolean(HIDE_REDEEMED_KEY, false);
        this.alertNewCodes = readBoolean(ALERT_SETTING_KEY, true);
        this.notify({ type: 'reload' });
    }

    resetAll() {
        this.redeemed.clear();
        this.hideRedeemed = false;
        this.alertNewCodes = true;
        for (const key of [REDEEMED_KEY, HIDE_REDEEMED_KEY, ALERT_SETTING_KEY]) {
            try {
                localStorage.removeItem(key);
            } catch {
                // Ignore storage clearing failures
            }
        }
        this.notify({ type: 'reset-all' });
    }

    isRedeemed(code) {
        return this.redeemed.has(code);
    }

    toggleRedeem(code) {
        if (this.redeemed.has(code)) {
            this.redeemed.delete(code);
        } else {
            this.redeemed.add(code);
        }
        this.persist();
        this.notify({ type: 'redeem-toggle', code });
    }

    redeemAll(codesList) {
        for (const item of codesList) {
            if (item && item.code) {
                this.redeemed.add(item.code);
            }
        }
        this.persist();
        this.notify({ type: 'redeem-all' });
    }

    unredeemAll() {
        this.redeemed.clear();
        this.persist();
        this.notify({ type: 'unredeem-all' });
    }

    setHideRedeemed(value) {
        this.hideRedeemed = Boolean(value);
        write(HIDE_REDEEMED_KEY, String(this.hideRedeemed));
        this.notify({ type: 'setting', name: 'hideRedeemed' });
    }

    setAlertNewCodes(value) {
        this.alertNewCodes = Boolean(value);
        write(ALERT_SETTING_KEY, String(this.alertNewCodes));
        this.notify({ type: 'setting', name: 'alertNewCodes' });
    }

    hasUnredeemed(codesList) {
        return codesList.some(item => item.active && !this.redeemed.has(item.code));
    }

    persist() {
        write(REDEEMED_KEY, [...this.redeemed]);
    }
}

export function hasUnredeemedCodes(codesList) {
    const store = new CodesStore();
    return store.hasUnredeemed(codesList);
}


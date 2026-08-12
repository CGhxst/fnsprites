import { GROUP_METHODS, STATUS_FILTERS, STORAGE_KEYS } from './config.js';

let warnedAboutReadFailure = false;
let warnedAboutWriteFailure = false;

function readString(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        if (!warnedAboutReadFailure) {
            warnedAboutReadFailure = true;
            console.warn('Browser storage is unavailable; tracker changes will be temporary.', error);
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

function readBoolean(key) {
    return readString(key) === 'true';
}

function write(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (error) {
        if (!warnedAboutWriteFailure) {
            warnedAboutWriteFailure = true;
            console.warn('Unable to save tracker state; changes will be temporary.', error);
        }
    }
}

function validSet(values, validIds) {
    return new Set([...new Set(values)].filter(id => validIds.has(id)));
}

export class TrackerStore {
    constructor(validIds) {
        this.validIds = validIds;
        this.listeners = new Set();
        this.viewOnly = false;

        const owned = validSet(readArray(STORAGE_KEYS.owned), validIds);
        const mastered = validSet(readArray(STORAGE_KEYS.mastered), validIds);
        for (const id of mastered) {
            if (!owned.has(id)) mastered.delete(id);
        }

        const legacyGroupSetting = readString('fn_state_group_theme');
        const legacySort = legacyGroupSetting === 'true' ? 'theme' : 'season';
        const savedSort = readString(STORAGE_KEYS.sort) || legacySort;
        const storedStatus = readString(STORAGE_KEYS.status);
        const savedStatus = storedStatus === 'obtained' ? 'owned' : storedStatus;

        const savedSeasonRaw = readString(STORAGE_KEYS.season);
        let seasonFilter = null;
        if (savedSeasonRaw && savedSeasonRaw !== 'all' && savedSeasonRaw !== '"all"' && savedSeasonRaw !== 'sprite' && savedSeasonRaw !== 'season') {
            try {
                const parsed = JSON.parse(savedSeasonRaw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const valid = parsed.filter(s => s && s !== 'all' && s !== 'sprite' && s !== 'season');
                    seasonFilter = valid.length > 0 ? new Set(valid) : null;
                } else if (typeof parsed === 'string' && parsed !== 'all' && parsed !== 'sprite' && parsed !== 'season') {
                    seasonFilter = new Set([parsed]);
                }
            } catch {
                if (typeof savedSeasonRaw === 'string' && savedSeasonRaw !== 'all' && savedSeasonRaw !== 'sprite' && savedSeasonRaw !== 'season') {
                    seasonFilter = new Set([savedSeasonRaw]);
                }
            }
        }

        this.state = {
            owned,
            mastered,
            filters: {
                search: readString(STORAGE_KEYS.search) || '',
                theme: readString(STORAGE_KEYS.theme) || 'all',
                season: seasonFilter,
                status: STATUS_FILTERS.includes(savedStatus) ? savedStatus : 'all',
            },
            settings: {
                hideMastered: readBoolean(STORAGE_KEYS.hideMastered),
                showUnreleased: readBoolean(STORAGE_KEYS.showUnreleased),
                lowFidelity: readBoolean(STORAGE_KEYS.lowFidelity),
                group: GROUP_METHODS.includes(savedSort) ? savedSort : 'season',
            },
        };
    }

    isSeasonSelected(season) {
        if (!this.state.filters.season || this.state.filters.season === 'all') return true;
        if (typeof this.state.filters.season.has === 'function') {
            if (this.state.filters.season.size === 0 || this.state.filters.season.has('all')) return true;
            return this.state.filters.season.has(season);
        }
        return true;
    }

    toggleSeason(season, active, allSeasons = []) {
        if (this.state.filters.season === null) {
            this.state.filters.season = new Set(allSeasons);
        }
        if (active) {
            this.state.filters.season.add(season);
        } else {
            this.state.filters.season.delete(season);
        }
        this.persistSeasonFilter();
        this.notify({ type: 'filter', name: 'season' });
    }

    selectAllSeasons() {
        this.state.filters.season = null;
        this.persistSeasonFilter();
        this.notify({ type: 'filter', name: 'season' });
    }

    clearSeasons() {
        this.state.filters.season = new Set();
        this.persistSeasonFilter();
        this.notify({ type: 'filter', name: 'season' });
    }

    persistSeasonFilter() {
        if (this.viewOnly) return;
        if (this.state.filters.season === null) {
            write(STORAGE_KEYS.season, 'all');
        } else {
            write(STORAGE_KEYS.season, [...this.state.filters.season]);
        }
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(change = { type: 'all' }) {
        for (const listener of this.listeners) listener(this.state, change);
    }

    isOwned(id) {
        return this.state.owned.has(id);
    }

    isMastered(id) {
        return this.state.mastered.has(id);
    }

    toggleOwned(id) {
        if (this.viewOnly || !this.validIds.has(id)) return;
        if (this.state.owned.has(id)) {
            this.state.owned.delete(id);
            this.state.mastered.delete(id);
        } else {
            this.state.owned.add(id);
        }
        this.persistCollection();
        this.notify({ type: 'collection', id, field: 'owned' });
    }

    toggleMastered(id) {
        if (this.viewOnly || !this.state.owned.has(id)) return;
        if (this.state.mastered.has(id)) this.state.mastered.delete(id);
        else this.state.mastered.add(id);
        this.persistCollection();
        this.notify({ type: 'collection', id, field: 'mastered' });
    }

    setFilter(name, value) {
        if (!(name in this.state.filters)) return;
        if (name === 'season') {
            if (value === 'all' || value === null) {
                this.state.filters.season = null;
            } else if (Array.isArray(value)) {
                this.state.filters.season = new Set(value);
            } else if (typeof value === 'string') {
                this.state.filters.season = new Set(value.split(',').map(s => s.trim()).filter(Boolean));
            }
            this.persistSeasonFilter();
            this.notify({ type: 'filter', name: 'season' });
            return;
        }
        this.state.filters[name] = value;
        const key = {
            search: STORAGE_KEYS.search,
            theme: STORAGE_KEYS.theme,
            status: STORAGE_KEYS.status,
        }[name];
        if (!this.viewOnly && key) write(key, value);
        this.notify({ type: 'filter', name });
    }

    setSetting(name, value) {
        if (!(name in this.state.settings)) return;
        this.state.settings[name] = value;
        const key = {
            hideMastered: STORAGE_KEYS.hideMastered,
            showUnreleased: STORAGE_KEYS.showUnreleased,
            lowFidelity: STORAGE_KEYS.lowFidelity,
            group: STORAGE_KEYS.sort,
        }[name];
        if (!this.viewOnly) write(key, value);
        this.notify({ type: 'setting', name });
    }

    replaceCollection(ownedIds, masteredIds, { viewOnly = false } = {}) {
        const owned = validSet(ownedIds, this.validIds);
        const mastered = validSet(masteredIds, this.validIds);
        for (const id of mastered) {
            if (!owned.has(id)) mastered.delete(id);
        }
        this.state.owned = owned;
        this.state.mastered = mastered;
        this.viewOnly = viewOnly;
        if (!viewOnly) this.persistCollection();
        this.notify({ type: 'collection-replaced' });
    }

    snapshot() {
        return {
            version: 2,
            owned: [...this.state.owned],
            mastered: [...this.state.mastered],
        };
    }

    persistCollection() {
        write(STORAGE_KEYS.owned, [...this.state.owned]);
        write(STORAGE_KEYS.mastered, [...this.state.mastered]);
    }
}

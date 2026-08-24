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
                if (Array.isArray(parsed)) {
                    const valid = parsed.filter(s => typeof s === 'string' && s !== 'all' && s !== 'sprite' && s !== 'season');
                    seasonFilter = new Set(valid);
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
                openExports: readBoolean(STORAGE_KEYS.openExports),
                group: GROUP_METHODS.includes(savedSort) ? savedSort : 'season',
            },
        };
    }

    isSeasonSelected(season) {
        if (!season) return true;
        if (this.state.filters.season === null) return true;
        return this.state.filters.season.has(season);
    }

    toggleSeason(season, selected, allSeasons = []) {
        if (this.state.filters.season === null) {
            this.state.filters.season = new Set(allSeasons);
        }
        if (selected) {
            this.state.filters.season.add(season);
        } else {
            this.state.filters.season.delete(season);
        }
        if (allSeasons.length > 0 && this.state.filters.season.size === allSeasons.length) {
            this.state.filters.season = null;
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

    notify(change) {
        for (const listener of this.listeners) {
            try {
                listener(this.state, change);
            } catch (error) {
                console.error('Tracker listener failed.', error);
            }
        }
    }

    isOwned(id) {
        return this.state.owned.has(id);
    }

    isMastered(id) {
        return this.state.mastered.has(id);
    }

    toggleOwned(id) {
        if (this.viewOnly || !this.validIds.has(id)) return;
        const owned = !this.state.owned.has(id);
        if (owned) {
            this.state.owned.add(id);
        } else {
            this.state.owned.delete(id);
            this.state.mastered.delete(id);
        }
        this.persistCollection();
        this.notify({ type: 'collection', id, field: 'owned', owned, mastered: this.state.mastered.has(id) });
    }

    toggleMastered(id) {
        if (this.viewOnly || !this.validIds.has(id)) return;
        if (!this.state.owned.has(id)) return;
        const mastered = !this.state.mastered.has(id);
        if (mastered) this.state.mastered.add(id);
        else this.state.mastered.delete(id);
        this.persistCollection();
        this.notify({ type: 'collection', id, field: 'mastered', owned: true, mastered });
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
            openExports: STORAGE_KEYS.openExports,
            group: STORAGE_KEYS.sort,
        }[name];
        if (!this.viewOnly && key) write(key, value);
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

    resetAll() {
        if (this.viewOnly) return;
        this.state.owned.clear();
        this.state.mastered.clear();
        this.state.filters = {
            search: '',
            theme: 'all',
            season: null,
            status: 'all',
        };
        this.state.settings = {
            hideMastered: false,
            showUnreleased: false,
            lowFidelity: false,
            openExports: false,
            group: 'season',
        };

        for (const key of Object.values(STORAGE_KEYS)) {
            try {
                localStorage.removeItem(key);
            } catch {
                // Ignore storage clearing failures
            }
        }

        this.notify({ type: 'all' });
    }
}

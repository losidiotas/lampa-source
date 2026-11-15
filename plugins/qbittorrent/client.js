import { ajax, torrentHash } from "./helpers";

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeCollection(previous = {}, updates = {}, removed = []) {
    const result = {...(previous || {})};

    for (const [key, value] of Object.entries(updates || {})) {
        result[key] = isObject(result[key]) && isObject(value)
            ? {...result[key], ...value}
            : (isObject(value) ? {...value} : value);
    }

    for (const key of removed || []) {
        delete result[key];
    }

    return result;
}

function mergeList(previous = [], added = [], removed = []) {
    const result = new Set(previous || []);
    for (const value of added || []) {
        result.add(value);
    }
    for (const value of removed || []) {
        result.delete(value);
    }
    return Array.from(result);
}

function fullMainData(data) {
    return {
        ...(data || {}),
        torrents: mergeCollection({}, data && data.torrents),
        torrents_removed: [],
        categories: mergeCollection({}, data && data.categories),
        categories_removed: [],
        tags: Array.from((data && data.tags) || []),
        tags_removed: [],
        trackers: mergeCollection({}, data && data.trackers),
        trackers_removed: [],
        server_state: {...((data && data.server_state) || {})},
    };
}

function mergeMainData(previous, update) {
    if (!previous || (update && update.full_update === true)) {
        return fullMainData(update);
    }

    return {
        ...previous,
        ...(update || {}),
        full_update: false,
        torrents: mergeCollection(previous.torrents, update && update.torrents, update && update.torrents_removed),
        torrents_removed: [],
        categories: mergeCollection(previous.categories, update && update.categories, update && update.categories_removed),
        categories_removed: [],
        tags: mergeList(previous.tags, update && update.tags, update && update.tags_removed),
        tags_removed: [],
        trackers: mergeCollection(previous.trackers, update && update.trackers, update && update.trackers_removed),
        trackers_removed: [],
        server_state: {
            ...(previous.server_state || {}),
            ...((update && update.server_state) || {}),
        },
    };
}

class QBittorrentClient {
    #appVersion = 0.0
    #mainDataRid = 0
    #mainData = null
    #mainDataSyncPromise = null

    constructor(url) {
        this.url = url;
    }

    async load() {
        let version = await this.appVersion()
        this.#appVersion = parseFloat(version.replace(/[^\d.]/g, ''));
    }

    /**
     * @param contentType {string?}
     * @returns object
     */
    #headers(contentType) {
        let headers = {};
        if (contentType) {
            headers['Content-Type'] = contentType;
        }

        return headers
    }

    /**
     * @returns {Promise<MainData>}
     */
    async syncMainData() {
        if (!this.#mainDataSyncPromise) {
            this.#mainDataSyncPromise = this.#syncMainData();
        }

        const currentSync = this.#mainDataSyncPromise;
        try {
            return await currentSync;
        } finally {
            if (this.#mainDataSyncPromise === currentSync) {
                this.#mainDataSyncPromise = null;
            }
        }
    }

    async #syncMainData() {
        let params = {
            url: `${this.url}/api/v2/sync/maindata`,
            method: 'GET',
            timeout: 30000,
            headers: this.#headers(),
            data: {
                rid: this.#mainDataRid
            },
        }

        const update = await ajax(params);
        const mainData = mergeMainData(this.#mainData, update);
        const responseRid = Number(update && update.rid);

        if (Number.isInteger(responseRid) && responseRid >= 0) {
            this.#mainDataRid = responseRid;
        }
        this.#mainData = mainData;

        return mainData;
    }

    /**
     * @returns {Promise<string>}
     */
    async appVersion() {
        let params = {
            url: `${this.url}/api/v2/app/version`,
            method: 'GET',
            timeout: 0,
            headers: this.#headers(),
        }

        return ajax(params);
    }

    /**
     * @param command {object}
     * @param torrent {TorrentDescription}
     * @returns {Promise<any>}
     */
    async SendCommand(command, torrent) {
        if (this.#appVersion < 5) {
            if (command.action === 'start') {
                command.action = 'resume';
            }
            if (command.action === 'stop') {
                command.action = 'pause';
            }
        }

        let data = {
            hashes: torrentHash(torrent),
        }

        if (command.deleteFiles) {
            data.deleteFiles = 'true'
        } else {
            if (command.action === 'delete') {
                data.deleteFiles = ''
            }
        }

        let params = {
            url: `${this.url}/api/v2/torrents/${command.action}`,
            method: 'POST',
            timeout: 0,
            headers: this.#headers('application/x-www-form-urlencoded'),
            data: data
        }

        return ajax(params);
    }

    /**
     * @param torrent {TorrentDescription}
     * @param tags {string[]}
     * @returns {Promise<any>}
     */
    async addTags(torrent, tags) {
        let params = {
            url: `${this.url}/api/v2/torrents/addTags`,
            method: 'POST',
            headers: this.#headers('application/x-www-form-urlencoded'),
            data: {
                hashes: torrentHash(torrent),
                tags: tags.join(',')
            }
        }

        return ajax(params);
    }

    /**
     * @param torrent {TorrentDescription}
     * @param tags {string[]}
     * @returns {Promise<any>}
     */
    async removeTags(torrent, tags) {
        let params = {
            url: `${this.url}/api/v2/torrents/removeTags`,
            method: 'POST',
            headers: this.#headers('application/x-www-form-urlencoded'),
            data: {
                hashes: torrentHash(torrent),
                tags: tags.join(',')
            }
        }

        return ajax(params);
    }

    /**
     * @param selectedTorrent {object}
     * @param tags {string[]}
     * @param options {object}
     * @returns {Promise<*>}
     */
    async addTorrent(selectedTorrent, tags, options) {
        let params = {
            url: `${this.url}/api/v2/torrents/add`,
            method: 'POST',
            timeout: 0,
            headers: this.#headers('application/x-www-form-urlencoded'),
            data: {
                urls: selectedTorrent.MagnetUri ? selectedTorrent.MagnetUri : selectedTorrent.Link,
                tags: tags.join(','),
                category: options.category ? options.category : '',
                savepath: options.savepath ? options.savepath : '',
                sequentialDownload: options.sequentialDownload ? "true" : "false",
                firstLastPiecePrio: options.firstLastPiecePrio ? "true" : "false"
            }
        }

        return ajax(params);
    };

    /**
     * @param tag
     * @returns {Promise<TorrentDescription[]>}
     */
    async findByTag(tag) {
        let params = {
            url: `${this.url}/api/v2/torrents/info`,
            method: 'GET',
            timeout: 0,
            data: {
                tag: tag
            }
        }

        return ajax(params);
    }

    async files(hash) {
        let params = {
            url: `${this.url}/api/v2/torrents/files`,
            method: 'GET',
            timeout: 0,
            data: {
                hash: hash
            }
        }

        return ajax(params);
    }

    async filePrio(hash, ids, priority) {
        let params = {
            url: `${this.url}/api/v2/torrents/filePrio`,
            method: 'POST',
            timeout: 0,
            headers: this.#headers('application/x-www-form-urlencoded'),
            data: {
                hash: hash,
                id: ids.join('|'),
                priority: priority
            }
        }

        return ajax(params);
    }
}

export {
    QBittorrentClient,
    mergeMainData,
};

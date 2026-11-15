import { ajax, torrentHash } from "./helpers";

class QBittorrentClient {
    #appVersion = 0.0

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
     * @param rid {Number?}
     * @returns {Promise<MainData>}
     */
    async syncMainData(rid) {
        let params = {
            url: `${this.url}/api/v2/sync/maindata`,
            method: 'GET',
            timeout: 30000,
            headers: this.#headers(),
            data: {
                rid: rid ?? 0
            },
        }

        return ajax(params);
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
    QBittorrentClient
};

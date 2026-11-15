import { QBittorrentClient } from "../client";
import { TMDBClient } from "../tmdb";
import { HeaderComponent } from "./header";
import { qbtTranslate } from "../lang";
import { TorrentComponent } from "./torrent";
import { QBittorrentPlugin as QBittorrent } from "../qbittorrent";
import { TorrentMenu } from "./torrent_menu";
import { escapeHtml, isTorrentMetadataTag, normalizeTorrentMetadata, parseTorrentTags, torrentHash } from "../helpers";

const expandedTorrentClass = 'qbittorrent-plugin__row--expanded';
const compactModeClass = 'qbittorrent-plugin--compact';
const compactModeStorageKey = 'qbtCompactMode';
const sortModeStorageKey = 'qbtSortMode';
const sortModeDate = 'date';
const sortModeTitle = 'title';

class MainComponent {
    activity = undefined
    active = undefined
    last = undefined
    html = $("<div data-qbittorrent-plugin class='qbittorrent-plugin'></div>")
    head = $("<div class='qbittorrent-plugin__head'></div>");
    body = $('<div class="qbittorrent-plugin__catalog"></div>');

    /**
     * @type {QBittorrentClient}
     */
    qbittorrent = new QBittorrentClient(Lampa.Storage.field('qbtApiURL'))

    /**
     * @type {TMDBClient}
     */
    tmdb = new TMDBClient()

    items = [];
    /**
     * @type {TorrentComponent}
     */
    torrentsComponentMap = {}
    destroyed = false
    autoUpdateTimeout = null
    syncPromise = null

    scroll = new Lampa.Scroll({
        mask: true,
        over: true,
        step: 250
    });

    constructor() {
    }

    async create() {
        try {
            await this.qbittorrent.load()
            let data = await this.qbittorrent.syncMainData()
            await this.buildUI(data)
        } catch (e) {
            if (this.destroyed) {
                return;
            }

            Lampa.Noty.show(escapeHtml(e && e.message ? e.message : String(e)))
            this.renderError(e)
            this.activity.loader(false)
            this.activity.toggle()
        }
    }

    start() {
        if (Lampa.Activity.active().activity !== this.activity) {
            return;
        }

        this.background();
        Lampa.Controller.add('content', {
            toggle: () => {
                Lampa.Controller.collectionSet(this.scroll.render(false));
                Lampa.Controller.collectionFocus(this.last || false, this.scroll.render(false));
            },
            left: () => {
                // if (Lampa.Controller.enabled().name !== 'content') {
                //     return
                // }
                if (Navigator.canmove('left')) {
                    Navigator.move('left');
                } else {
                    Lampa.Controller.toggle('menu');
                }
            },
            right: () => {
                // if (Lampa.Controller.enabled().name !== 'content') {
                //     return
                // }

                Navigator.move('right');
            },
            up: () => {
                // if (Lampa.Controller.enabled().name !== 'content') {
                //     return
                // }

                if (Navigator.canmove('up')) {
                    Navigator.move('up');
                } else {
                    Lampa.Controller.toggle('head');
                }
            },
            down: () => {
                // if (Lampa.Controller.enabled().name !== 'content') {
                //     return
                // }

                if (Navigator.canmove('down')) {
                    Navigator.move('down');
                }
            },
            back: this.back
        });
        Lampa.Controller.toggle('content');
    };

    render() {
        return this.html;
    };

    background() {
        Lampa.Background.immediately('');
    };

    back() {
        Lampa.Activity.backward();
    };

    /**
     * @param data {MainData}
     */
    async buildUI(data) {
        if (this.destroyed) {
            return;
        }

        this.scroll.minus(undefined);

        // Assemble UI
        this.renderHeader(data);
        this.setCompactMode(Lampa.Storage.get(compactModeStorageKey, false), false);
        this.setSortMode(Lampa.Storage.get(sortModeStorageKey, sortModeDate), false);
        await this.renderTorrentsList(data);
        if (this.destroyed) {
            return;
        }

        this.scroll.append(this.head);
        this.scroll.append(this.body);
        this.html.append(this.scroll.render());
        this.activity.loader(false);
        this.activity.toggle();

        // Start auto-update
        await this.startAutoUpdate();
    }

    async startAutoUpdate() {
        const client = this.qbittorrent;

        const update = async () => {
            if (this.destroyed) {
                return;
            }

            try {
                await this.syncTorrents(client);
            } catch (e) {
                if (!this.destroyed) {
                    console.error('[QBT]', 'Auto update', e);
                }
            } finally {
                if (!this.destroyed) {
                    this.autoUpdateTimeout = setTimeout(update, 3000);
                }
            }
        };

        this.autoUpdateTimeout = setTimeout(update, 3000);
    }

    async syncTorrents(client = this.qbittorrent) {
        if (!this.syncPromise) {
            this.syncPromise = (async () => {
                const data = await client.syncMainData();
                if (!this.destroyed) {
                    await this.updateTorrents(data);
                }
                return data;
            })();
        }

        const currentSync = this.syncPromise;
        try {
            return await currentSync;
        } finally {
            if (this.syncPromise === currentSync) {
                this.syncPromise = null;
            }
        }
    }

    async updateTorrents(maindata) {
        if (this.destroyed) {
            return;
        }

        const torrents = maindata.torrents || {};
        for (let hash in this.torrentsComponentMap) {
            if (!torrents[hash]) {
                this.removeTorrent(hash)
            }
        }

        for (let hash in torrents) {
            if (this.destroyed) {
                return;
            }

            let torrent = torrents[hash];
            torrent.hash = torrentHash(torrent, hash);
            let component = this.torrentsComponentMap[hash];
            if (!component) {
                await this.addNewTorrent(torrent, hash)

                if (this.destroyed) {
                    return;
                }

                // to fix focus
                Lampa.Controller.toggle('content');
                Lampa.Controller.toggle('content');
            } else {
                component.update(torrent, component.metadata)
            }
        }

        this.sortTorrentComponents();
    }

    /**
     * @param torrent {TorrentDescription}
     */
    async addNewTorrent(torrent, fallbackHash = '') {
        const hash = torrentHash(torrent, fallbackHash);
        torrent.hash = hash;
        let item = await this.createTorrentComponent(torrent)

        if (this.destroyed) {
            item.destroy();
            return;
        }

        this.body.append(item.render());
        this.items.push(item);
        this.torrentsComponentMap[hash] = item;
        this.sortTorrentComponents();
        this.scroll.update(item.render(), true);
    }

    /**
     * @param hash {string}
     */
    removeTorrent(hash) {
        let component = this.torrentsComponentMap[hash];
        if (!component || !this.items) {
            return;
        }

        const activeItem = this.items[this.active];
        const index = this.items.indexOf(component);
        if (index < 0) {
            delete this.torrentsComponentMap[hash];
            return;
        }

        component.destroy()
        this.items.splice(index, 1);

        if (activeItem === component) {
            this.active = Math.min(index, this.items.length - 1);
        } else {
            const activeIndex = this.items.indexOf(activeItem);
            this.active = activeIndex >= 0 ? activeIndex : 0;
        }

        delete this.torrentsComponentMap[hash];

        const nextItem = this.items[this.active];
        if (nextItem) {
            this.last = nextItem.render()[0];
            this.scroll.update(nextItem.render(), true);
        }
    }

    /**
     * @param data {MainData}
     */
    renderHeader(data) {
        let item = new HeaderComponent(data);
        let $item = item.render();
        $item.on('hover:focus', () => {
            this.last = $item[0];
            this.active = this.items.indexOf(item);
            this.scroll.update(this.items[this.active].render(), true);
        });

        // Add click handler for the update button
        $item.find('[data-qbt-refresh]').on('hover:enter', async () => {
            Lampa.Loading.start(() => {}, qbtTranslate('LoadingPleaseWait'));
            try {
                const data = await this.syncTorrents();
                if (!data || this.destroyed) {
                    return;
                }
                this.head.find('[data-qbt-free-space]').html(
                    Lampa.Utils.bytesToSize(data.server_state.free_space_on_disk)
                );
                Lampa.Noty.show(qbtTranslate('Reloaded'));
            } catch (e) {
                console.error('[QBT]', 'Refresh', e);
                Lampa.Noty.show(escapeHtml(e && e.message ? e.message : String(e)));
            } finally {
                Lampa.Loading.stop();
            }
        });

        $item.find('[data-qbt-compact]').on('hover:enter', () => {
            this.setCompactMode(!this.html.hasClass(compactModeClass));
        });

        const sortButton = $item.find('[data-qbt-sort]');
        sortButton.on('hover:enter', () => {
            this.setSortMode(this.sortMode === sortModeTitle ? sortModeDate : sortModeTitle);
            Navigator.focus(sortButton[0]);
            this.last = sortButton[0];
            this.active = 0;
            this.scroll.immediate(this.head, false);
            Lampa.Layer.visible(this.scroll.render(true));
        });

        this.head.append($item);
        this.items.push(item);
    }

    setCompactMode(enabled, save = true) {
        this.html.toggleClass(compactModeClass, enabled);
        this.head.find('[data-qbt-compact]').html(qbtTranslate(enabled ? 'FullView' : 'Compact'));

        if (!enabled) {
            this.body.find(`.${expandedTorrentClass}`).removeClass(expandedTorrentClass);
        }

        if (save) {
            Lampa.Storage.set(compactModeStorageKey, enabled);
        }
    }

    setSortMode(mode, save = true) {
        this.sortMode = mode === sortModeTitle ? sortModeTitle : sortModeDate;
        this.head.find('[data-qbt-sort]').html(qbtTranslate(
            this.sortMode === sortModeTitle ? 'SortAlphabetically' : 'SortByDateAdded'
        ));

        if (save) {
            Lampa.Storage.set(sortModeStorageKey, this.sortMode);
        }

        this.sortTorrentComponents(!save);
    }

    torrentDisplayTitle(component) {
        const metadata = component.metadata || {};
        return String(metadata.title || metadata.name || component.torrent.name || '');
    }

    compareTorrentComponents(first, second) {
        const titleComparison = this.torrentDisplayTitle(first).localeCompare(
            this.torrentDisplayTitle(second),
            Lampa.Storage.get('language', 'ru'),
            {sensitivity: 'base', numeric: true}
        );

        if (this.sortMode === sortModeTitle) {
            return titleComparison || second.torrent.added_on - first.torrent.added_on;
        }

        return second.torrent.added_on - first.torrent.added_on || titleComparison;
    }

    sortTorrentComponents(preserveActive = true) {
        if (!this.items || !this.items.length) {
            return;
        }

        const header = this.items[0];
        const currentItems = this.items.slice(1);
        const sortedItems = currentItems.slice().sort(this.compareTorrentComponents.bind(this));
        const orderChanged = sortedItems.some((item, index) => item !== currentItems[index]);

        if (!orderChanged) {
            return;
        }

        const activeItem = preserveActive ? this.items[this.active] : null;
        sortedItems.forEach((item) => this.body.append(item.render()));
        this.items = [header].concat(sortedItems);

        if (activeItem) {
            this.active = this.items.indexOf(activeItem);
            this.scroll.update(activeItem.render(), true);
        }
    }

    /**
     * @param data {MainData}
     */
    async renderTorrentsList(data) {
        const torrents = Object.entries(data.torrents || {});

        for (const [fallbackHash, torrent] of torrents) {
            const hash = torrentHash(torrent, fallbackHash);
            torrent.hash = hash;
            const item = await this.createTorrentComponent(torrent);
            if (this.destroyed) {
                item.destroy();
                return;
            }
            this.body.append(item.render());
            this.items.push(item);
            this.torrentsComponentMap[hash] = item;
        }

        this.sortTorrentComponents();
    }

    /**
     * @param torrent {TorrentDescription}
     * @param metadata {object}
     */
    rerenderTorrent(torrent, metadata) {
        const hash = torrentHash(torrent);
        let existItem = this.html.find(`#qbittorrent-plugin-torrent-${hash}`);
        let component = this.torrentsComponentMap[hash];
        if (!existItem.length || !component) {
            return;
        }
        let wasExpanded = existItem.hasClass(expandedTorrentClass);
        let newItem = new TorrentComponent(torrent, metadata).render();
        let newHtml = newItem.html()
        existItem.removeClass()
        existItem.addClass(newItem.attr('class'))
        existItem.toggleClass(expandedTorrentClass, wasExpanded)
        existItem.html(newHtml);
        component.metadata = metadata;
        this.sortTorrentComponents();
        Navigator.focus(existItem[0])
        this.scroll.update(this.items[this.active].render(), true);
    }

    /**
     * @param err {Error}
     */
    renderError(err) {
        console.error(err)
        const message = err && err.message ? err.message : JSON.stringify(err);
        this.html.append($('<div></div>').text(`Что-то пошло не так: ${message || String(err)}`))
    }

    destroy() {
        this.destroyed = true;
        if (this.autoUpdateTimeout) {
            clearTimeout(this.autoUpdateTimeout);
        }
        if (this.items) {
            Lampa.Arrays.destroy(this.items);
        }
        this.scroll.destroy();
        this.html.remove();
        this.items = [];
        this.torrentsComponentMap = {};
    }

    async saveTorrentMetadata(torrent, metadata) {
        let db = await QBittorrent.database()
        const hash = torrentHash(torrent);
        const normalizedMetadata = normalizeTorrentMetadata(metadata);

        return db.rewriteData('metadata', hash, {
            hash: hash,
            tmdb_id: normalizedMetadata.id,
            media_type: normalizedMetadata.media_type,
            overview: normalizedMetadata.overview,
            title: normalizedMetadata.title,
            poster_path: normalizedMetadata.poster_path,
            vote_average: normalizedMetadata.vote_average,
            vote_count: normalizedMetadata.vote_count,
            popularity: normalizedMetadata.popularity,
            release_date: normalizedMetadata.release_date,
            updated_at: Date.now()
        })
    }

    async recoverMetadataFromTags(torrent) {
        let tag = this.getTorrentTag(torrent)

        if (!tag) {
            return null
        }

        let response = await TMDBClient.getMetadata(tag)
        if (!response) {
            return null
        }

        await this.saveTorrentMetadata(torrent, response);

        return response
    }

    /**
     * @param torrent {TorrentDescription}
     * @returns {string}
     */
    getTorrentTag(torrent) {
        return parseTorrentTags(torrent.tags).find(isTorrentMetadataTag);
    }

    async createTorrentComponent(torrent) {
        let db = await QBittorrent.database()
        const hash = torrentHash(torrent);

        let metadata
        try {
            metadata = await db.getData('metadata', hash)
        } catch (e) {
            metadata = null
            console.warn('[QBT]', 'Read metadata', e);
        }

        if (metadata === null && torrent.tags) {
            try {
                metadata = await this.recoverMetadataFromTags(torrent)
            } catch (e) {
                console.error('[QBT]', "recover metadata", e);
            }
        }

        let item = new TorrentComponent(torrent, metadata);
        let showMenu = () => {
            TorrentMenu.show(item.torrent, {
                full: true,
                onMetadataUpdated: (metadata) => {
                    item.metadata = metadata
                    this.rerenderTorrent(item.torrent, metadata);
                }
            })
        };

        item.render().on('hover:focus', () => {
            if (this.destroyed) {
                return;
            }

            this.last = item.render()[0];
            this.active = this.items.indexOf(item);
            if (this.active >= 0) {
                this.scroll.update(this.items[this.active].render(), true);
            }
        }).on('hover:enter', () => {
            if (this.html.hasClass(compactModeClass)) {
                item.render().toggleClass(expandedTorrentClass);
                this.scroll.update(item.render(), true);
            } else {
                showMenu();
            }
        }).on('hover:long', showMenu);

        return item;
    }
}

export {
    MainComponent
}

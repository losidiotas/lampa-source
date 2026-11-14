import { QBittorrentClient } from "../client";
import { TMDBClient } from "../tmdb";
import { HeaderComponent } from "./header";
import { qbtTranslate } from "../lang";
import { TorrentComponent } from "./torrent";
import { QBittorrentPlugin, QBittorrentPlugin as QBittorrent } from "../qbittorrent";
import { TorrentMenu } from "./torrent_menu";

const expandedTorrentClass = 'qbittorrent-plugin__row--expanded';
const compactModeClass = 'qbittorrent-plugin--compact';
const compactModeStorageKey = 'qbtCompactMode';

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
            Lampa.Noty.show(e)
            this.renderError(e)
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
        this.scroll.minus(undefined);

        // Assemble UI
        this.renderHeader(data);
        this.setCompactMode(Lampa.Storage.get(compactModeStorageKey, false), false);
        await this.renderTorrentsList(data);
        this.scroll.append(this.head);
        this.scroll.append(this.body);
        this.html.append(this.scroll.render());
        this.activity.loader(false);
        this.activity.toggle();

        // Start auto-update
        await this.startAutoUpdate();
    }

    async startAutoUpdate() {
        let client = await QBittorrentPlugin.client();
        this.autoUpdateInterval = setInterval(async () => {
            let maindata = await client.syncMainData()
            for (let hash in this.torrentsComponentMap) {
                if (!maindata.torrents[hash]) {
                    this.removeTorrent(hash)
                }
            }

            for (let hash in maindata.torrents) {
                let torrent = maindata.torrents[hash];
                let component = this.torrentsComponentMap[hash];
                if (!component) {
                    await this.addNewTorrent(torrent)

                    // to fix focus
                    Lampa.Controller.toggle('content');
                    Lampa.Controller.toggle('content');
                } else {
                    component.update(torrent, component.metadata)
                }
            }
        }, 3000)
    }

    /**
     * @param torrent {TorrentDescription}
     */
    async addNewTorrent(torrent) {
        let item = await this.createTorrentComponent(torrent)

        this.body.append(item.render());
        this.items.push(item);
        this.torrentsComponentMap[torrent.infohash_v1] = item;
        this.scroll.update(item.render(), true);
    }

    /**
     * @param hash {string}
     */
    removeTorrent(hash) {
        let component = this.torrentsComponentMap[hash];
        component.destroy()
        let index = this.items.indexOf(component);
        this.items.splice(index, 1);
        if (this.active === index) {
            this.active = this.active - 1;
            if (this.active < 0) {
                this.active = 0;
            }
        }

        this.scroll.update(this.items[this.active].render(), true);
        delete this.torrentsComponentMap[hash];
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
        $item.find('[data-qbt-refresh]').on('hover:enter', () => {
            Lampa.Activity.replace({
                url: '',
                title: 'qBittorrent',
                component: 'qbittorrentPanel',
                page: 1
            });
            Lampa.Noty.show(qbtTranslate('Reloaded'));
        });

        $item.find('[data-qbt-compact]').on('hover:enter', () => {
            this.setCompactMode(!this.html.hasClass(compactModeClass));
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

    /**
     * @param data {MainData}
     */
    async renderTorrentsList(data) {
        const torrents = Object.values(data.torrents)
            .sort((a, b) => b.added_on - a.added_on);

        for (const torrent of torrents) {
            const item = await this.createTorrentComponent(torrent);
            this.body.append(item.render());
            this.items.push(item);
            this.torrentsComponentMap[torrent.infohash_v1] = item;
        }
    }

    /**
     * @param torrent {TorrentDescription}
     * @param metadata {object}
     */
    rerenderTorrent(torrent, metadata) {
        let existItem = this.html.find(`#qbittorrent-plugin-torrent-${torrent.infohash_v1}`);
        let wasExpanded = existItem.hasClass(expandedTorrentClass);
        let newItem = new TorrentComponent(torrent, metadata).render();
        let newHtml = newItem.html()
        existItem.removeClass()
        existItem.addClass(newItem.attr('class'))
        existItem.toggleClass(expandedTorrentClass, wasExpanded)
        existItem.html(newHtml);
        Navigator.focus(existItem[0])
        this.scroll.update(this.items[this.active].render(), true);
    }

    /**
     * @param err {Error}
     */
    renderError(err) {
        console.error(err)
        this.html.append(`<div>Что-то пошло не так: ${JSON.stringify(err)}</div>`)
    }

    destroy() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
        }
        Lampa.Arrays.destroy(this.items);
        this.scroll.destroy();
        this.html.remove();
        this.items = null;
    }

    async saveTorrentMetadata(torrent, metadata) {
        let db = await QBittorrent.database()

        return db.rewriteData('metadata', torrent.infohash_v1, {
            hash: torrent.infohash_v1,
            tmdb_id: metadata.id,
            media_type: metadata.media_type,
            overview: metadata.overview,
            title: metadata.title,
            poster_path: metadata.poster_path,
            vote_average: metadata.vote_average,
            vote_count: metadata.vote_count,
            popularity: metadata.popularity,
            release_date: metadata.release_date,
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
        let tags = torrent.tags.split(',');
        return tags.find((tag) => {
            return /^(tv|movie)\/\d+$/.test(tag);
        });
    }

    async createTorrentComponent(torrent) {
        let db = await QBittorrent.database()

        let metadata
        try {
            metadata = await db.getData('metadata', torrent.infohash_v1)
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
            this.last = item.render()[0];
            this.active = this.items.indexOf(item);
            this.scroll.update(this.items[this.active].render(), true);
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

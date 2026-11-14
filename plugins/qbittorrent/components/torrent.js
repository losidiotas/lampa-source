import { qbtTranslate } from "../lang";
import { ucfirst } from "../helpers";
import { TMDBClient } from "../tmdb";

class TorrentComponent {
    /**
     * @param torrent {TorrentDescription}
     * @param metadata {object}
     */
    constructor(torrent, metadata) {
        this.torrent = torrent;
        this.metadata = metadata || {};
        const metaTitle = metadata.title || metadata.name || '';

        this.item = Lampa.Template.get('qbtTorrentRow', {
            title: metaTitle,
            name: torrent.name,
            hash: torrent.infohash_v1,
            totalSize: Lampa.Utils.bytesToSize(torrent.total_size),
            origState: torrent.state,
            state: qbtTranslate(ucfirst(torrent.state)),
            dlspeed: Lampa.Utils.bytesToSize(torrent.dlspeed * 8, true),
            progress: (torrent.progress * 100).toFixed(2),
            numSeeds: torrent.num_seeds,
            numLeechs: torrent.num_leechs,
            overview: this.metadata.overview || '',
            release_date: this.metadata.release_date ? this.metadata.release_date.substring(0, 4) : '',
            poster: TMDBClient.posterURL(this.metadata.poster_path),
            modificators: [
                metadata ? 'qbittorrent-plugin__row--has-metadata' : '',
                metadata && metaTitle === torrent.name ? 'qbittorrent-plugin__row--hide-name' : '',
                metadata && metaTitle.length > 0 ? 'qbittorrent-plugin__row--has-title' : '',
            ].join(' '),
            secLabel: qbtTranslate('Second'),
            seedsLabel: qbtTranslate('SeedsLabel'),
            leechsLabel: qbtTranslate('LeechsLabel'),
            sizeLabel: qbtTranslate('SizeLabel'),
            stateLabel: qbtTranslate('StateLabel'),
            progressLabel: qbtTranslate('ProgressLabel'),
            speedLabel: qbtTranslate('Speed'),
        });
    }

    render() {
        return this.item;
    }

    destroy() {
        this.item.remove();
    };

    /**
     * @param torrent {TorrentDescription}
     * @param metadata {object}
     */
    update(torrent, metadata) {
        const metaTitle = metadata.title || metadata.name || '';

        let patches = [
            {"field": "name", "method": "html", "value": torrent.name},
            {"field": "totalSize", "method": "html", "value": Lampa.Utils.bytesToSize(torrent.total_size)},
            {"field": "state", "method": "html", "value": qbtTranslate(ucfirst(torrent.state))},
            {"field": "progress", "method": "html", "value": (torrent.progress * 100).toFixed(2)},
            {"field": "numSeeds", "method": "html", "value": torrent.num_seeds},
            {"field": "numLeechs", "method": "html", "value": torrent.num_leechs},
            {"field": "title", "method": "html", "value": metaTitle},
            {"field": "overview", "method": "html", "value": metadata.overview || ''},
            {
                "field": "releaseDate",
                "method": "html",
                "value": metadata.release_date ? metadata.release_date.substring(0, 4) : ''
            },
            {
                "field": "poster",
                "method": "html",
                "value": metadata.poster_path ? TMDBClient.posterURL(metadata.poster_path) : './img/img_load.svg'
            },
            {"field": "dlspeed", "method": "html", "value": Lampa.Utils.bytesToSize(torrent.dlspeed * 8, true)},
            {
                "field": "dlspeed-container",
                "method": "class",
                "class": "downloading",
                "value": torrent.state === 'downloading'
            },
            {"field": "footer", "method": "class", "class": "downloading", "value": torrent.state === 'downloading'},
        ];

        for (let patch of patches) {
            let element = this.render().find(`[data-qbittorrent-filed="${patch.field}"]`)
            switch (patch.method) {
                case "html":
                    element.html(patch.value);
                    break
                case "class":
                    if (patch.value) {
                        element.get(0).classList.add(patch.class);
                    } else {
                        element.get(0).classList.remove(patch.class);
                    }
                    break
            }
        }

        if (!metadata) {
            this.render().get(0).classList.remove("qbittorrent-plugin__row--has-metadata")
        } else {
            this.render().get(0).classList.add("qbittorrent-plugin__row--has-metadata")

            if (metaTitle.length > 0) {
                this.render().get(0).classList.add("qbittorrent-plugin__row--has-title")
            } else {
                this.render().get(0).classList.remove("qbittorrent-plugin__row--has-title")
            }
            if (metaTitle === torrent.name) {
                this.render().get(0).classList.add("qbittorrent-plugin__row--hide-name")
            }
        }

        this.torrent = torrent
        this.metadata = metadata
    };
}

export {
    TorrentComponent
}
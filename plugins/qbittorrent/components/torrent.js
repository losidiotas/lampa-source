import { qbtTranslate } from "../lang";
import { escapeHtml, torrentHash, ucfirst } from "../helpers";
import { TMDBClient } from "../tmdb";

function isUploading(torrent) {
    return torrent.state === 'uploading' || torrent.state === 'forcedUP';
}

class TorrentComponent {
    /**
     * @param torrent {TorrentDescription}
     * @param metadata {object}
     */
    constructor(torrent, metadata) {
        this.torrent = torrent;
        this.metadata = metadata || null;
        const normalizedMetadata = metadata || {};
        const metaTitle = normalizedMetadata.title || normalizedMetadata.name || '';

        this.item = Lampa.Template.get('qbtTorrentRow', {
            title: escapeHtml(metaTitle),
            name: escapeHtml(torrent.name),
            hash: escapeHtml(torrentHash(torrent)),
            totalSize: Lampa.Utils.bytesToSize(torrent.total_size),
            origState: torrent.state,
            uploadState: isUploading(torrent) ? 'uploading' : '',
            state: escapeHtml(qbtTranslate(ucfirst(torrent.state))),
            dlspeed: Lampa.Utils.bytesToSize(torrent.dlspeed * 8, true),
            upspeed: Lampa.Utils.bytesToSize(torrent.upspeed * 8, true),
            progress: (torrent.progress * 100).toFixed(2),
            numSeeds: torrent.num_seeds,
            numLeechs: torrent.num_leechs,
            overview: escapeHtml(normalizedMetadata.overview || ''),
            release_date: normalizedMetadata.release_date ? escapeHtml(normalizedMetadata.release_date.substring(0, 4)) : '',
            poster: escapeHtml(TMDBClient.posterURL(normalizedMetadata.poster_path)),
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
        const hasMetadata = !!metadata;
        const normalizedMetadata = metadata || {};
        const metaTitle = normalizedMetadata.title || normalizedMetadata.name || '';

        let patches = [
            {"field": "name", "method": "text", "value": torrent.name},
            {"field": "totalSize", "method": "text", "value": Lampa.Utils.bytesToSize(torrent.total_size)},
            {"field": "state", "method": "text", "value": qbtTranslate(ucfirst(torrent.state))},
            {"field": "progress", "method": "text", "value": (torrent.progress * 100).toFixed(2)},
            {"field": "numSeeds", "method": "text", "value": torrent.num_seeds},
            {"field": "numLeechs", "method": "text", "value": torrent.num_leechs},
            {"field": "title", "method": "text", "value": metaTitle},
            {"field": "overview", "method": "text", "value": normalizedMetadata.overview || ''},
            {
                "field": "releaseDate",
                "method": "text",
                "value": normalizedMetadata.release_date ? normalizedMetadata.release_date.substring(0, 4) : ''
            },
            {
                "field": "poster",
                "method": "attr",
                "value": normalizedMetadata.poster_path ? TMDBClient.posterURL(normalizedMetadata.poster_path) : './img/img_load.svg'
            },
            {"field": "dlspeed", "method": "text", "value": Lampa.Utils.bytesToSize(torrent.dlspeed * 8, true)},
            {"field": "upspeed", "method": "text", "value": Lampa.Utils.bytesToSize(torrent.upspeed * 8, true)},
            {
                "field": "dlspeed-container",
                "method": "class",
                "class": "downloading",
                "value": torrent.state === 'downloading'
            },
            {
                "field": "upspeed-container",
                "method": "class",
                "class": "uploading",
                "value": isUploading(torrent)
            },
            {"field": "footer", "method": "class", "class": "downloading", "value": torrent.state === 'downloading'},
            {"field": "footer", "method": "class", "class": "uploading", "value": isUploading(torrent)},
        ];

        for (let patch of patches) {
            let element = this.render().find(`[data-qbittorrent-filed="${patch.field}"]`)
            if (!element.length) {
                continue;
            }

            switch (patch.method) {
                case "text":
                    element.text(patch.value);
                    break
                case "attr":
                    element.attr('src', patch.value);
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

        if (!hasMetadata) {
            this.render().get(0).classList.remove("qbittorrent-plugin__row--has-metadata")
            this.render().get(0).classList.remove("qbittorrent-plugin__row--has-title")
            this.render().get(0).classList.remove("qbittorrent-plugin__row--hide-name")
        } else {
            this.render().get(0).classList.add("qbittorrent-plugin__row--has-metadata")

            if (metaTitle.length > 0) {
                this.render().get(0).classList.add("qbittorrent-plugin__row--has-title")
            } else {
                this.render().get(0).classList.remove("qbittorrent-plugin__row--has-title")
            }
            if (metaTitle === torrent.name) {
                this.render().get(0).classList.add("qbittorrent-plugin__row--hide-name")
            } else {
                this.render().get(0).classList.remove("qbittorrent-plugin__row--hide-name")
            }
        }

        this.torrent = torrent
        this.metadata = metadata || null
    };
}

export {
    TorrentComponent
}

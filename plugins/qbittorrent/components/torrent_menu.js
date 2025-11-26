import { QBittorrentPlugin as QBittorrent, QBittorrentPlugin } from "../qbittorrent";
import { qbtTranslate } from "../lang";
import { lampaEditor } from "../helpers";
import { TMDBClient } from "../tmdb";

class TorrentMenu {
    static show(torrent, params) {
        let enabled = Lampa.Controller.enabled().name;
        let menuItems = []

        if (QBittorrentPlugin.isDLNAEnabled()) {
            menuItems.push({
                title: qbtTranslate('PlayDLNA'),
                action: 'play-dlna'
            })
        }

        switch (torrent.state) {
            case 'pausedDL':
            case 'pausedUP':
                menuItems.push({
                    title: qbtTranslate('Start'),
                    action: 'start'
                })
                break
            default:
                menuItems.push({
                    title: qbtTranslate('Stop'),
                    action: 'stop'
                })
        }

        // menuItems.push({
        //     title: qbtTranslate('ChangeFilesPriority'),
        //     action: 'file-prio',
        // })

        if (params.full) {
            menuItems.push({
                title: qbtTranslate('UpdateMetadata'),
                action: 'update-metadata',
            })
        }

        menuItems.push({
            title: qbtTranslate('Delete'),
            action: 'delete'
        })

        menuItems.push({
            title: qbtTranslate('FullDelete'),
            action: 'delete',
            deleteFiles: true,
        })

        Lampa.Select.show({
            title: torrent.name,
            items: menuItems,
            onBack: function onBack() {
                let currentController = Lampa.Controller.enabled();
                if (currentController && currentController.name !== enabled) {
                    Lampa.Controller.toggle(enabled);
                } else {
                    Lampa.Controller.toggle('menu');
                }
            },
            onSelect: (btn) => {
                try {
                    let currentController = Lampa.Controller.enabled();
                    if (currentController && currentController.name !== enabled) {
                        Lampa.Controller.toggle(enabled);
                    } else {
                        Lampa.Controller.toggle('content');
                    }
                } catch (e) {
                    console.error(e);
                }

                switch (btn.action) {
                    case 'play-dlna':
                        return TorrentMenu.playVideoDLNA(torrent).catch(() => {
                            Lampa.Controller.toggle('content');
                        })
                    case 'update-metadata':
                        return TorrentMenu.updateMetadata(torrent).then((metadata) => {
                            Lampa.Noty.show(qbtTranslate('MetaUpdateSuccess'));
                            if (params.onMetadataUpdated) {
                                params.onMetadataUpdated(metadata);
                            }
                        }).catch((e) => {
                            console.error('[QBT]', 'update-metadata', e);
                            Lampa.Noty.show(qbtTranslate('MetaUpdateFailed'));
                        });
                    case 'file-prio':
                        return TorrentMenu.showFilesPriorityMenu(torrent).then(() => {
                            Lampa.Noty.show(qbtTranslate('SuccessAction'));
                        }).catch((e) => {
                            console.error('[QBT]', 'file-prio', e);
                            Lampa.Noty.show(qbtTranslate('FailedToGetFileList'));
                        })
                    default:
                        return TorrentMenu.handleTorrentAction(btn, torrent).then(() => {
                            Lampa.Noty.show(qbtTranslate('SuccessAction'));
                        }).catch((e) => {
                            console.error('[QBT]', btn.action, e);
                            Lampa.Noty.show(qbtTranslate('FailedAction'));
                        });
                }
            }
        });
    }

    /**
     * @param command {object}
     * @param torrent {TorrentDescription}
     */
    static async handleTorrentAction(command, torrent) {
        let client = await QBittorrentPlugin.client()
        return client.SendCommand(command, torrent);
    }

    /**
     * @param torrent {TorrentDescription}
     */
    static  async playVideoDLNA(torrent) {
        let client = await QBittorrentPlugin.client()
        let files = await client.files(torrent.infohash_v1)

        if (!files || !files.length) {
            Lampa.Noty.show(qbtTranslate('NoFilesInTorrent'));
            return
        }

        let downloadedFiles = files.filter(file => file.progress === 1)
        if (!downloadedFiles || !downloadedFiles.length) {
            Lampa.Noty.show(qbtTranslate('NoDownloadedFilesInTorrent'));
            return
        }

        let protocol = window.location.protocol;
        let host = window.location.host;
        let mappingPath = Lampa.Storage.get('qbtLampacDLNAMappingPath', '');
        if (files.length === 1) {
            let path = `${torrent.save_path}/${files[0].name}`.replace(mappingPath, '')
            let video = {
                title: torrent.name,
                url: `${protocol}//${host}/dlna/stream?path=${encodeURIComponent(path)}`,
                subtitles: [],
                timeline: Lampa.Timeline.view(Lampa.Utils.hash(path)),
            };

            Lampa.Player.play(video);
            Lampa.Player.playlist([video]);
            return
        }

        let items = downloadedFiles.map((file, index) => {
            return {
                title: file.name,
                checkbox: true,
                index: index,
                checked: true
            };
        });

        return new Promise((resolve, reject) => {
            Lampa.Select.show({
                title: qbtTranslate('ChooseFileForPlay'),
                fullsize: true,
                items: [
                    {
                        title: qbtTranslate('Play'),
                    },
                    ...items,
                ],
                onSelect: () => {
                    let playlist = []
                    for (let item of items) {
                        if (item.checked) {
                            let file = downloadedFiles[item.index];
                            let path = `${torrent.save_path}/${file.name}`.replace(mappingPath, '')
                            let video = {
                                title: file.name,
                                url: `${protocol}//${host}/dlna/stream?path=${encodeURIComponent(path)}`,
                                subtitles: [],
                                timeline: Lampa.Timeline.view(Lampa.Utils.hash(path)),
                            };
                            playlist.push(video);
                        }
                    }

                    Lampa.Player.play(playlist[0]);
                    Lampa.Player.playlist(playlist);
                },
                onBack: function onBack() {
                    return reject('canceled by user');
                }
            });
        })
    }

    /**
     * @param torrent {TorrentDescription}
     */
    static async updateMetadata(torrent) {
        let tmdb = new TMDBClient()
        let enabled = Lampa.Controller.enabled().name;

        let cleanName = await lampaEditor({
            title: "Введите название фильма для поиска в TMDB",
            free: true,
            nosave: true,
            nomic: true,
            value: TMDBClient.cleanTorrentName(torrent.name),
        })
        try {
            let currentController = Lampa.Controller.enabled();
            if (currentController && currentController.name !== enabled) {
                Lampa.Controller.toggle(enabled);
            } else {
                Lampa.Controller.toggle('content');
            }
        } catch (e) {
            console.error('[QBT]', 'Change controller', e);
        }

        if (!cleanName) {
            return Promise.reject('empty input');
        }

        let response = await tmdb.searchMulti(cleanName)
        if (!response || !response.results || !response.results.length) {
            return Promise.reject('No results found');
        }

        let metadata = response.results[0];
        if (response.results.length > 1) {
            let choice = await TorrentMenu.handleMultipleTMDBResults(response.results)
            metadata = choice.result;
        }

        await TorrentMenu.saveTorrentMetadata(torrent, metadata)
        await TorrentMenu.saveTorrentTag(torrent, `${metadata.media_type}/${metadata.id}`)

        return metadata
    }

    static handleMultipleTMDBResults(results) {
        return new Promise(function (resolve, reject) {
            let enabled = Lampa.Controller.enabled().name;

            // Format menu items with title and date information
            let menuItems = results.map(function (result) {
                return {
                    title: "".concat(result.title || result.name, " (").concat(result.media_type, ")") + (result.media_type === 'tv' && result.first_air_date ? " - ".concat(result.first_air_date) : '') + (result.media_type === 'movie' && result.release_date ? " - ".concat(result.release_date) : ''),
                    result: result,
                    id: result.id
                };
            });

            // Show selection menu
            Lampa.Select.show({
                title: qbtTranslate('SelectResult'),
                items: menuItems,
                onBack: function onBack() {
                    try {
                        let currentController = Lampa.Controller.enabled();
                        if (currentController && currentController.name !== enabled) {
                            Lampa.Controller.toggle(enabled);
                        } else {
                            Lampa.Controller.toggle('menu');
                        }
                    } catch (e) {
                        console.error(e);
                    }

                    reject(new Error('Selection canceled by user'));
                },
                onSelect: function onSelect(selected) {
                    Lampa.Controller.toggle('content');

                    resolve({
                        result: selected.result,
                        id: selected.id
                    });
                }
            });
        });
    }

    static async saveTorrentMetadata(torrent, metadata) {
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

    static async saveTorrentTag(torrent, tag) {
        let tags = torrent.tags.split(',');
        for (let i in tags) {
            tags[i] = tags[i].trim()
        }

        let newTags = tags.filter((tag) => {
            return !/^(tv|movie)\/\d+$/.test(tag);
        });

        newTags.push(tag)

        let client = await QBittorrentPlugin.client()
        return client.addTags(torrent, newTags)
    }

    static async showFilesPriorityMenu(torrent) {
        let client = await QBittorrentPlugin.client()
        let files = await client.files(torrent.infohash_v1)
        console.log('[QBT]', 'showFilesPriorityMenu', torrent)
        console.log('[QBT]', 'files', files)
    }
}


export {
    TorrentMenu,
}
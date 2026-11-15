import { QBittorrentPlugin as QBittorrent, QBittorrentPlugin } from "../qbittorrent";
import { qbtTranslate } from "../lang";
import {
    escapeHtml,
    isTorrentStopped,
    isTorrentMetadataTag,
    lampaEditor,
    normalizeTorrentMetadata,
    parseTorrentTags,
    replaceTorrentMetadataTag,
    torrentHash
} from "../helpers";
import { TMDBClient } from "../tmdb";

function encodePathPreserveSlashes(p) {
    return p
        .split('/')                 // сохраняем структуру папок
        .map(encodeURIComponent)    // кодируем опасные символы внутри сегмента
        .join('/');
}

const tickSvg = `<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.89163 13.2687L9.16582 17.5427L18.7085 8" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

class TorrentMenu {
    static show(torrent, params) {
        let enabled = Lampa.Controller.enabled().name;
        let menuItems = []

        if (QBittorrentPlugin.isNginxEnabled()) {
            menuItems.push({
                title: qbtTranslate('PlayNGINX'),
                action: 'play-nginx'
            })
        }

        if (QBittorrentPlugin.isDLNAEnabled()) {
            menuItems.push({
                title: qbtTranslate('PlayDLNA'),
                action: 'play-dlna'
            })
        }

        if (isTorrentStopped(torrent.state)) {
            menuItems.push({
                title: qbtTranslate('Start'),
                action: 'start'
            })
        } else {
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
            title: escapeHtml(torrent.name),
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
                    case 'play-nginx':
                        return TorrentMenu.playVideoNginx(torrent).catch(() => {
                            Lampa.Controller.toggle('content');
                        })
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

    static async playVideoStream(torrent, urlGenerator) {
        let client = await QBittorrentPlugin.client()
        let files = await client.files(torrentHash(torrent))
        files = files.sort((a, b) => {
            return a.name.localeCompare(b.name);
        })

        if (!files || !files.length) {
            Lampa.Noty.show(qbtTranslate('NoFilesInTorrent'));
            return
        }

        let downloadedFiles = files.filter(file => file.progress === 1)
        if (!downloadedFiles || !downloadedFiles.length) {
            Lampa.Noty.show(qbtTranslate('NoDownloadedFilesInTorrent'));
            return
        }

        if (files.length === 1) {
            let url = urlGenerator(`${torrent.save_path}/${files[0].name}`)
            let video = {
                title: escapeHtml(torrent.name),
                url: url,
                subtitles: [],
                timeline: Lampa.Timeline.view(Lampa.Utils.hash(url)),
            };

            Lampa.Player.play(video);
            Lampa.Player.playlist([video]);
            return
        }

        let firstUnwatchedIndex = -1

        let timelines = []
        let items = downloadedFiles.map((file, index) => {
            let url = urlGenerator(`${torrent.save_path}/${file.name}`)
            let hash = Lampa.Utils.hash(url)
            let timeline = Lampa.Timeline.view(hash)
            if (firstUnwatchedIndex === -1 && timeline.percent < 100) {
                firstUnwatchedIndex = index
            }
            timelines[index] = timeline

            return {
                title: `${timeline.percent === 100 ? '<span class="qbt-watched-icon">✔ </span>': ''}${escapeHtml(file.name)} (${timeline.percent}%)`,
                onSelect: () => {
                    let video = {
                        title: escapeHtml(file.name),
                        url: url,
                        subtitles: [],
                        timeline: timeline,
                    };

                    Lampa.Player.play(video);
                    Lampa.Player.playlist([video]);
                }
            };
        });
        let btnTitle = 'PlayAll'
        if (firstUnwatchedIndex === -1) {
            firstUnwatchedIndex = 0
        }

        if (firstUnwatchedIndex > 0 || timelines[0].percent > 0) {
            btnTitle = 'ResumePlay'
        }

        return new Promise((resolve, reject) => {
            Lampa.Select.show({
                title: qbtTranslate('ChooseFileForPlay'),
                fullsize: true,
                items: [
                    {
                        title: qbtTranslate(btnTitle),
                        onSelect: () => {
                            let playlist = downloadedFiles.map((file) => {
                                let url = urlGenerator(`${torrent.save_path}/${file.name}`)
                                let hash = Lampa.Utils.hash(url)
                                let timeline = Lampa.Timeline.view(hash)

                                return {
                                    title: escapeHtml(file.name),
                                    url: url,
                                    subtitles: [],
                                    timeline: timeline,
                                }
                            });


                            // console.log("firstUnwatchedIndex", firstUnwatchedIndex);
                            // console.log("playlist", playlist);
                            let video = {
                                title: playlist[firstUnwatchedIndex].title,
                                url: playlist[firstUnwatchedIndex].url,
                                subtitles: [],
                                timeline: playlist[firstUnwatchedIndex].timeline,
                                playlist: playlist,
                            };

                            Lampa.Player.play(video);
                            Lampa.Player.playlist(playlist);
                        }
                    },
                    ...items,
                ],
                onBack: function onBack() {
                    return reject('canceled by user');
                }
            });
        })
    }

    static async playVideoNginx(torrent) {
        let nginxUrl = Lampa.Storage.get('qbtNginxURL', '');

        return TorrentMenu.playVideoStream(torrent, function (file) {
            return `${nginxUrl}/${encodePathPreserveSlashes(file)}`
        })
    }

    static async playVideoDLNA(torrent) {
        let protocol = window.location.protocol;
        let host = window.location.host;
        let mappingPath = Lampa.Storage.get('qbtLampacDLNAMappingPath', '');

        return TorrentMenu.playVideoStream(torrent, function (file) {
            let path = file.replace(mappingPath, '')

            return `${protocol}//${host}/dlna/stream?path=${encodeURIComponent(path)}`
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
                const title = `${result.title || result.name || ''} (${result.media_type || ''})` +
                    (result.media_type === 'tv' && result.first_air_date ? ` - ${result.first_air_date}` : '') +
                    (result.media_type === 'movie' && result.release_date ? ` - ${result.release_date}` : '');
                return {
                    title: escapeHtml(title),
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

    static async saveTorrentTag(torrent, tag) {
        const tags = parseTorrentTags(torrent.tags);
        const obsoleteTags = tags.filter((existingTag) => {
            return isTorrentMetadataTag(existingTag) && existingTag !== tag;
        });
        const updatedTags = replaceTorrentMetadataTag(tags, tag);
        let client = await QBittorrentPlugin.client()

        if (!tags.includes(tag)) {
            await client.addTags(torrent, [tag]);
        }
        if (obsoleteTags.length) {
            await client.removeTags(torrent, obsoleteTags);
        }

        torrent.tags = updatedTags.join(',');
    }

    static async showFilesPriorityMenu(torrent) {
        let client = await QBittorrentPlugin.client()
        let files = await client.files(torrentHash(torrent))
        console.log('[QBT]', 'showFilesPriorityMenu', torrent)
        console.log('[QBT]', 'files', files)
    }
}


export {
    TorrentMenu,
}

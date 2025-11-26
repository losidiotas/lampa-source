import { qbtTranslate } from "../lang";
import { QBittorrentPlugin } from "../qbittorrent";
import { ajax, magnetExactTopic } from "../helpers";
import { TorrentMenu } from "./torrent_menu";

function listener(e) {
    if (e.type !== 'onlong') {
        return;
    }

    let selectedTorrent = e.element;
    if (!selectedTorrent) {
        return
    }

    let movie = Lampa.Activity.active().movie
    if (!movie || !movie.id) {
        return
    }

    let type = movie.first_air_date ? "tv" : "movie"
    let tag = `${type}/${movie.id}`
    let enabled = Lampa.Controller.enabled().name;

    e.menu.push({
        title: `<div class="qbittorrent-plugin-download-button">${qbtTranslate('AddToqBittorrent')}</div>`,
        onSelect: async () => {
            Lampa.Loading.start(() => {}, qbtTranslate('LoadingPleaseWait'));
            let alreadyAddedTorrent = await findAlreadyAddedTorrent(selectedTorrent)
            Lampa.Loading.stop();

            if (alreadyAddedTorrent) {
                Lampa.Noty.show(qbtTranslate('AlreadyAddedTorrent'));
                await TorrentMenu.show(alreadyAddedTorrent, {
                    full: false,
                })
                return
            }

            if (!QBittorrentPlugin.isDLNAEnabled()) {
                Lampa.Loading.start(() => {}, qbtTranslate('LoadingPleaseWait'));
                try {
                    await simpleAddTorrent(selectedTorrent, tag, getDownloadOptions(type))
                    Lampa.Noty.show(qbtTranslate('TorrentAdded'));
                } catch (e) {
                    console.error('[QBT]', 'simpleAddTorrent', e);
                    Lampa.Noty.show(qbtTranslate('FailedToAddTorrent'));
                }
                Lampa.Loading.stop();

                return
            }

            Lampa.Select.show({
                title: qbtTranslate('Action'),
                items: [
                    {
                        title: qbtTranslate('AllFiles'),
                        action: 'all'
                    },
                    {
                        title: qbtTranslate('ChooseFiles'),
                        action: 'select'
                    }
                ],
                onSelect: async (btn) => {
                    switch (btn.action) {
                        case 'all':
                            Lampa.Loading.start(() => {}, qbtTranslate('LoadingPleaseWait'));
                            try {
                                await simpleAddTorrent(selectedTorrent, tag, getDownloadOptions(type))
                                Lampa.Noty.show(qbtTranslate('TorrentAdded'));
                            } catch (e) {
                                console.error('[QBT]', 'simpleAddTorrent', e);
                                Lampa.Noty.show(qbtTranslate('FailedToAddTorrent'));
                            }
                            Lampa.Loading.stop();
                            break
                        case 'select':
                            Lampa.Loading.start(    () => {}, qbtTranslate('LoadingPleaseWait'));
                            let skipPriority = [];
                            let normalPriority = [];
                            try {
                                let mask = await selectFiles(selectedTorrent, tag);
                                for (let i = 0; i < mask.length; i++) {
                                    if (mask[i] !== 1) {
                                        skipPriority.push(i);
                                    } else {
                                        normalPriority.push(i);
                                    }
                                }
                                Lampa.Loading.stop();
                            } catch (e) {
                                Lampa.Loading.stop();
                                Lampa.Controller.toggle('content');
                                console.error('[QBT]', 'selectFiles', e);
                                Lampa.Noty.show(qbtTranslate('FailedToGetFileList'));
                                return
                            }

                            Lampa.Loading.start(() => {}, qbtTranslate('LoadingPleaseWait'));
                            try {
                                let res = await addTorrentAndSetPriority(selectedTorrent, tag, getDownloadOptions(type), skipPriority, normalPriority);
                                console.log('[QBT]', 'addTorrentAndSetPriority result', res);
                                Lampa.Loading.stop();
                                if (res.prioritySet) {
                                    Lampa.Noty.show(qbtTranslate('TorrentAdded'));
                                } else {
                                    Lampa.Noty.show(qbtTranslate('TorrentAddedWithoutFilesPriority'));
                                }
                            } catch (e) {
                                Lampa.Loading.stop();
                                console.error('[QBT]', 'addTorrentAndSetPriority', e);
                                Lampa.Noty.show(qbtTranslate('FailedToAddTorrent'));
                            }

                            break
                    }
                    Lampa.Controller.toggle(enabled);
                },
                onBack: function onBack() {
                    Lampa.Controller.toggle(enabled);
                }
            });
        }
    });
}

async function selectFiles(torrent) {
    let protocol = window.location.protocol;
    let host = window.location.host;
    let magnet = torrent.MagnetUri ? torrent.MagnetUri : torrent.Link
    let params = {
        url: `${protocol}//${host}/dlna/tracker/show`,
        method: "GET",
        timeout: 30000, // 30s
        data: {
            path: magnet
        }
    }

    let files = await ajax(params)
    Lampa.Loading.stop();

    if (!files.length) {
        return Promise.reject('failed to get files list');
    }

    let items = files.map((file, index) => {
        return {
            title: file.path,
            checkbox: true,
            index: index,
            checked: true
        };
    });

    return new Promise((resolve, reject) => {
        Lampa.Select.show({
            title: qbtTranslate('ChooseFiles'),
            fullsize: true,
            items: [
                {
                    title: qbtTranslate('StartDownloading'),
                },
                ...items,
            ],
            onSelect: () => {
                let mask = [];
                let noFilesSelected = true
                for (let item of items) {
                    mask.push(item.checked ? 1 : 0);
                    if (item.checked) {
                        noFilesSelected = false;
                    }
                }

                if (noFilesSelected) {
                    return reject('no files selected');
                }

                resolve(mask);
            },
            onBack: function onBack() {
                return reject('canceled by user');
            }
        });
    })
}



/**
 * @param torrent
 * @param tag
 * @param options
 * @param skipPriority
 * @param normalPriority
 * @returns {Promise<*|{added: boolean, prioritySet: boolean}>}
 */
async function addTorrentAndSetPriority(torrent, tag, options, skipPriority, normalPriority) {
    let client = await QBittorrentPlugin.client()

    let addResponse = await client.addTorrent(torrent, [tag], options)
    console.log('[QBT]', 'torrent add response', addResponse);

    let found = await client.findByTag(tag)
    if (!found || !found.length) {
        return Promise.reject('failed to find added torrent, no torrents found by tag');
    }

    let magnet = torrent.MagnetUri ? torrent.MagnetUri : torrent.Link
    let topic = magnetExactTopic(magnet);

    let our = found.find((i) => {
        let foundedTopic = magnetExactTopic(i.magnet_uri);
        return foundedTopic === topic;
    })

    if (!our) {
        console.error('[QBT]', 'failed to find added torrent, no torrent with same magnet uri');
        return Promise.reject('failed to find added torrent, no torrent with same magnet uri');
    }

    let result = {
        added: true,
        prioritySet : false
    }

    try {
        let maxTries = 20;
        let timeout = 500;
        let filePrio = async (files, tryNumber, priority) => {
            try {
                await client.filePrio(our.infohash_v1, files, priority)
            } catch (e) {
                if (e.responseText === 'Torrent\'s metadata has not yet downloaded') {
                    if (tryNumber < maxTries) {
                        console.log('[QBT]', 'not ready yet, wait', timeout);
                        await wait(timeout)
                        await filePrio(tryNumber+1)
                    } else {
                        console.error('[QBT]', 'filePrio out of retries', e);
                    }
                } else {
                    console.error('[QBT]', 'addTorrentAndSetPriority.filePrio', e);
                }
            }
        }

        console.log('[QBT]', 'send filePrio request')
        await filePrio(skipPriority, 0, 0)
        await filePrio(normalPriority, 0, 1)
        result.prioritySet = true;
    } catch (e) {
        console.error('[QBT]', 'addTorrentAndSetPriority', e);
    }

    return result;
}

async function simpleAddTorrent(torrent, tag, options) {
    let client = await QBittorrentPlugin.client()

    await client.addTorrent(torrent, [tag], options)
}

function wait(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function getDownloadOptions(mediaType) {
    return {
        savepath: Lampa.Storage.field(mediaType === 'tv' ? 'qbtTvDownloadPath' : 'qbtMoviesDownloadPath'),
        category: Lampa.Storage.field(mediaType === 'tv' ? 'qbtTvCategory' : 'qbtMoviesCategory'),
        sequentialDownload: Lampa.Storage.field('qbtSequentialDownload'),
        firstLastPiecePrio: Lampa.Storage.field('qbtFirstLastPiecePrio'),
    }
}

async function findAlreadyAddedTorrent(torrent) {
    let client = await QBittorrentPlugin.client()

    let data = await client.syncMainData()
    console.log(data)
    if (!data) {
        return Promise.reject('failed to load main data');
    }

    console.log(data.torrents)

    if (!data.torrents) {
        return null
    }


    let magnet = torrent.MagnetUri ? torrent.MagnetUri : torrent.Link
    let topic = magnetExactTopic(magnet);
    for (let hash in data.torrents) {
        let existTopic = magnetExactTopic(data.torrents[hash].magnet_uri);
        if (existTopic === topic) {
            return data.torrents[hash];
        }
    }

    return null
}

class TorrentButton {
    static show() {
        Lampa.Listener.follow('torrent', listener);
    }

    static hide() {
        Lampa.Listener.remove('torrent', listener);
    }
}

export {
    TorrentButton
}


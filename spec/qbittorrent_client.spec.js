import { afterEach, expect, suite, test, vi } from 'vitest'

import { QBittorrentClient, mergeMainData } from '../plugins/qbittorrent/client'

function ajaxResponses(responses) {
    const requests = []

    globalThis.$ = {
        ajax: vi.fn((options) => {
            requests.push(options)
            const response = responses.shift()
            const request = {
                done(callback) {
                    callback(response)
                    return request
                },
                fail() {
                    return request
                },
            }
            return request
        }),
    }

    return requests
}

afterEach(() => {
    delete globalThis.$
})

suite('qBittorrent main data sync', () => {
    test('merges partial torrent fields and applies removed entries', () => {
        const previous = {
            rid: 1,
            full_update: true,
            torrents: {
                first: {name: 'First', state: 'uploading', upspeed: 1},
                removed: {name: 'Removed'},
            },
            categories: {
                movies: {name: 'movies', savePath: '/old'},
                removed: {name: 'removed'},
            },
            tags: ['old', 'keep'],
            trackers: {old: ['first']},
            server_state: {free_space_on_disk: 100, up_info_speed: 1},
        }

        const result = mergeMainData(previous, {
            rid: 2,
            torrents: {
                first: {upspeed: 50},
                second: {name: 'Second', state: 'downloading'},
            },
            torrents_removed: ['removed'],
            categories: {movies: {savePath: '/new'}},
            categories_removed: ['removed'],
            tags: ['new'],
            tags_removed: ['old'],
            trackers_removed: ['old'],
            server_state: {up_info_speed: 50},
        })

        expect(result.torrents.first).toEqual({name: 'First', state: 'uploading', upspeed: 50})
        expect(result.torrents.second).toEqual({name: 'Second', state: 'downloading'})
        expect(result.torrents.removed).toBeUndefined()
        expect(result.categories.movies).toEqual({name: 'movies', savePath: '/new'})
        expect(result.categories.removed).toBeUndefined()
        expect(result.tags).toEqual(['keep', 'new'])
        expect(result.trackers.old).toBeUndefined()
        expect(result.server_state).toEqual({free_space_on_disk: 100, up_info_speed: 50})
        expect(result.torrents_removed).toEqual([])
        expect(result.full_update).toBe(false)
    })

    test('replaces the snapshot whenever qBittorrent returns a full update', () => {
        const result = mergeMainData({
            rid: 5,
            torrents: {stale: {name: 'Stale'}},
            server_state: {free_space_on_disk: 100},
        }, {
            rid: 1,
            full_update: true,
            torrents: {current: {name: 'Current'}},
            server_state: {free_space_on_disk: 50},
        })

        expect(result.torrents).toEqual({current: {name: 'Current'}})
        expect(result.server_state).toEqual({free_space_on_disk: 50})
        expect(result.full_update).toBe(true)
    })

    test('always sends the last rid and remains correct with repeated full responses', async () => {
        const requests = ajaxResponses([
            {
                rid: 1,
                full_update: true,
                torrents: {first: {name: 'First'}},
                server_state: {},
            },
            {
                rid: 1,
                full_update: true,
                torrents: {second: {name: 'Second'}},
                server_state: {},
            },
        ])
        const client = new QBittorrentClient('http://qbittorrent.test')

        const first = await client.syncMainData()
        const second = await client.syncMainData()

        expect(requests.map((request) => request.data.rid)).toEqual([0, 1])
        expect(first.torrents).toEqual({first: {name: 'First'}})
        expect(second.torrents).toEqual({second: {name: 'Second'}})
    })

    test('coalesces concurrent sync requests so they cannot reuse a rid', async () => {
        const requests = ajaxResponses([{
            rid: 1,
            full_update: true,
            torrents: {},
            server_state: {},
        }])
        const client = new QBittorrentClient('http://qbittorrent.test')

        const [first, second] = await Promise.all([
            client.syncMainData(),
            client.syncMainData(),
        ])

        expect(requests).toHaveLength(1)
        expect(first).toBe(second)
    })
})

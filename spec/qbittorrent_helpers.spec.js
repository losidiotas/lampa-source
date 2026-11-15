import { expect, suite, test } from 'vitest'

import { escapeHtml, torrentHash } from '../plugins/qbittorrent/helpers'
import { TorrentComponent } from '../plugins/qbittorrent/components/torrent'
import { TMDBClient } from '../plugins/qbittorrent/tmdb'

suite('qBittorrent helpers', () => {
    test('escapes untrusted text before inserting it into HTML templates', () => {
        expect(escapeHtml(`<img src=x onerror="alert('xss')"> & text`)).toBe(
            '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt; &amp; text'
        )
    })

    test('uses qBittorrent TorrentID as the primary torrent identifier', () => {
        expect(torrentHash({
            hash: 'torrent-id',
            infohash_v1: 'v1',
            infohash_v2: 'v2',
        })).toBe('torrent-id')
    })

    test('supports pure v2 torrents and sync response keys as fallbacks', () => {
        expect(torrentHash({infohash_v1: '', infohash_v2: 'v2'})).toBe('v2')
        expect(torrentHash({}, 'sync-key')).toBe('sync-key')
        expect(torrentHash({infohash_v2: 'v2'}, 'sync-key')).toBe('sync-key')
    })

    test('renders torrents without cached metadata and escapes their names', () => {
        let templateVariables
        const originalLampa = globalThis.Lampa
        try {
            globalThis.Lampa = {
                Lang: {translate: (key) => key},
                Template: {
                    get: (name, variables) => {
                        templateVariables = variables
                        return {}
                    },
                },
                Utils: {bytesToSize: (value) => String(value)},
            }

            expect(() => new TorrentComponent({
                hash: 'torrent-id',
                name: '<img src=x onerror=alert(1)>',
                state: 'downloading',
                total_size: 1,
                dlspeed: 0,
                upspeed: 0,
                progress: 0,
                num_seeds: 0,
                num_leechs: 0,
            }, null)).not.toThrow()

            expect(templateVariables.name).toBe('&lt;img src=x onerror=alert(1)&gt;')
        } finally {
            globalThis.Lampa = originalLampa
        }
    })

    test('builds the complete poster path before TMDB adds query parameters', () => {
        const originalLampa = globalThis.Lampa
        try {
            globalThis.Lampa = {
                Storage: {field: () => 'w300'},
                TMDB: {image: (path) => `https://image.tmdb.org/${path}?email=`},
            }

            expect(TMDBClient.posterURL('/poster.jpg')).toBe(
                'https://image.tmdb.org/t/p/w300/poster.jpg?email='
            )
        } finally {
            globalThis.Lampa = originalLampa
        }
    })
})

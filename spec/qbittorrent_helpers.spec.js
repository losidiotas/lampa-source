import { expect, suite, test } from 'vitest'

import {
    escapeHtml,
    isTorrentDownloading,
    isTorrentMetadataTag,
    isTorrentStopped,
    magnetExactTopic,
    normalizeTorrentMetadata,
    parseTorrentSeriesInfo,
    parseTorrentTags,
    qbtRefreshInterval,
    replaceTorrentMetadataTag,
    torrentSeriesLabel,
    torrentHash,
} from '../plugins/qbittorrent/helpers'
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

    test('recognizes stopped states from qBittorrent 4 and 5', () => {
        expect(isTorrentStopped('pausedDL')).toBe(true)
        expect(isTorrentStopped('pausedUP')).toBe(true)
        expect(isTorrentStopped('stoppedDL')).toBe(true)
        expect(isTorrentStopped('stoppedUP')).toBe(true)
        expect(isTorrentStopped('downloading')).toBe(false)
    })

    test('shows download activity for normal and forced downloads', () => {
        expect(isTorrentDownloading('downloading')).toBe(true)
        expect(isTorrentDownloading('forcedDL')).toBe(true)
        expect(isTorrentDownloading('stalledDL')).toBe(false)
    })

    test('uses qBittorrent refresh interval with a 500 ms minimum', () => {
        expect(qbtRefreshInterval({server_state: {refresh_interval: 1500}})).toBe(1500)
        expect(qbtRefreshInterval({server_state: {refresh_interval: 100}})).toBe(500)
        expect(qbtRefreshInterval({server_state: {refresh_interval: 0}}, 2500)).toBe(2500)
        expect(qbtRefreshInterval({}, 2500)).toBe(2500)
    })

    test('safely extracts magnet topics and ignores regular torrent URLs', () => {
        expect(magnetExactTopic('magnet:?xt=URN%3ABTIH%3AABC123')).toBe('urn:btih:abc123')
        expect(magnetExactTopic('https://example.com/file.torrent')).toBe(null)
        expect(magnetExactTopic(undefined)).toBe(null)
    })

    test('normalizes TV metadata for the persistent cache', () => {
        expect(normalizeTorrentMetadata({
            name: 'Series title',
            first_air_date: '2025-01-02',
        })).toMatchObject({
            title: 'Series title',
            release_date: '2025-01-02',
        })
    })

    test('keeps only movies and TV shows in TMDB multi-search results', () => {
        expect(TMDBClient.filterSearchResults([
            {id: 1, media_type: 'person'},
            {id: 2, media_type: 'movie'},
            {id: 3, media_type: 'tv'},
        ])).toEqual([
            {id: 2, media_type: 'movie'},
            {id: 3, media_type: 'tv'},
        ])
    })

    test('replaces only TMDB metadata tags and preserves user tags', () => {
        const tags = parseTorrentTags('favorite, movie/10, tv/20, 4k')
        expect(tags.filter(isTorrentMetadataTag)).toEqual(['movie/10', 'tv/20'])
        expect(replaceTorrentMetadataTag(tags, 'movie/30')).toEqual([
            'favorite',
            '4k',
            'movie/30',
        ])
    })

    test('formats an explicitly numbered TV season and single episode', () => {
        expect(torrentSeriesLabel(
            {name: 'Example.Show.S02E05.1080p', tags: 'tv/42'},
            {media_type: 'tv'},
            {season: 'Season', seasons: 'Seasons', episode: 'Episode'}
        )).toBe('Season 2 · Episode 5')

        expect(torrentSeriesLabel(
            {name: 'Сериал (Сезон 1, Серия 4)', tags: 'tv/42'},
            {},
            {season: 'Сезон', seasons: 'Сезоны', episode: 'Серия'}
        )).toBe('Сезон 1 · Серия 4')
    })

    test('shows multiple seasons but omits episode ranges', () => {
        expect(torrentSeriesLabel(
            {name: 'Игра престолов [1-8 сезоны: 1-73 серии]', tags: 'tv/1399'},
            {media_type: 'tv'},
            {season: 'Сезон', seasons: 'Сезоны', episode: 'Серия'}
        )).toBe('Сезоны 1–8')

        expect(torrentSeriesLabel(
            {name: 'From [04x01-07 из 10]', tags: 'tv/124364'},
            {media_type: 'tv'},
            {season: 'Season', seasons: 'Seasons', episode: 'Episode'}
        )).toBe('Season 4')
    })

    test('supports non-contiguous season lists', () => {
        expect(parseTorrentSeriesInfo('Рик и Морти / Сезон: 1, 2 / Серии: 1-21')).toEqual({
            season: '1, 2',
            multipleSeasons: true,
            episode: null,
        })
    })

    test('does not label movies or TV torrents without explicit season information', () => {
        const labels = {season: 'Season', seasons: 'Seasons', episode: 'Episode'}
        expect(torrentSeriesLabel(
            {name: 'A.Movie.S02E05.1080p', tags: 'movie/10'},
            {media_type: 'movie'},
            labels
        )).toBe('')
        expect(torrentSeriesLabel(
            {name: 'Series title (2025)', tags: 'tv/20'},
            {media_type: 'tv'},
            labels
        )).toBe('')
    })
})

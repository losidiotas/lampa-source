import { ajax } from "./helpers";

class TMDBClient {
    constructor() {
    }

    /**
     * @param query {string}
     * @returns {Promise<*>}
     */
    async searchMulti(query) {
        let params = {
            url: Lampa.TMDB.api('search/multi'),
            method: 'GET',
            timeout: 10000, // 10 second timeout
            data: {
                include_adult: "true",
                query: query,
                api_key: Lampa.TMDB.key(),
                language: Lampa.Storage.get('language', 'ru'),
            }
        }

        const response = await ajax(params)
        if (response && Array.isArray(response.results)) {
            response.results = TMDBClient.filterSearchResults(response.results)
        }

        return response
    }

    static filterSearchResults(results) {
        return (results || []).filter((result) => {
            return result && (result.media_type === 'movie' || result.media_type === 'tv');
        });
    }

    /**
     * @param tag {string}
     * @returns {Promise<*>}
     */
    async images(tag) {
        let params = {
            url: `${Lampa.TMDB.api(tag)}/images`,
            method: 'GET',
            data: {
                include_adult: "true",
                api_key: Lampa.TMDB.key(),
                language: Lampa.Storage.get('language', 'ru'),
            },
        }

        return ajax(params)
    }


    static posterURL(posterPath) {
        if (!posterPath) {
            return './img/img_load.svg';
        }

        const size = Lampa.Storage.field('poster_size') || 'w200';
        return Lampa.TMDB.image(`t/p/${size}${posterPath}`);
    }

    static cleanTorrentName(name) {
        if (!name) {
            return '';
        }

        let regex = /^(.+?)(?:[.\s(]((19|20)\d{2})[.\s)]|S\d{1,2}(?:E\d{1,2})?|[.\s](?:PPV.)?[HP]DTV|(?:HD)?TC|[cC]am|(?:HD)?CAM|B[rR]Rip|WEBRip|WEB-Rip|WEB-DL|WEB|TS|(?:PPV )?WEB-?DL(?: DVDRip)?|H[dD]Rip|DVDRip|DVDRiP|DVDRIP|CamRip|W[EB]B[rR]ip|HDRIP|[Bb]lu[Rr]ay|DvDScr|hdtv)/i;
        let match = name.match(regex);
        if (match && match[1]) {
            return match[1].replace(/\./g, ' ').trim();
        }

        let rutrackerRegex = /(.*?)\//i;
        let rutrackerMatch = name.match(rutrackerRegex);
        if (rutrackerMatch && rutrackerMatch[1]) {
            return rutrackerMatch[1].trim();
        }

        return name.replace(/\./g, ' ').replace(/\//g, ' ').trim();
    }

    static async getMetadata(tag) {
        let params = {
            url: `${Lampa.TMDB.api(tag)}`,
            method: 'GET',
            data: {
                include_adult: "true",
                api_key: Lampa.TMDB.key(),
                language: Lampa.Storage.get('language', 'ru'),
            },
        }

        return ajax(params)
    }
}

export {
    TMDBClient,
}

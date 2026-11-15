/**
 * @param options
 * @returns {Promise<any>}
 */
function ajax(options) {
    return new Promise(function (resolve, reject) {
        $.ajax(options).done(resolve).fail(reject);
    });
}

function ucfirst(string) {
    return string.charAt(0).toUpperCase() + String(string).slice(1);
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, function (character) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
        }[character];
    });
}

function torrentHash(torrent, fallback = '') {
    if (!torrent) {
        return String(fallback || '');
    }

    return String(torrent.hash || fallback || torrent.infohash_v1 || torrent.infohash_v2 || '');
}

function isTorrentStopped(state) {
    return ['pausedDL', 'pausedUP', 'stoppedDL', 'stoppedUP'].includes(state);
}

function isTorrentDownloading(state) {
    return state === 'downloading' || state === 'forcedDL';
}

function qbtRefreshInterval(data, fallback = 3000) {
    const value = data && data.server_state && Number(data.server_state.refresh_interval);
    return Number.isFinite(value) && value > 0 ? Math.max(500, value) : fallback;
}

function normalizeTorrentMetadata(metadata) {
    const normalized = {...(metadata || {})};
    normalized.title = normalized.title || normalized.name || '';
    normalized.release_date = normalized.release_date || normalized.first_air_date || '';
    return normalized;
}

function parseTorrentTags(tags) {
    return String(tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function isTorrentMetadataTag(tag) {
    return /^(tv|movie)\/\d+$/.test(tag);
}

function replaceTorrentMetadataTag(tags, replacement) {
    const parsedTags = Array.isArray(tags) ? tags : parseTorrentTags(tags);
    const updatedTags = parsedTags.filter((tag) => !isTorrentMetadataTag(tag));
    if (replacement && !updatedTags.includes(replacement)) {
        updatedTags.push(replacement);
    }
    return updatedTags;
}

function isTorrentSeries(torrent, metadata) {
    const normalizedMetadata = metadata || {};
    if (normalizedMetadata.media_type === 'tv' || normalizedMetadata.first_air_date || normalizedMetadata.number_of_seasons) {
        return true;
    }

    return parseTorrentTags(torrent && torrent.tags).some((tag) => /^tv\/\d+$/.test(tag));
}

function parseTorrentSeriesInfo(title) {
    const value = String(title || '');
    if (!value) {
        return null;
    }

    const seasonWord = '(?:сезон(?:ы|а|ов|и|ів)?|seasons?)';
    let season = null;
    let multipleSeasons = false;
    let match = value.match(new RegExp(`${seasonWord}\\s*:?\\s*(\\d{1,2}(?:\\s*,\\s*\\d{1,2})+)`, 'i'));

    if (match) {
        season = match[1]
            .split(',')
            .map((number) => String(parseInt(number.trim(), 10)))
            .join(', ');
        multipleSeasons = true;
    } else {
        match = value.match(/\bS(\d{1,2})\s*[-–]\s*S?(\d{1,2})\b/i) ||
            value.match(new RegExp(`(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s*${seasonWord}`, 'i')) ||
            value.match(new RegExp(`${seasonWord}\\s*:?\\s*(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})`, 'i'));

        if (match) {
            season = `${parseInt(match[1], 10)}–${parseInt(match[2], 10)}`;
            multipleSeasons = true;
        } else {
            match = value.match(new RegExp(`${seasonWord}\\s*:?\\s*(\\d{1,2})`, 'i')) ||
                value.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s*${seasonWord}`, 'i')) ||
                value.match(/\bS(\d{1,2})(?:[ ._-]*E\d{1,3})?\b/i) ||
                value.match(/\b(\d{1,2})x\d{1,3}\b/i) ||
                value.match(/(?:тв|tv)-(\d{1,2})/i);

            if (match) {
                season = String(parseInt(match[1], 10));
            }
        }
    }

    const hasEpisodeRange = [
        /\bS\d{1,2}[ ._-]*E\d{1,3}\s*[-–]\s*(?:E\s*)?\d{1,3}\b/i,
        /\b\d{1,2}x\d{1,3}\s*[-–]\s*\d{1,3}\b/i,
        /(?:серии|серії|episodes?)\s*:?\s*\d{1,3}\s*[-–]\s*\d{1,3}/i,
        /\d{1,3}\s*[-–]\s*\d{1,3}\s*(?:серии|серії|episodes?)/i,
    ].some((pattern) => pattern.test(value));

    let episode = null;
    if (!hasEpisodeRange) {
        match = value.match(/\bS\d{1,2}[ ._-]*E(\d{1,3})(?!\s*[-–])/i) ||
            value.match(/\b\d{1,2}x(\d{1,3})(?!\s*[-–])/i) ||
            value.match(/\b(?:E|EP)[ ._-]?(\d{1,3})(?!\s*[-–])/i) ||
            value.match(/(?:серия|серія|episode)\s*:?\s*(\d{1,3})(?!\s*[-–])/i) ||
            value.match(/(\d{1,3})\s*(?:серия|серія|episode)(?![a-zа-яіїє])/i);

        if (match) {
            episode = parseInt(match[1], 10);
        }
    }

    return season || episode !== null ? {season, multipleSeasons, episode} : null;
}

function torrentSeriesLabel(torrent, metadata, labels) {
    if (!isTorrentSeries(torrent, metadata)) {
        return '';
    }

    const info = parseTorrentSeriesInfo(torrent && torrent.name);
    if (!info) {
        return '';
    }

    const translated = labels || {};
    const parts = [];
    if (info.season) {
        parts.push(`${info.multipleSeasons ? translated.seasons : translated.season} ${info.season}`.trim());
    }
    if (info.episode !== null) {
        parts.push(`${translated.episode || ''} ${info.episode}`.trim());
    }

    return parts.join(' · ');
}

function lampaEditor(params) {
    return new Promise(function (resolve) {
        Lampa.Input.edit(params, function (value) {
          resolve(value);
        })
    })
}

/**
 * @param uri {string}
 * @return {string}
 */
function magnetExactTopic(uri) {
    if (typeof uri !== 'string' || !uri) {
        return null;
    }

    let parsed;
    try {
        parsed = parseURL(uri);
    } catch (e) {
        return null;
    }

    const exactTopic = parsed.query && parsed.query['xt'];
    const value = Array.isArray(exactTopic) ? exactTopic[0] : exactTopic;
    return typeof value === 'string' && value ? value.toLowerCase() : null;
}

function parseURL(url) {
    const result = {
        href: url,
        protocol: null,
        slashes: false,
        auth: null,
        host: null,
        hostname: null,
        port: null,
        pathname: null,
        search: null,
        query: null,
        hash: null
    };

    let rest = url;

    // --- protocol ---
    const protoMatch = rest.match(/^([a-zA-Z0-9.+-]+:)/);
    if (protoMatch) {
        result.protocol = protoMatch[1];
        rest = rest.slice(protoMatch[1].length);
    }

    // --- slashes and authority ---
    if (rest.startsWith("//")) {
        result.slashes = true;
        rest = rest.slice(2);

        // --- auth ---
        const authEnd = rest.indexOf("@");
        const firstSep = rest.search(/[/?#]/);
        if (authEnd !== -1 && (firstSep === -1 || authEnd < firstSep)) {
            result.auth = rest.slice(0, authEnd);
            rest = rest.slice(authEnd + 1);
        }

        // --- host ---
        const hostEnd = rest.search(/[/?#]/);
        const host = hostEnd === -1 ? rest : rest.slice(0, hostEnd);
        result.host = host;

        // hostname + port
        const portIndex = host.lastIndexOf(":");
        if (portIndex !== -1 && portIndex !== host.length - 1) {
            result.hostname = host.slice(0, portIndex);
            result.port = host.slice(portIndex + 1);
        } else {
            result.hostname = host;
        }

        rest = hostEnd === -1 ? "" : rest.slice(hostEnd);
    }

    // --- hash (#...) ---
    const hashIndex = rest.indexOf("#");
    if (hashIndex !== -1) {
        result.hash = rest.slice(hashIndex);
        rest = rest.slice(0, hashIndex);
    }

    // --- search (?...) ---
    const searchIndex = rest.indexOf("?");
    if (searchIndex !== -1) {
        result.search = rest.slice(searchIndex);
        const queryString = rest.slice(searchIndex + 1);
        result.pathname = rest.slice(0, searchIndex) || null;
        result.query = parseQuery(queryString);
    } else {
        result.pathname = rest || null;
    }

    return result;
}

// ---------------------
// Query string parser
// ---------------------
function parseQuery(qs) {
    if (!qs) return {};

    const query = {};
    const pairs = qs.split("&");

    for (const pair of pairs) {
        if (!pair) continue;

        const [key, value = ""] = pair.split("=");
        const k = decodeURIComponent(key);
        const v = decodeURIComponent(value);

        // поддержка повторяющихся ключей: ?a=1&a=2
        if (query[k] === undefined) {
            query[k] = v;
        } else if (Array.isArray(query[k])) {
            query[k].push(v);
        } else {
            query[k] = [query[k], v];
        }
    }

    return query;
}


export {
    ajax,
    ucfirst,
    lampaEditor,
    parseURL,
    parseQuery,
    magnetExactTopic,
    escapeHtml,
    torrentHash,
    isTorrentStopped,
    isTorrentDownloading,
    qbtRefreshInterval,
    normalizeTorrentMetadata,
    parseTorrentTags,
    isTorrentMetadataTag,
    replaceTorrentMetadataTag,
    isTorrentSeries,
    parseTorrentSeriesInfo,
    torrentSeriesLabel,
}

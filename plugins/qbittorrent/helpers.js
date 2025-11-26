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
    let parsed = parseURL(uri);

    return parsed.query['xt'].toLowerCase();
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
}


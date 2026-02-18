import MANIFEST from "./manifest";

const token = 'ce64b324b4234225a725d868059f6968';

class JellyfinPlugin {
    static initialize() {
        Lampa.Manifest.plugins = MANIFEST;
        window.Jellyfin = {
            playTest: playTest
        }
    }
}

function ajax(options) {
    return new Promise(function (resolve, reject) {
        $.ajax(options).done(resolve).fail(reject);
    });
}

async function playTest() {
    let resp = await ajax({
        url: "http://jellyfin.lan:8096/Items",
        method: 'GET',
        timeout: 0,
        headers: {
            "X-Emby-Token": token
        },
        data: {
            Recursive: "true",
            IncludeItemTypes: "Movie,Series,Episode",
            Fields: "MediaSources,Path"
        },
    });
    console.log(resp.Items[0].Name);
    console.log(resp.Items[0].Id);
    console.log(resp.Items[0].MediaSources);
    console.log(resp.Items[0].MediaSources[0]);

    let title = resp.Items[0].Name;
    let itemId = resp.Items[0].Id;
    let container = resp.Items[0].MediaSources[0].Container;
    let mediaSourceId = resp.Items[0].MediaSources[0].Id;

    let url = `http://jellyfin.lan:8096/Videos/${itemId}/stream.${container}?Static=true&MediaSourceId=${mediaSourceId}&api_key=${token}`;

    url = 'https://vk6-5.vkuser.net/?srcIp=176.84.231.126&pr=105&expires=1764910574339&srcAg=CHROME_MAC&fromCache=1&ms=95.142.206.164&type=4&subId=9274788481607&sig=jBDnuhJkovI&ct=0&urls=185.226.53.218%3B45.136.22.138&clientType=13&appId=512000384397&zs=60%3B43&id=9274788481607';
    url = 'http://localhost:3000/9274788481607.mp4';
    let video = {
        title: title,
        url: url,
        subtitles: [],
        timeline: Lampa.Timeline.view(Lampa.Utils.hash(`${itemId}-${mediaSourceId}`)),
    };
    let playlist = [video]

    Lampa.Player.play(playlist[0]);
    Lampa.Player.playlist(playlist);
}


if (!window.plugin_jellyfin_ready) {
    window.plugin_jellyfin_ready = true;
    startPlugin();
}

function startPlugin() {
    window.plugin_jellyfin_ready = true;
    if (window.appready) {
        initializePlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                initializePlugin();
            }
        });
    }
}

function initializePlugin() {
    try {
        JellyfinPlugin.initialize();
    } catch (error) {
        console.error('[JLF]', 'Error initializing Jellyfin plugin:', error);
    }
}

export {
    JellyfinPlugin
}




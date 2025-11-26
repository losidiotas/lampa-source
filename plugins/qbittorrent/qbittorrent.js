import MANIFEST from "./manifest";
import { InstallLanguagePack } from "./lang";
import { RegisterTemplates } from "./templates";
import { QBittorrentClient } from "./client";
import { RegisterSettingsLayout } from "./settings";
import { MenuButton } from "./components/menu_button";
import { TorrentButton } from "./components/torrent_button";
import { MainComponent } from "./components/main";

class QBittorrentPlugin {
    static initialize() {
        Lampa.Manifest.plugins = MANIFEST;

        RegisterTemplates();
        InstallLanguagePack();
        RegisterSettingsLayout();

        $('head').append(Lampa.Template.get('qbtStyles', {}, true));
        Lampa.Component.add('qbittorrentPanel', MainComponent)

        if (!QBittorrentPlugin.isConfigured()) {
            return
        }

        QBittorrentPlugin.show()
    }

    static show() {
        MenuButton.show()
        TorrentButton.show();
    }

    static hide() {
        MenuButton.hide()
        TorrentButton.hide();
    }

    /**
     * @returns {boolean}
     */
    static isConfigured() {
        return QBittorrentPlugin.apiUrl() !== ''
    }

    /**
     * @returns {string}
     */
    static apiUrl() {
        return Lampa.Storage.get('qbtApiURL', '');
    }

    /**
     * @type {QBittorrentClient}
     */
    static #client

    /**
     * @returns {Promise<QBittorrentClient>}
     */
    static async client() {
        if (!QBittorrentPlugin.isConfigured()) {
            throw new Error('[QBittorrentPlugin] Client is not configured.');
        }

        if (!QBittorrentPlugin.#client) {
            let client = new QBittorrentClient(QBittorrentPlugin.apiUrl());
            await client.load();
            QBittorrentPlugin.#client = client
        }

        return QBittorrentPlugin.#client
    }

    static resetClient() {
        QBittorrentPlugin.#client = null;
    }

    static #db = new Lampa.DB("qbittorrent_plugin", ['metadata'], 4);
    static #isDatabaseOpened = false

    static async database() {
        if (!QBittorrentPlugin.#isDatabaseOpened) {
            await QBittorrentPlugin.#db.openDatabase()
            QBittorrentPlugin.#isDatabaseOpened = true
        }

        return QBittorrentPlugin.#db
    }

    static isDLNAEnabled() {
        return Lampa.Storage.field('qbtLampacDLNAIntegration') === true;
    }
}

if (!window.plugin_qbittorrent_ready) {
    window.qbittorrent_plugin_ready = true;
    startPlugin();
}

function startPlugin() {
    window.plugin_qbittorrent_ready = true;
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
        QBittorrentPlugin.initialize();
    } catch (error) {
        console.error('[QBT]', 'Error initializing qBittorrent plugin:', error);
    }
}

export {
    QBittorrentPlugin
}
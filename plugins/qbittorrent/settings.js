import MANIFEST from "./manifest";
import { qbtTranslate } from "./lang";
import { QBittorrentPlugin } from "./qbittorrent";

function RegisterSettingsLayout() {
    // Создание пункта меню
    Lampa.SettingsApi.addComponent({
        component: MANIFEST.component,
        name: MANIFEST.name,
        icon: MANIFEST.icon
    });

    let onChange = () => Lampa.Settings.update()

    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtApiURL',
            type: 'input',
            placeholder: '',
            values: '',
            default: ''
        },
        field: {
            name: qbtTranslate('ApiURL')
        },
        onChange: (value) => {
            if (value) {
                QBittorrentPlugin.show();
                QBittorrentPlugin.resetClient();
            } else {
                QBittorrentPlugin.hide();
            }
            Lampa.Settings.update()
        }
    });
    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtMoviesDownloadPath',
            type: 'input',
            placeholder: '',
            values: '',
            default: ''
        },
        field: {
            name: qbtTranslate('MoviesDownloadPath')
        },
        onChange: onChange
    });
    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtMoviesCategory',
            type: 'input',
            placeholder: '',
            values: '',
            default: ''
        },
        field: {
            name: qbtTranslate('MoviesCategory')
        },
        onChange: onChange
    });
    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtTvDownloadPath',
            type: 'input',
            placeholder: '',
            values: '',
            default: ''
        },
        field: {
            name: qbtTranslate('TvDownloadPath')
        },
        onChange: onChange
    });
    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtTvCategory',
            type: 'input',
            placeholder: '',
            values: '',
            default: ''
        },
        field: {
            name: qbtTranslate('TvCategory')
        },
        onChange: onChange
    });
    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtSequentialDownload',
            type: "trigger",
            default: false
        },
        field: {
            name: qbtTranslate('SequentialDownload')
        },
        onChange: onChange
    });
    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtFirstLastPiecePrio',
            type: "trigger",
            default: false
        },
        field: {
            name: qbtTranslate('PrioritizeDownloadFirstLastPiece')
        },
        onChange: onChange
    });
    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtLampacDLNAIntegration',
            type: 'trigger',
            default: false
        },
        field: {
            name: qbtTranslate('LampacDLNAIntegration'),
        },
        onChange: onChange
    });
    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtLampacDLNAMappingPath',
            type: 'input',
            placeholder: '',
            values: '',
            default: ''
        },
        field: {
            name: qbtTranslate('LampacDLNAMappingPath')
        },
        onRender: function onRender(item) {
            if (Lampa.Storage.field('qbtLampacDLNAIntegration') === true) {
                item.show();
            } else {
                item.hide();
            }
        },
        onChange: onChange
    });
    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtNginxIntegration',
            type: 'trigger',
            default: false
        },
        field: {
            name: qbtTranslate('NginxIntegration'),
        },
        onChange: onChange
    });
    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtNginxURL',
            type: 'input',
            placeholder: '',
            values: '',
            default: ''
        },
        field: {
            name: qbtTranslate('NginxURL')
        },
        onRender: function onRender(item) {
            if (Lampa.Storage.field('qbtNginxIntegration') === true) {
                item.show();
            } else {
                item.hide();
            }
        },
        onChange: onChange
    });

    Lampa.SettingsApi.addParam({
        component: MANIFEST.component,
        param: {
            name: 'qbtRemoveMetadata',
            type: 'button',
        },
        field: {
            name: qbtTranslate('RemoveMetadata'),
        },
        onChange: async () => {
            let db = await QBittorrentPlugin.database()
            await db.clearAll()

            Lampa.Noty.show(qbtTranslate('MetadataRemoved'))
        }
    })

}

export {
    RegisterSettingsLayout
};
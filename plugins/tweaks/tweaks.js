import MANIFEST from "./manifest";

class TweaksPlugin {
    static initialize() {
        Lampa.Manifest.plugins = MANIFEST;

        Lampa.SettingsApi.addComponent({
            component: MANIFEST.component,
            name: MANIFEST.name,
            icon: MANIFEST.icon
        });

        let onChange = () => Lampa.Settings.update()

        Lampa.SettingsApi.addParam({
            component: MANIFEST.component,
            param: {
                name: 'tweaksForceLampaKeyboard',
                type: "trigger",
                default: false
            },
            field: {
                name: 'Всегда использовать встроенную клавиатуру'
            },
            onChange: onChange
        });

        Lampa.SettingsApi.addParam({
            component: MANIFEST.component,
            param: {
                name: 'tweaksAllowRealKeyboardInLampaKeyboard',
                type: "trigger",
                default: false
            },
            field: {
                name: 'Поддержка физической клавиатуры во встроенной'
            },
            onChange: onChange
        });

        Lampa.SettingsApi.addParam({
            component: MANIFEST.component,
            param: {
                type: 'button',
            },
            field: {
                name: 'Неиспользуемые клавиатуры',
                description: 'Выберите языки для отключения'
            },
            onChange: function () {
                let items = [
                    {
                        title: 'עברית',
                        checkbox: true,
                        code: 'he',
                        checked: Lampa.Storage.field('tweaksDisableKeyboard_he') === true
                    },
                    {
                        title: 'Українська',
                        checkbox: true,
                        code: 'uk',
                        checked: Lampa.Storage.field('tweaksDisableKeyboard_uk') === true
                    },
                    {
                        title: 'Русский',
                        checkbox: true,
                        code: 'ru',
                        checked: Lampa.Storage.field('tweaksDisableKeyboard_ru') === true
                    },
                    {
                        title: 'English',
                        checkbox: true,
                        code: 'en',
                        checked: Lampa.Storage.field('tweaksDisableKeyboard_en') === true
                    }
                ];

                console.log(items);

                Lampa.Select.show({
                    items: items,
                    fullsize: true,
                    onBack: function onBack() {
                        for (let item of items) {
                            console.log(item.code, item.checked);
                            Lampa.Storage.set(`tweaksDisableKeyboard_${item.code}`, item.checked === true, false, false);
                        }
                        Lampa.Settings.create(MANIFEST.component);
                    }
                });
            }
        });

        TweaksPlugin.patchKeyboard()
    }

    static patchKeyboard() {
        // Force lampa keyboard hack
        let _storageGet = Lampa.Storage.get
        Lampa.Storage.get = (name, empty) => {
            if (_storageGet('tweaksForceLampaKeyboard', '') === true && name === 'keyboard_type') {
                return 'lampa';
            }

            return _storageGet.call(_storageGet, name, empty);
        }
        Lampa.Storage.set('keyboard_type', 'lampa', false, false)

        // Real keyboard support
        let _windowSimpleKeyboard = window.SimpleKeyboard.default
        let _handleKeyDown = _windowSimpleKeyboard.prototype.handleKeyDown
        let _handleKeyUp = _windowSimpleKeyboard.prototype.handleKeyUp
        _windowSimpleKeyboard.prototype.handleKeyDown = function (event) {
            if (Lampa.Storage.field('tweaksAllowRealKeyboardInLampaKeyboard') === true) {
                let keyboard = this;
                if (event.key && event.key.length === 1) {
                    let input = this.getInput()
                    input += event.key
                    keyboard.setInput(input)
                    this.options.onChange(input)
                } else if (event.key === 'Backspace') {
                    event.preventDefault();
                    this.options.onKeyPress('{BKSP}')
                } else if (event.key === 'Enter' && event.shiftKey) {
                    event.preventDefault();
                    if (event.stopPropagation) {
                        event.stopPropagation();
                    }
                    event.cancelBubble = true;
                    return
                }
            }

            return _handleKeyDown.apply(this, arguments);
        }
        _windowSimpleKeyboard.prototype.handleKeyUp = function (event) {
            if (Lampa.Storage.field('tweaksAllowRealKeyboardInLampaKeyboard') === true) {
                if (event.key === 'Enter' && event.shiftKey) {
                    event.preventDefault();
                    if (event.stopPropagation) {
                        event.stopPropagation();
                    }
                    event.cancelBubble = true;
                    this.options.onKeyPress('{ENTER}')
                    return
                }
            }

            return _handleKeyUp.apply(this, arguments);
        }

        window.SimpleKeyboard.default = function NewSimpleKeyboard(params) {
            // Disabled locales
            let locales = [
                'en',
                'ru',
                'uk',
                'he',
            ]

            for (let locale of locales) {
                if (Lampa.Storage.field(`tweaksDisableKeyboard_${locale}`) === true) {
                    params.layout[locale] = undefined;
                }
            }

            // Real keyboard support
            if (Lampa.Storage.field('tweaksAllowRealKeyboardInLampaKeyboard') === true) {
                params.physicalKeyboardHighlight = true
            }

            return new _windowSimpleKeyboard(params);
        }
    }

}

if (!window.plugin_tweaks_ready) {
    window.qbittorrent_plugin_ready = true;
    startPlugin();
}

function startPlugin() {
    window.plugin_tweaks_ready = true;
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
        TweaksPlugin.initialize();
    } catch (error) {
        console.error('[QBT]', 'Error initializing Tweaks plugin:', error);
    }
}


export {
    TweaksPlugin
}




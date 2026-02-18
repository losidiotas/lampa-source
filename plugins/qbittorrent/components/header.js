import { qbtTranslate } from "../lang";

class HeaderComponent {
    /**
     * @param data {MainData}
     */
    constructor(data) {
        this.data = data;
        this.item = $(Lampa.Template.get('qbtComponentHeader', {
            updateButtonLabel: qbtTranslate('Update'),
            compactButtonLabel: qbtTranslate('Compact'),
            freeSpaceLabel: qbtTranslate('FreeSpace'),
            freeSpace: Lampa.Utils.bytesToSize(data.server_state.free_space_on_disk),
        }));
    }

    render() {
        return this.item;
    }

    destroy() {
        this.item.remove();
    };
}

export {
    HeaderComponent
}
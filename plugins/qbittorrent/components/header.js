import { qbtTranslate } from "../lang";

class HeaderComponent {
    /**
     * @param data {MainData}
     */
    constructor(data) {
        this.data = data;
        this.item = Lampa.Template.get('qbtComponentHeader', {
            updateButtonLabel: qbtTranslate('Update'),
        });
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
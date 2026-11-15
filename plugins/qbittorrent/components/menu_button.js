import MANIFEST from "../manifest";

const buttonId = 'qbittorrent-plugin-menu-button';

function createMenuButton() {
    let html = `
    <li id="${buttonId}" class="menu__item selector">
        <div class="menu__ico">${MANIFEST.icon}</div>
         <div class="menu__text">qBittorrent</div>
    </li>
    `
    let button = $(html);
    button.on('hover:enter',  () => {
        Lampa.Activity.push({
            url: '',
            title: 'qBittorrent',
            component: 'qbittorrentPanel',
            page: 1
        });
    });

    return button;
}

class MenuButton {
    static show() {
        const menu = $('.menu .menu__list').eq(0);
        const existingButtons = menu.find(`[id="${buttonId}"]`);

        if (existingButtons.length) {
            existingButtons.slice(1).off('hover:enter').remove();
            return;
        }

        menu.append(createMenuButton());
    }

    static hide() {
        $(`.menu [id="${buttonId}"]`).off("hover:enter").remove();
    }
}

export {
    MenuButton
};

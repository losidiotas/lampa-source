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
        $('.menu .menu__list').eq(0).append(createMenuButton());
    }

    static hide() {
        $(`#${buttonId}`).off("hover:enter").remove();
    }
}

export {
    MenuButton
};
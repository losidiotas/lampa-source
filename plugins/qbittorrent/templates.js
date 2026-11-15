function RegisterTemplates() {
    let styles = `@@include('../plugins/qbittorrent/css/style.css')`;
    Lampa.Template.add('qbtStyles', `<style id="qbtStyles">${styles}</style>`)
    Lampa.Template.add('qbtComponentHeader', `
        <div class="qbittorrent-plugin__head-buttons">
            <div data-qbt-refresh class="qbittorrent-plugin-head__update simple-button selector" title="{updateButtonLabel}" aria-label="{updateButtonLabel}">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M20 11A8 8 0 0 0 5.08 7M4 4V9H9M4 13A8 8 0 0 0 18.92 17M20 20V15H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div data-qbt-sort class="qbittorrent-plugin-head__sort simple-button selector">{sortButtonLabel}</div>
            <div data-qbt-compact class="qbittorrent-plugin-head__compact simple-button selector">{compactButtonLabel}</div>
        </div>
        <div class="qbittorrent-plugin-head__free_space">{freeSpaceLabel}: <span data-qbt-free-space>{freeSpace}</span></div>
    `);

    Lampa.Template.add('qbtTorrentRow', `
        <div id="qbittorrent-plugin-torrent-{hash}" class="qbittorrent-plugin__row {modificators} card card--category selector layer--visible layer--render">
            <div class="qbittorrent-plugin__row_poster">
                <img data-qbittorrent-filed="poster" src="{poster}" alt="{name}" class="qbittorrent-plugin__row_poster_img"/>
            </div>
            <div class="qbittorrent-plugin__row_description">
                <div data-qbittorrent-filed="title" class="qbittorrent-plugin__row_title">{title}</div>
                <div data-qbittorrent-filed="name" class="qbittorrent-plugin__row_name">{name}</div>
                <div data-qbittorrent-filed="overview" class="qbittorrent-plugin__row_overview">{overview}</div>
                <div data-qbittorrent-filed="footer"  class="qbittorrent-plugin__row_footer {origState} {downloadState} {uploadState}">
                    <div class="qbittorrent-plugin__row_size">{sizeLabel}: <span data-qbittorrent-filed="totalSize">{totalSize}</span></div>
                    <div class="qbittorrent-plugin__row_state">{stateLabel}: <span data-qbittorrent-filed="state">{state}</span></div>
                    <div data-qbittorrent-filed="dlspeed-container" class="qbittorrent-plugin__row_dlspeed {origState} {downloadState}">{speedLabel}: <span data-qbittorrent-filed="dlspeed">{dlspeed}/{secLabel}</span></div>
                    <div data-qbittorrent-filed="upspeed-container" class="qbittorrent-plugin__row_upspeed {uploadState}">{speedLabel}: <span data-qbittorrent-filed="upspeed">{upspeed}/{secLabel}</span></div>
                    <div class="qbittorrent-plugin__row_progress">{progressLabel}: <span data-qbittorrent-filed="progress">{progress}</span>%</div>
                    <div class="qbittorrent-plugin__row_peers">{seedsLabel}: <span data-qbittorrent-filed="numSeeds">{numSeeds}</span>, {leechsLabel}: <span data-qbittorrent-filed="numLeechs">{numLeechs}</span></div>
                </div>
            </div>
        </div>
    `);
}

export {
    RegisterTemplates
};

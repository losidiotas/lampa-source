function InstallLanguagePack() {
    let data = {
        qbtApiURL: {
            ru: 'Адрес WebUI qBittorrent',
            en: 'qBittorrent WebUI address',
        },
        qbtMoviesDownloadPath: {
            ru: 'Путь сохранения фильмов',
            en: 'Path to save movies',
        },
        qbtTvDownloadPath: {
            ru: 'Путь сохранения сериалов',
            en: 'Path to save TV shows',
        },
        qbtFreeSpace: {
            en: 'Free space',
            ru: 'Свободное место',
        },
        qbtUpdate: {
            en: 'Update',
            ru: 'Обновить',
        },
        qbtStart: {
            en: 'Start',
            ru: 'Запустить',
        },
        qbtStop: {
            en: 'Stop',
            ru: 'Остановить',
        },
        qbtDelete: {
            en: 'Delete',
            ru: 'Удалить',
        },
        qbtFullDelete: {
            en: 'Delete with files',
            ru: 'Удалить с файлами',
        },
        qbtSuccessAction: {
            'en': 'Action successfully done',
            'ru': 'Действие успешно выполнено',
        },
        qbtFailedAction: {
            en: 'Action returned an error',
            ru: 'Действие вернуло ошибку',
        },
        qbtSeedsLabel: {
            en: 'Seeds',
            ru: 'Раздают',
        },
        qbtLeechsLabel: {
            en: 'Leechs',
            ru: 'Качают',
        },
        qbtAllocating: {
            ru: 'Выделение',
            en: 'Allocating'
        },
        qbtCheckingDL: {
            ru: 'Проверка загрузки',
            en: 'Checking DL'
        },
        qbtCheckingResumeData: {
            ru: 'Проверка для возобновления',
            en: 'Checking for resume'
        },
        qbtCheckingUP: {
            ru: 'Проверка раздачи',
            en: 'Checking UP'
        },
        qbtDownloading: {
            ru: 'Загрузка',
            en: 'Downloading'
        },
        qbtError: {
            ru: 'Ошибка',
            en: 'Error'
        },
        qbtForcedDL: {
            ru: 'Принудит. загрузка',
            en: 'Forced DL'
        },
        qbtForcedMetaDL: {
            ru: 'Принудит. метаданные',
            en: 'Forced metadata DL'
        },
        qbtForcedUP: {
            ru: 'Принудит. раздача',
            en: 'Forced UP'
        },
        qbtMetaDL: {
            ru: 'Метаданные',
            en: 'Metadata DL'
        },
        qbtMissingFiles: {
            ru: 'Файлы отсутствуют',
            en: 'Missing files'
        },
        qbtMoving: {
            ru: 'Перемещение',
            en: 'Moving'
        },
        qbtPausedDL: {
            ru: 'Пауза (загрузка)',
            en: 'Paused (DL)'
        },
        qbtPausedUP: {
            ru: 'Пауза (раздача)',
            en: 'Paused (UP)'
        },
        qbtQueuedDL: {
            ru: 'В очереди (загр.)',
            en: 'Queued (DL)'
        },
        qbtQueuedUP: {
            ru: 'В очереди (разд.)',
            en: 'Queued (UP)'
        },
        qbtStalledDL: {
            ru: 'Простаивает (загр.)',
            en: 'Stalled (DL)'
        },
        qbtStalledUP: {
            ru: 'Простаивает (разд.)',
            en: 'Stalled (UP)'
        },
        qbtStoppedUP: {
            ru: 'Остановлен (загр.)',
            en: 'Stopped (UP)'
        },
        qbtStoppedDL: {
            ru: 'Остановлен (разд.)',
            en: 'Stopped (DL)'
        },
        qbtUnknown: {
            ru: 'Неизвестно',
            en: 'Unknown'
        },
        qbtUploading: {
            ru: 'Раздача',
            en: 'Uploading'
        },
        qbtLampacDLNAIntegration: {
            en: 'Enable Lampac DLNA integration',
            ru: 'Включить интеграцию с Lampac DLNA',
        },
        qbtReloaded: {
            en: 'Reloaded',
            ru: 'Обновлено',
        },
        qbtPlayDLNA: {
            en: 'Play DLNA',
            ru: 'Воспроизвести DLNA',
        },
        qbtPlayNGINX: {
            en: 'Play via Nginx',
            ru: 'Воспроизвести с Nginx',
        },
        qbtNginxURL: {
            en: 'Nginx URL',
            ru: 'Адрес Nginx',
        },
        qbtNginxIntegration: {
            en: 'Enable Nginx integration',
            ru: 'Включить интеграцию с Nginx',
        },
        qbtUpdateMetadata: {
            en: 'Update metadata',
            ru: 'Обновить метаданные',
        },
        qbtAddToqBittorrent: {
            en: 'Add to qBittorrent',
            ru: 'Добавить в qBittorrent',
        },
        qbtSizeLabel: {
            en: 'Size',
            ru: 'Размер',
        },
        qbtStateLabel: {
            en: 'State',
            ru: 'Статус',
        },
        qbtProgressLabel: {
            en: 'Progress',
            ru: 'Прогресс',
        },
        qbtMetaUpdateSuccess: {
            en: 'Metadata successfully updated',
            ru: 'Метаданные успешно обновлены',
        },
        qbtMetaUpdateFailed: {
            en: 'Metadata update failed',
            ru: 'Ошибка при обновлении метаданных',
        },
        qbtMetadataRemoved: {
            en: "Metadata removed",
            ru: "Метаданные удалены",
        },
        qbtRemoveMetadata: {
            en: "Remove metadata",
            ru: "Удалить метаданные",
        },
        qbtAction: {
            en: "Action",
            ru: "Действие",
        },
        qbtAllFiles: {
            en: "All files",
            ru: "Все файлы",
        },
        qbtChooseFiles: {
            en: "Choose files",
            ru: "Выбрать файлы",
        },
        qbtLoadingPleaseWait: {
            en: "Loading please wait...",
            ru: "Загрузка, пожалуйста подождите...",
        },
        qbtTorrentAdded: {
            en: "Torrent added",
            ru: "Торрент добавлен",
        },
        qbtTorrentAddedWithoutFilesPriority: {
            en: "Torrent added, but unable to select files",
            ru: "Торрент добавлен, но не удалось выбрать файлы",
        },
        qbtFailedToAddTorrent: {
            en: "Error adding torrent",
            ru: "Ошибка при добавлении торрента",
        },
        qbtFailedToGetFileList: {
            en: "Failed to get files list",
            ru: "Не удалось получить список файлов",
        },
        qbtStartDownloading: {
            en: "Start downloading",
            ru: "Начать загрузку",
        },
        qbtLampacDLNAMappingPath: {
            en: "Path to DLNA directory",
            ru: "Путь до DLNA директории",
        },
        qbtSequentialDownload: {
            en: "Sequential download",
            ru: "Загружать последовательно",
        },
        qbtPrioritizeDownloadFirstLastPiece: {
            en: "Prioritize download first last piece",
            ru: "Загружать крайние части первыми",
        },
        qbtMoviesCategory: {
            en: "Category name for movies",
            ru: "Название категории для фильмов",
        },
        qbtTvCategory: {
            en: "Category name for TV series",
            ru: "Название категории для сериалов",
        },
        qbtChooseFileForPlay: {
            en: "Select file to play",
            ru: "Выберите файл для воспроизведения",
        },
        qbtPlay: {
            en: "Play",
            ru: "Воспроизвести",
        },
        qbtNoFilesInTorrent: {
            en: "No files",
            ru: "В торренте нет файлов",
        },
        qbtNoDownloadedFilesInTorrent: {
            en: "No downloaded files",
            ru: "Нет скачанных файлов",
        },
        qbtSecond: {
            en: "s",
            ru: "с"
        },
        qbtSpeed: {
            en: "Speed",
            ru: "Скорость"
        },
        qbtChangeFilesPriority: {
            en: "Selecting files",
            ru: "Выбор файлов"
        },
        qbtCompact: {
            en: "Compact",
            ru: "Компактно"
        },
        qbtPlayAll: {
            en: "Play all",
            ru: "Воспроизвести всё"
        },
        qbtResumePlay: {
            en: "Resume playback",
            ru: "Продолжить просмотр"
        },
    }

    // noinspection JSCheckFunctionSignatures
    Lampa.Lang.add(data);
}

function qbtTranslationKey(key) {
    return `qbt${key}`
}

function qbtTranslate(key) {
    return Lampa.Lang.translate(qbtTranslationKey(key), '')
}

export {
    InstallLanguagePack,
    qbtTranslate,
}
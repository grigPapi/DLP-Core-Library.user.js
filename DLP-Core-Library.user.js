// ==UserScript==
// @name         DLP Core Library
// @namespace    https://dlp-automation-suite.org
// @version      1.0.1
// @description  Базовая библиотека общих функций и стилей для DLP-скриптов (исправлена)
// @author       DLP Team
// @match        *://*/*/udlp/*
// @match        *://*/*/ShowEventDetails.do*
// @match        *://*/*token=*
// @match        https://10.1.199.20:8443/*
// @match        http://10.1.199.20:8443/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-start
// @require      DLP-Core-Library.user.js

// ==/UserScript==

(function() {
    'use strict';

    // Проверка, установлена ли уже библиотека
    if (window.DLPCore) {
        console.log('DLP Core Library: уже установлена');
        return;
    }

    /**
     * Базовая библиотека для DLP-скриптов
     * @namespace DLPCore
     */
    window.DLPCore = {
        /**
         * Версия библиотеки
         * @type {string}
         */
        version: '1.0.1',

        /**
         * Конфигурационные параметры
         * @type {Object}
         */
        config: {
            /**
             * Задержка между открытием ссылок (мс)
             * @type {number}
             */
            linkOpenDelay: 3000,

            /**
             * Имя ревьюера по умолчанию
             * @type {string}
             */
            defaultReviewer: 'Grigor',

            /**
             * Настройки для логирования
             * @type {Object}
             */
            logging: {
                /**
                 * Уровень логирования (error, warn, info, debug)
                 * @type {string}
                 */
                level: 'info',

                /**
                 * Показывать или нет временные метки в логах
                 * @type {boolean}
                 */
                showTimestamps: true,

                /**
                 * Показывать или нет название модуля в логах
                 * @type {boolean}
                 */
                showModuleName: true
            },

            /**
             * Настройки UI
             * @type {Object}
             */
            ui: {
                /**
                 * Цветовая схема для кнопок и других элементов
                 * @type {Object}
                 */
                
                colors: {
                    primary: '#3498db',
                    primaryHover: '#2980b9',
                    success: '#2ecc71',
                    successHover: '#27ae60',
                    warning: '#f39c12',
                    warningHover: '#e67e22',
                    danger: '#e74c3c',
                    dangerHover: '#c0392b',
                    neutral: '#95a5a6',
                    neutralHover: '#7f8c8d',
                    lightBg: '#ecf0f1',
                    darkBg: '#34495e'
                }
            }
            
        },

        /**
         * Объект для работы с инцидентами
         * @namespace
         */
        incidents: {
            /**
             * Множественное открытие ссылок на инциденты
             * @param {Object[]} links - Массив ссылок на инциденты
             * @param {number} [delay=DLPCore.config.linkOpenDelay] - Задержка между открытием ссылок в мс
             */
            openLinks: function(links, delay = DLPCore.config.linkOpenDelay) {
                try {
                    if (!Array.isArray(links) || links.length === 0) {
                        DLPCore.logger.warn('Не передано ссылок для открытия', 'Incidents');
                        return;
                    }

                    DLPCore.logger.info(`Открытие ${links.length} ссылок с задержкой ${delay}мс`, 'Incidents');

                    links.forEach((link, index) => {
                        setTimeout(() => {
                            try {
                                // Если доступна функция GM_openInTab, используем ее
                                if (typeof GM_openInTab === 'function') {
                                    GM_openInTab(link.href, { active: false });
                                    DLPCore.logger.debug(`Открыта ссылка через GM_openInTab: ${link.href}`, 'Incidents');
                                } else {
                                    // Иначе открываем через window.open
                                    window.open(link.href, '_blank');
                                    DLPCore.logger.debug(`Открыта ссылка через window.open: ${link.href}`, 'Incidents');
                                }

                                // Отмечаем ссылку как посещенную
                                this.markLinkAsVisited(link.id || DLPCore.page.extractIncidentId(link.href), link.href);
                            } catch (e) {
                                DLPCore.logger.error(`Ошибка при открытии ссылки: ${e.message}`, 'Incidents');
                            }
                        }, index * delay);
                    });
                } catch (error) {
                    DLPCore.logger.error(`Ошибка при открытии ссылок: ${error.message}`, 'Incidents');
                }
            },

            /**
             * Отмечает ссылку как посещенную
             * @param {string} linkId - ID ссылки
             * @param {string} linkHref - URL ссылки
             */
            markLinkAsVisited: function(linkId, linkHref) {
                try {
                    // Получаем текущий список посещенных ссылок
                    const visitedLinks = DLPCore.storage.get('visited_links', {});

                    // Добавляем новую ссылку
                    visitedLinks[linkId] = {
                        href: linkHref,
                        timestamp: Date.now()
                    };

                    // Сохраняем обновленный список
                    DLPCore.storage.set('visited_links', visitedLinks);

                    // Отмечаем ссылки в DOM
                    this.markLinkInDom(linkId);

                    DLPCore.logger.debug(`Ссылка отмечена как посещенная: ${linkId}`, 'Incidents');
                } catch (e) {
                    DLPCore.logger.error(`Ошибка при отметке ссылки: ${e.message}`, 'Incidents');
                }
            },

            /**
             * Проверяет, была ли ссылка посещена
             * @param {string} linkId - ID ссылки
             * @returns {boolean} true, если ссылка была посещена
             */
            isLinkVisited: function(linkId) {
                try {
                    const visitedLinks = DLPCore.storage.get('visited_links', {});
                    return !!visitedLinks[linkId];
                } catch (error) {
                    DLPCore.logger.error(`Ошибка при проверке посещения ссылки: ${error.message}`, 'Incidents');
                    return false;
                }
            },

            /**
             * Отмечает ссылку в DOM как посещенную
             * @param {string} linkId - ID ссылки
             */
            markLinkInDom: function(linkId) {
                try {
                    // Находим все ссылки с этим ID на странице
                    const links = Array.from(document.querySelectorAll('a[href*="ShowEventDetails.do"]'));
                    links.forEach(link => {
                        const id = DLPCore.page.extractIncidentId(link);
                        if (id === linkId.toString()) {
                            link.classList.add('dlp-visited-link');
                        }
                    });
                } catch (error) {
                    DLPCore.logger.error(`Ошибка при отметке ссылки в DOM: ${error.message}`, 'Incidents');
                }
            },

            /**
             * Применяет стили к посещенным ссылкам на странице
             */
            applyVisitedStyles: function() {
                try {
                    const visitedLinks = DLPCore.storage.get('visited_links', {});

                    // Перебираем все ссылки на странице и отмечаем те, которые есть в хранилище
                    const links = Array.from(document.querySelectorAll('a[href*="ShowEventDetails.do"]'));
                    links.forEach(link => {
                        const id = DLPCore.page.extractIncidentId(link);
                        if (visitedLinks[id]) {
                            link.classList.add('dlp-visited-link');
                        }
                    });

                    DLPCore.logger.debug('Применены стили для посещенных ссылок', 'Incidents');
                } catch (error) {
                    DLPCore.logger.error(`Ошибка при применении стилей: ${error.message}`, 'Incidents');
                }
            },

            /**
             * Очищает историю посещенных ссылок
             * @param {boolean} [confirm=true] - Требовать ли подтверждения
             * @returns {boolean} true, если история была очищена
             */
            clearVisitedLinks: function(confirm = true) {
                try {
                    if (confirm && !window.confirm('Вы уверены, что хотите очистить историю посещенных ссылок?')) {
                        return false;
                    }

                    DLPCore.storage.set('visited_links', {});

                    // Удаляем классы .dlp-visited-link со всех элементов
                    document.querySelectorAll('.dlp-visited-link').forEach(el => {
                        el.classList.remove('dlp-visited-link');
                    });

                    DLPCore.logger.info('История посещений очищена', 'Incidents');

                    return true;
                } catch (error) {
                    DLPCore.logger.error(`Ошибка при очистке истории: ${error.message}`, 'Incidents');
                    return false;
                }
            }
        },

        /**
         * Инициализирует библиотеку
         * @param {Object} [customConfig] - Пользовательские настройки
         */
        init: function(customConfig) {
            console.log('DLP Core Library: Инициализация...');

            // Объединить пользовательские настройки с настройками по умолчанию
            if (customConfig) {
                this.config = this.utils.mergeObjects(this.config, customConfig);
            }

            // Инициализировать хранилище
            this.storage.init();

            // Добавить базовые стили
            this.ui.injectBaseStyles();

            console.log('DLP Core Library: Инициализация завершена');
        },

        /**
         * Объект для работы с хранилищем данных
         * @namespace
         */
        storage: {
            /**
             * Префикс для ключей хранилища
             * @type {string}
             */
            keyPrefix: 'dlp_',

            /**
             * Инициализирует хранилище
             */
            init: function() {
                console.log('DLP Core Storage: Инициализация...');
            },

            /**
             * Сохраняет значение в хранилище
             * @param {string} key - Ключ
             * @param {*} value - Значение для сохранения
             */
            set: function(key, value) {
                const prefixedKey = this.keyPrefix + key;

                // Сначала пробуем GM_setValue, если доступно
                if (typeof GM_setValue === 'function') {
                    try {
                        GM_setValue(prefixedKey, value);
                        return;
                    } catch(e) {
                        console.error('DLP Storage: Ошибка сохранения через GM_setValue', e);
                    }
                }

                // Иначе используем localStorage
                try {
                    const serializedValue = JSON.stringify(value);
                    localStorage.setItem(prefixedKey, serializedValue);
                } catch (e) {
                    console.error('DLP Storage: Ошибка сохранения в хранилище', e);
                }
            },

            /**
             * Получает значение из хранилища
             * @param {string} key - Ключ
             * @param {*} [defaultValue=null] - Значение по умолчанию
             * @returns {*} Значение из хранилища или значение по умолчанию
             */
            get: function(key, defaultValue = null) {
                const prefixedKey = this.keyPrefix + key;

                // Сначала пробуем GM_getValue, если доступно
                if (typeof GM_getValue === 'function') {
                    try {
                        return GM_getValue(prefixedKey, defaultValue);
                    } catch(e) {
                        console.error('DLP Storage: Ошибка получения через GM_getValue', e);
                    }
                }

                // Иначе используем localStorage
                try {
                    const serializedValue = localStorage.getItem(prefixedKey);
                    if (serializedValue === null) {
                        return defaultValue;
                    }
                    return JSON.parse(serializedValue);
                } catch (e) {
                    console.error('DLP Storage: Ошибка получения из хранилища', e);
                    return defaultValue;
                }
            },

            /**
             * Удаляет значение из хранилища
             * @param {string} key - Ключ
             */
            remove: function(key) {
                const prefixedKey = this.keyPrefix + key;

                // Для GM_setValue просто устанавливаем undefined
                if (typeof GM_setValue === 'function' && typeof GM_deleteValue === 'function') {
                    try {
                        GM_deleteValue(prefixedKey);
                        return;
                    } catch(e) {
                        console.error('DLP Storage: Ошибка удаления через GM_deleteValue', e);
                    }
                }

                // Иначе используем localStorage
                try {
                    localStorage.removeItem(prefixedKey);
                } catch (e) {
                    console.error('DLP Storage: Ошибка удаления из хранилища', e);
                }
            }
        },

        /**
         * Объект для работы с UI
         * @namespace
         */
        ui: {
            /**
             * CSS-стили для всех скриптов
             * @type {string}
             */
            baseStyles: `
                /* Общие стили для всех DLP-скриптов */
                .dlp-button {
                    display: inline-block;
                    padding: 5px 10px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: bold;
                    text-align: center;
                    transition: background-color 0.2s ease;
                    border: none;
                    color: white;
                    margin: 2px 5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }

                .dlp-button:hover {
                    opacity: 0.9;
                }

                .dlp-button:active {
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
                }

                /* Кнопки разных цветов */
                .dlp-button-primary {
                    background-color: #3498db;
                }

                .dlp-button-primary:hover {
                    background-color: #2980b9;
                }

                .dlp-button-success {
                    background-color: #2ecc71;
                }

                .dlp-button-success:hover {
                    background-color: #27ae60;
                }

                .dlp-button-warning {
                    background-color: #f39c12;
                }

                .dlp-button-warning:hover {
                    background-color: #e67e22;
                }

                .dlp-button-danger {
                    background-color: #e74c3c;
                }

                .dlp-button-danger:hover {
                    background-color: #c0392b;
                }

                .dlp-button-neutral {
                    background-color: #95a5a6;
                }

                .dlp-button-neutral:hover {
                    background-color: #7f8c8d;
                }

                /* Диалоговые окна */
                .dlp-modal {
                    position: fixed;
                    z-index: 10000;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .dlp-modal-content {
                    background-color: white;
                    border-radius: 5px;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                    padding: 20px;
                    max-width: 80%;
                    max-height: 80%;
                    overflow: auto;
                    position: relative;
                }

                .dlp-modal-close {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    font-size: 24px;
                    color: #aaa;
                    cursor: pointer;
                }

                .dlp-modal-close:hover {
                    color: black;
                }

                .dlp-modal-header {
                    border-bottom: 1px solid #eee;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                }

                .dlp-modal-footer {
                    border-top: 1px solid #eee;
                    margin-top: 15px;
                    padding-top: 10px;
                    text-align: right;
                }

                /* Посещенные ссылки */
                .dlp-visited-link {
                    background-color: #d5f5e3 !important;
                    color: #27ae60 !important;
                    font-weight: bold;
                    text-decoration: none !important;
                }

                /* Тултипы */
                .dlp-tooltip {
                    position: fixed;
                    background-color: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 10px;
                    border-radius: 5px;
                    z-index: 9999;
                    font-size: 12px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                    max-width: 300px;
                }

                /* Переключатели */
                .dlp-toggle {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 20px;
                }

                .dlp-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .dlp-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                    border-radius: 34px;
                }

                .dlp-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 2px;
                    bottom: 2px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }

                .dlp-toggle input:checked + .dlp-toggle-slider {
                    background-color: #3498db;
                }

                .dlp-toggle input:checked + .dlp-toggle-slider:before {
                    transform: translateX(20px);
                }
            `,

            /**
             * Добавляет базовые стили на страницу
             */
            injectBaseStyles: function() {
                try {
                    if (typeof GM_addStyle === 'function') {
                        GM_addStyle(this.baseStyles);
                    } else {
                        const styleElement = document.createElement('style');
                        styleElement.textContent = this.baseStyles;

                        // Защита от синтаксической ошибки при appendChild
                        const safeAppend = function(parent, child) {
                            try {
                                parent.appendChild(child);
                            } catch (e) {
                                console.error('DLPCore: Ошибка при добавлении стилей:', e);

                                // Альтернативный способ добавления стилей
                                const heads = document.getElementsByTagName('head');
                                if (heads && heads.length > 0) {
                                    try {
                                        heads[0].appendChild(child);
                                    } catch (e2) {
                                        console.error('DLPCore: Также не удалось добавить стили альтернативным способом:', e2);
                                    }
                                }
                            }
                        };

                        // Если head есть в документе, добавляем стили
                        if (document.head) {
                            safeAppend(document.head, styleElement);
                        } else {
                            // Если нет, ждем когда будет создан head
                            document.addEventListener('DOMContentLoaded', function() {
                                if (document.head) {
                                    safeAppend(document.head, styleElement);
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('DLPCore: Ошибка при добавлении стилей:', error);
                }
            },

            /**
             * Создает кнопку с заданными параметрами
             * @param {Object} options - Параметры кнопки
             * @param {string} options.text - Текст кнопки
             * @param {function} options.onClick - Обработчик нажатия
             * @param {string} [options.type='primary'] - Тип кнопки (primary, success, warning, danger)
             * @param {string} [options.className=''] - Дополнительные классы
             * @returns {HTMLButtonElement} Созданная кнопка
             */
            createButton: function(options) {
                try {
                    const button = document.createElement('button');
                    button.textContent = options.text;
                    button.className = `dlp-button dlp-button-${options.type || 'primary'} ${options.className || ''}`;

                    if (options.onClick) {
                        button.addEventListener('click', options.onClick);
                    }

                    return button;
                } catch (error) {
                    console.error('DLPCore: Ошибка при создании кнопки:', error);
                    return document.createElement('button'); // Возвращаем пустую кнопку в случае ошибки
                }
            },

            /**
             * Создает модальное окно
             * @param {Object} options - Параметры модального окна
             * @param {string} options.title - Заголовок окна
             * @param {string|HTMLElement} options.content - Содержимое окна
             * @param {Object[]} [options.buttons=[]] - Массив кнопок в футере окна
             * @param {boolean} [options.closeOnOutsideClick=true] - Закрывать ли окно по клику вне его
             * @returns {HTMLDivElement} Созданное модальное окно
             */
            createModal: function(options) {
                try {
                    const modal = document.createElement('div');
                    modal.className = 'dlp-modal';

                    const modalContent = document.createElement('div');
                    modalContent.className = 'dlp-modal-content';

                    // Добавляем крестик для закрытия
                    const closeBtn = document.createElement('span');
                    closeBtn.className = 'dlp-modal-close';
                    closeBtn.innerHTML = '&times;';
                    closeBtn.addEventListener('click', function() {
                        document.body.removeChild(modal);
                    });
                    modalContent.appendChild(closeBtn);

                    // Добавляем заголовок
                    if (options.title) {
                        const header = document.createElement('div');
                        header.className = 'dlp-modal-header';

                        const title = document.createElement('h3');
                        title.textContent = options.title;
                        title.style.margin = '0';
                        header.appendChild(title);

                        modalContent.appendChild(header);
                    }

                    // Добавляем содержимое
                    const contentElement = document.createElement('div');
                    contentElement.className = 'dlp-modal-body';

                    if (typeof options.content === 'string') {
                        contentElement.innerHTML = options.content;
                    } else if (options.content instanceof HTMLElement) {
                        contentElement.appendChild(options.content);
                    }

                    modalContent.appendChild(contentElement);

                    // Добавляем футер с кнопками, если они заданы
                    if (options.buttons && options.buttons.length > 0) {
                        const footer = document.createElement('div');
                        footer.className = 'dlp-modal-footer';

                        options.buttons.forEach(btnOptions => {
                            const button = this.createButton(btnOptions);
                            footer.appendChild(button);
                        });

                        modalContent.appendChild(footer);
                    }

                    modal.appendChild(modalContent);

                    // Добавляем обработчик клика вне модального окна
                    if (options.closeOnOutsideClick !== false) {
                        modal.addEventListener('click', function(e) {
                            if (e.target === modal) {
                                try {
                                    document.body.removeChild(modal);
                                } catch (err) {
                                    console.error('DLPCore: Ошибка при закрытии модального окна:', err);
                                }
                            }
                        });
                    }

                    // Добавляем модальное окно на страницу
                    document.body.appendChild(modal);

                    return modal;
                } catch (error) {
                    console.error('DLPCore: Ошибка при создании модального окна:', error);
                    return document.createElement('div'); // Возвращаем пустой div в случае ошибки
                }
            },

            /**
             * Создает блок подсказки (тултип)
             * @param {Object} options - Параметры тултипа
             * @param {string} options.text - Текст подсказки
             * @param {number} options.x - Координата X
             * @param {number} options.y - Координата Y
             * @param {number} [options.duration=3000] - Длительность показа в мс (0 - не скрывать)
             * @returns {HTMLDivElement} Созданный тултип
             */
            createTooltip: function(options) {
                try {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'dlp-tooltip';
                    tooltip.textContent = options.text;
                    tooltip.style.left = `${options.x}px`;
                    tooltip.style.top = `${options.y}px`;

                    document.body.appendChild(tooltip);

                    // Автоматически скрываем тултип через заданное время
                    if (options.duration !== 0) {
                        setTimeout(() => {
                            if (tooltip.parentNode) {
                                tooltip.parentNode.removeChild(tooltip);
                            }
                        }, options.duration || 3000);
                    }

                    return tooltip;
                } catch (error) {
                    console.error('DLPCore: Ошибка при создании тултипа:', error);
                    return document.createElement('div'); // Возвращаем пустой div в случае ошибки
                }
            },

            /**
             * Показывает уведомление
             * @param {Object} options - Параметры уведомления
             * @param {string} options.message - Текст уведомления
             * @param {string} [options.type='info'] - Тип уведомления (info, success, warning, error)
             * @param {number} [options.duration=3000] - Длительность показа в мс
             */
            showNotification: function(options) {
                try {
                    const notification = document.createElement('div');
                    notification.className = `dlp-notification dlp-notification-${options.type || 'info'}`;
                    notification.textContent = options.message;

                    // Добавляем стили для уведомления, если их еще нет
                    if (!document.querySelector('#dlp-notification-styles')) {
                        const notificationStyles = `
                            .dlp-notification {
                                position: fixed;
                                top: 20px;
                                right: 20px;
                                padding: 10px 15px;
                                border-radius: 4px;
                                font-size: 14px;
                                z-index: 10001;
                                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                                animation: dlp-notification-slide-in 0.3s ease;
                            }

                            @keyframes dlp-notification-slide-in {
                                from { transform: translateX(100%); }
                                to { transform: translateX(0); }
                            }

                            .dlp-notification-info {
                                background-color: #3498db;
                                color: white;
                            }

                            .dlp-notification-success {
                                background-color: #2ecc71;
                                color: white;
                            }

                            .dlp-notification-warning {
                                background-color: #f39c12;
                                color: white;
                            }

                            .dlp-notification-error {
                                background-color: #e74c3c;
                                color: white;
                            }
                        `;

                        if (typeof GM_addStyle === 'function') {
                            GM_addStyle(notificationStyles);
                        } else {
                            const styleElement = document.createElement('style');
                            styleElement.id = 'dlp-notification-styles';
                            styleElement.textContent = notificationStyles;

                            try {
                                document.head.appendChild(styleElement);
                            } catch (e) {
                                console.error('DLPCore: Ошибка при добавлении стилей уведомления:', e);
                            }
                        }
                    }

                    try {
                        document.body.appendChild(notification);
                    } catch (e) {
                        console.error('DLPCore: Ошибка при добавлении уведомления в DOM:', e);
                        return;
                    }

                    // Автоматически скрываем через заданное время
                    setTimeout(() => {
                        notification.style.animation = 'dlp-notification-slide-out 0.3s ease forwards';

                        // Добавляем стили для анимации исчезновения
                        if (!document.querySelector('#dlp-notification-slide-out')) {
                            const slideOutStyles = `
                                @keyframes dlp-notification-slide-out {
                                    from { transform: translateX(0); }
                                    to { transform: translateX(100%); }
                                }
                            `;

                            if (typeof GM_addStyle === 'function') {
                                GM_addStyle(slideOutStyles);
                            } else {
                                const styleElement = document.createElement('style');
                                styleElement.id = 'dlp-notification-slide-out';
                                styleElement.textContent = slideOutStyles;

                                try {
                                    document.head.appendChild(styleElement);
                                } catch (e) {
                                    console.error('DLPCore: Ошибка при добавлении стилей анимации уведомления:', e);
                                }
                            }
                        }

                        setTimeout(() => {
                            if (notification.parentNode) {
                                try {
                                    notification.parentNode.removeChild(notification);
                                } catch (e) {
                                    console.error('DLPCore: Ошибка при удалении уведомления:', e);
                                }
                            }
                        }, 300);
                    }, options.duration || 3000);
                } catch (error) {
                    console.error('DLPCore: Ошибка при создании уведомления:', error);
                }
            }
        },

        /**
         * Объект для работы со страницей DLP
         * @namespace
         */
        page: {
            /**
             * Проверяет, находимся ли мы на странице деталей события
             * @returns {boolean} true, если это страница деталей события
             */
            isEventDetailsPage: function() {
                try {
                    return document.querySelector('#eventStatus') !== null ||
                        document.querySelector('#eventResolution') !== null ||
                        document.querySelector('.customContainer') !== null;
                } catch (error) {
                    console.error('DLPCore: Ошибка при проверке страницы деталей события:', error);
                    return false;
                }
            },

            /**
             * Проверяет, находимся ли мы на странице списка DLP
             * @returns {boolean} true, если это страница списка DLP
             */
            isDLPListPage: function() {
                try {
                    return document.querySelector('a[href*="ShowEventDetails.do"]') !== null ||
                        document.querySelector('.dlp-interface-button, .dlp-main-button') !== null;
                } catch (error) {
                    console.error('DLPCore: Ошибка при проверке страницы списка DLP:', error);
                    return false;
                }
            },

            /**
             * Извлекает ID инцидента из URL или из элемента
             * @param {string|Element} source - URL или элемент с атрибутом href
             * @returns {string} ID инцидента или 'unknown', если ID не найден
             */
            extractIncidentId: function(source) {
                try {
                    let url = '';

                    if (typeof source === 'string') {
                        url = source;
                    } else if (source && source.href) {
                        // Если source является элементом с атрибутом href
                        url = source.href;

                        // Пробуем также извлечь из textContent, если он числовой
                        const textId = source.textContent.trim();
                        if (/^\d+$/.test(textId)) {
                            return textId;
                        }
                    } else {
                        return 'unknown';
                    }

                    // Извлекаем ID из URL
                    const match = url.match(/uid=(\d+)/);
                    return match ? match[1] : 'unknown';
                } catch (error) {
                    console.error('DLPCore: Ошибка при извлечении ID инцидента:', error);
                    return 'unknown';
                }
            },

            /**
             * Получает токен безопасности со страницы
             * @returns {string} Токен безопасности или пустая строка, если токен не найден
             */
            getSecurityToken: function() {
                try {
                    const tokenInput = document.querySelector('input[name="orion.user.security.token"]');
                    return tokenInput ? tokenInput.value : '';
                } catch (error) {
                    console.error('DLPCore: Ошибка при получении токена безопасности:', error);
                    return '';
                }
            },

            /**
             * Получает AJAX nonce со страницы
             * @returns {string} AJAX nonce или пустая строка, если nonce не найден
             */
            getAjaxNonce: function() {
                try {
                    const nonceInput = document.querySelector('input[name="ajaxNonce"]');
                    return nonceInput ? nonceInput.value : '';
                } catch (error) {
                    console.error('DLPCore: Ошибка при получении AJAX nonce:', error);
                    return '';
                }
            }
        },

        /**
         * Объект с утилитами
         * @namespace
         */
        utils: {
            /**
             * Соединяет два объекта рекурсивно
             * @param {Object} target - Целевой объект
             * @param {Object} source - Исходный объект
             * @returns {Object} Объединенный объект
             */
            mergeObjects: function(target, source) {
                try {
                    const output = Object.assign({}, target);

                    if (this.isObject(target) && this.isObject(source)) {
                        Object.keys(source).forEach(key => {
                            if (this.isObject(source[key])) {
                                if (!(key in target)) {
                                    Object.assign(output, { [key]: source[key] });
                                } else {
                                    output[key] = this.mergeObjects(target[key], source[key]);
                                }
                            } else {
                                Object.assign(output, { [key]: source[key] });
                            }
                        });
                    }

                    return output;
                } catch (error) {
                    console.error('DLPCore: Ошибка при объединении объектов:', error);
                    return target;
                }
            },

            /**
             * Проверяет, является ли значение объектом
             * @param {*} item - Проверяемое значение
             * @returns {boolean} true, если значение является объектом
             */
            isObject: function(item) {
                return (item && typeof item === 'object' && !Array.isArray(item));
            },

            /**
             * Форматирует дату в строку
             * @param {Date} [date=new Date()] - Дата для форматирования
             * @param {string} [format='YYYY-MM-DD HH:MM:SS'] - Формат строки
             * @returns {string} Отформатированная строка
             */
            formatDate: function(date = new Date(), format = 'YYYY-MM-DD HH:MM:SS') {
                try {
                    const pad = (n, s = 2) => (`${new Array(s).fill(0).join('')}${n}`).slice(-s);

                    const year = date.getFullYear();
                    const month = pad(date.getMonth() + 1);
                    const day = pad(date.getDate());
                    const hours = pad(date.getHours());
                    const minutes = pad(date.getMinutes());
                    const seconds = pad(date.getSeconds());

                    return format
                        .replace('YYYY', year)
                        .replace('MM', month)
                        .replace('DD', day)
                        .replace('HH', hours)
                        .replace('MM', minutes)
                        .replace('SS', seconds);
                } catch (error) {
                    console.error('DLPCore: Ошибка при форматировании даты:', error);
                    return date.toString();
                }
            },

            /**
             * Создает дебаунс-функцию
             * @param {function} func - Исходная функция
             * @param {number} wait - Время ожидания в мс
             * @param {boolean} [immediate=false] - Вызывать ли функцию немедленно
             * @returns {function} Дебаунс-функция
             */
            debounce: function(func, wait, immediate = false) {
                let timeout;

                return function executedFunction(...args) {
                    const context = this;

                    const later = function() {
                        timeout = null;
                        if (!immediate) func.apply(context, args);
                    };

                    const callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);

                    if (callNow) func.apply(context, args);
                };
            },

            /**
             * Создает троттл-функцию
             * @param {function} func - Исходная функция
             * @param {number} limit - Минимальное время между вызовами в мс
             * @returns {function} Троттл-функция
             */
            throttle: function(func, limit) {
                let inThrottle;

                return function(...args) {
                    const context = this;

                    if (!inThrottle) {
                        func.apply(context, args);
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, limit);
                    }
                };
            }
        },

        /**
         * Объект для логирования
         * @namespace
         */
        logger: {
            /**
             * Уровни логирования
             * @enum {number}
             */
            levels: {
                error: 0,
                warn: 1,
                info: 2,
                debug: 3
            },

            /**
             * Выводит сообщение об ошибке в консоль
             * @param {string} message - Сообщение для вывода
             * @param {string} [moduleName=''] - Название модуля
             */
            error: function(message, moduleName = '') {
                this.log(message, 'error', moduleName);
            },

            /**
             * Выводит предупреждение в консоль
             * @param {string} message - Сообщение для вывода
             * @param {string} [moduleName=''] - Название модуля
             */
            warn: function(message, moduleName = '') {
                this.log(message, 'warn', moduleName);
            },

            /**
             * Выводит информационное сообщение в консоль
             * @param {string} message - Сообщение для вывода
             * @param {string} [moduleName=''] - Название модуля
             */
            info: function(message, moduleName = '') {
                this.log(message, 'info', moduleName);
            },

            /**
             * Выводит отладочное сообщение в консоль
             * @param {string} message - Сообщение для вывода
             * @param {string} [moduleName=''] - Название модуля
             */
            debug: function(message, moduleName = '') {
                this.log(message, 'debug', moduleName);
            },

            /**
             * Выводит сообщение в консоль с учетом уровня логирования
             * @param {string} message - Сообщение для вывода
             * @param {string} level - Уровень логирования
             * @param {string} [moduleName=''] - Название модуля
             */
            log: function(message, level, moduleName = '') {
                try {
                    // Проверяем, нужно ли выводить сообщение с данным уровнем
                    const configLevel = DLPCore.config.logging.level;
                    if (this.levels[level] > this.levels[configLevel]) {
                        return;
                    }

                    const timestamp = DLPCore.config.logging.showTimestamps ?
                        `[${DLPCore.utils.formatDate(new Date(), 'HH:MM:SS')}] ` : '';

                    const modulePrefix = DLPCore.config.logging.showModuleName && moduleName ?
                        `[${moduleName}] ` : '';

                    const finalMessage = `${timestamp}${modulePrefix}${message}`;

                    switch (level) {
                        case 'error':
                            console.error(finalMessage);
                            break;
                        case 'warn':
                            console.warn(finalMessage);
                            break;
                        case 'debug':
                            console.debug(finalMessage);
                            break;
                        case 'info':
                        default:
                            console.info(finalMessage);
                            break;
                    }
                } catch (error) {
                    // Запасной вариант при ошибке логирования
                    console.error('DLPCore Logger Error:', error);
                    console.error(message);
                }
            }
        }
    };

    // Автоматически применяем стили для посещенных ссылок при загрузке страницы
    if (DLPCore.page.isDLPListPage()) {
        DLPCore.incidents.applyVisitedStyles();
    }
})();

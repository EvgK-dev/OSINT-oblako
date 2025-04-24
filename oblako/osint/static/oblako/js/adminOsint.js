function createCatalog() {
    hideAllForms();  
    toggleFormVisibility('.createCatalog');  
    addCategoriesToSelect('parent-catalog');
    initializeCatalogSearchAndSelect();
}

function deleteCatalog() {
    hideAllForms();  
    toggleFormVisibility('.deleteCatalog');  
    addCategoriesToSelect('catalog-del');
    initializeCatalogSearchAndSelect();
}

function modifyCatalog() {
    hideAllForms();  
    toggleFormVisibility('.modifyCatalog');  
    addCategoriesToSelect('catalog-select');
    setupLinkSelectionHandler();
    initializeCatalogSearchAndSelect();
}

function createLink() {
    hideAllForms();  
    toggleFormVisibility('.createLink');  
    populateCatalogCheckboxes('.createLink');
}

function modifyLink() {
    hideAllForms();  
    toggleFormVisibility('.modifyLink');  
    populateCatalogCheckboxes('.modifyLink');

    const pageData = gatherPageData();  
    updateLinkSelect('.modifyLink', pageData);

    setupLinkSelectionHandler();
    initializeLinkSearchAndSelect();
}

function deleteLink() {
    hideAllForms();
    toggleFormVisibility('.deleteLink');

    const pageData = gatherPageData();  
    updateLinkSelect('.deleteLink', pageData);

    initializeLinkSearchAndSelect();
}

function hideAllForms() {
    const allForms = document.querySelectorAll('.catalog-form, .link-form');
    allForms.forEach(form => {
        form.classList.add('none');
        form.classList.remove('visible');  
    });
}

function toggleFormVisibility(formSelector) {
    const form = document.querySelector(formSelector);
    if (!form) return;  

    if (form.classList.contains('visible')) {
        form.classList.remove('visible');
        form.classList.add('invisible');
    } else {
        form.classList.remove('invisible', 'none');
        form.classList.add('visible');
    }
}


//################################################################################
//    клик добавить / удалить / изменить каталоги
//###############################################################################

// Добавляет каталоги в выпадающий список <select> по ID
function addCategoriesToSelect(selectId) {
    const parentCatalogSelect = document.getElementById(selectId);

    if (!parentCatalogSelect) {
        console.error(`Не удалось найти элемент <select> с id="${selectId}"`);
        return;
    }

    parentCatalogSelect.innerHTML = '';

    addOptionToSelect(parentCatalogSelect, '', 'Выберите каталог');

    const addedCatalogs = new Set();

    const sortedCatalogs = gatherAndSortCatalogs();

    sortedCatalogs.forEach(function (catalog) {
        if (!addedCatalogs.has(catalog.id)) {
            addedCatalogs.add(catalog.id);
            addOptionToSelect(parentCatalogSelect, catalog.id, catalog.name);
        }
    });
}

// Возвращает отсортированный список каталогов: { id, name }
function gatherAndSortCatalogs() {

    const allCatalogs = [
        ...document.querySelectorAll('.level-one-conteiner'), 
        ...document.querySelectorAll('.level-next-conteiner') 
    ];

    return Array.from(allCatalogs)
        .map(catalogContainer => {
            const catalogNameElement = catalogContainer.querySelector('.osint-next-circle-name p');
            const catalogId = catalogContainer.getAttribute('data-cat');

            if (!catalogNameElement || !catalogId) {
                return null; 
            }

            const catalogName = catalogNameElement.textContent.trim();
            return { id: catalogId, name: catalogName };
        })
        .filter(catalog => catalog !== null && catalog.name !== '')
        .sort((a, b) => a.name.localeCompare(b.name)); // Сортировка по имени
}

// Добавляет <option> в <select>
function addOptionToSelect(selectElement, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    if (value === '') {
        option.disabled = false; 
        option.selected = true; 
    }
    selectElement.appendChild(option);
}

//################################################################################
// Обработка действий: добавление / удаление / изменение ссылок
//################################################################################

// Получает данные о каталогах и ссылках на странице
function gatherPageData() {
    const data = {
        catalogs: [], // Список каталогов с ссылками
        links: []     // Список уникальных ссылок
    };

    const linkMap = {}; // Карта для хранения ссылок

    // Обработка контейнеров каталогов
    document.querySelectorAll('.level-next-conteiner, .level-one-conteiner').forEach(container => {
        const catalogId = container.getAttribute('data-cat');
        const catalogName = container.querySelector('.osint-next-circle-name p')?.textContent.trim();

        if (!catalogId || !catalogName) return;

        const links = []; // Список ссылок для текущего каталога

        // Обработка блоков ссылок
        container.querySelectorAll('.link-block').forEach(linkBlock => {
            const linkId = linkBlock.getAttribute('data-link').trim();
            const rating = linkBlock.querySelector('.link-main-info')?.getAttribute('data-reiting') || '1';

            if (linkMap[linkId]) {
                // Если ссылка уже есть, добавляем каталог в список
                linkMap[linkId].catalog_ids.push(catalogId);
            } else {
                // Если ссылка новая, создаём объект
                linkMap[linkId] = {
                    id: linkId,
                    name: linkBlock.querySelector('.link')?.textContent.trim(),
                    url: linkBlock.querySelector('.link')?.getAttribute('href'),
                    comment: linkBlock.querySelector('.link-addition-info p')?.textContent.trim(),
                    is_paid: !!linkBlock.querySelector('.link-main-info.pay'),
                    is_folder: !!linkBlock.querySelector('.link-main-info.folder'),
                    rating: rating,
                    catalog_ids: [catalogId]  
                };
            }

            links.push(linkMap[linkId]);  
        });

        data.catalogs.push({ id: catalogId, name: catalogName, links });
    });

    // Преобразование объекта ссылок в массив и уникализация catalog_ids
    data.links = Object.values(linkMap).map(link => {
        link.catalog_ids = [...new Set(link.catalog_ids)];  
        return link;
    });

    return data;
}

// Обновляет список ссылок в форме удаления ссылок
function updateLinkSelect(formSelector, pageData) {

    const uniqueLinks = {}; // Карта для уникальных ссылок
    pageData.links.forEach(link => {
        if (!uniqueLinks[link.id]) {
            uniqueLinks[link.id] = link.name; // Добавляем ссылку, если ещё нет
        }
    });

    // Сортируем ссылки по имени
    const sortedLinks = Object.entries(uniqueLinks).sort((a, b) => a[1].localeCompare(b[1]));

    // Находим элемент select в форме
    const selectElement = document.querySelector(`${formSelector} #select-link`);
    if (selectElement) {
        selectElement.innerHTML = ''; // Очищаем текущие опции

        // Добавляем опцию по умолчанию
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Выберите ссылку';
        emptyOption.disabled = true;
        emptyOption.selected = true;
        selectElement.appendChild(emptyOption);

        // Добавляем ссылки в список
        sortedLinks.forEach(([id, name]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            selectElement.appendChild(option);
        });
    }
}

// Заполняет чекбоксы "Привязать к каталогу" в форме
function populateCatalogCheckboxes(nameForm) {
    const catalogCheckboxContainer = document.querySelector(`${nameForm} .link-form-group-edit`);
    if (!catalogCheckboxContainer) {
        console.error('Не удалось найти контейнер для чекбоксов "Привязать к каталогу".');
        return;
    }

    // Удаляем старые метки чекбоксов
    catalogCheckboxContainer.querySelectorAll('.link-form-checkbox-label').forEach(label => label.remove());

    // Получаем и сортируем каталоги
    const sortedCatalogs = gatherAndSortCatalogs();

    // Добавляем новые чекбоксы для каждого каталога
    sortedCatalogs.forEach(catalog => {
        const label = document.createElement('label');
        label.classList.add('link-form-checkbox-label');

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = `${catalog.id}`;
        input.classList.add('link-form-checkbox');

        label.appendChild(input);
        label.appendChild(document.createTextNode(` ${catalog.name}`));

        catalogCheckboxContainer.appendChild(label);
    });
}

// Настройка обработчика выбора ссылки для редактирования
function setupLinkSelectionHandler() {
    const linkSelect = document.getElementById('select-link');
    const newLinkNameInput = document.getElementById('new-link-name');
    const linkUrlInput = document.getElementById('link-url-update');
    const linkCommentTextarea = document.getElementById('link-comment-update');
    const isPaidCheckbox = document.getElementById('is-paid-update');
    const isDirectoryCheckbox = document.getElementById('is-directory-update');
    const linkRatingSelect = document.getElementById('link-rating-update');
    const catalogCheckboxes = document.querySelectorAll('.link-form-checkbox-label input');

    if (!linkSelect) {
        console.error('Поле выбора ссылок не найдено');
        return;
    }

    // Обработчик выбора ссылки
    linkSelect.addEventListener('change', function () {
        const selectedLinkId = linkSelect.value;
        if (!selectedLinkId) {
            console.warn('Не выбрана ссылка для редактирования');
            return;
        }

        const pageData = gatherPageData();
        const selectedLink = pageData.links.find(link => link.id === selectedLinkId);
        if (!selectedLink) {
            console.warn(`Данные для ссылки с id="${selectedLinkId}" не найдены`);
            return;
        }

        // Заполнение формы данными выбранной ссылки
        newLinkNameInput.value = ''; 
        linkUrlInput.value = selectedLink.url || '';
        linkCommentTextarea.value = selectedLink.comment || '';
        isPaidCheckbox.checked = selectedLink.is_paid || false;
        isDirectoryCheckbox.checked = selectedLink.is_folder || false;
        linkRatingSelect.value = selectedLink.rating || '3';

        // Обновление чекбоксов привязки к каталогам
        catalogCheckboxes.forEach(checkbox => {
            const catalogId = checkbox.name.split('_update')[0].replace('catalog_link_', '');
            checkbox.checked = selectedLink.catalog_ids && selectedLink.catalog_ids.includes(catalogId);
        });
    });
}

// Инициализация поиска ссылок и обновления выбора
function initializeLinkSearchAndSelect() {
    const searchInputs = document.querySelectorAll('#search-link');
    const selectLinks = document.querySelectorAll('#select-link');

    // Загрузка ссылок с страницы и заполнение select
    function loadLinksFromPage() {
        const pageData = gatherPageData(); 
        populateSelects(pageData.links);
    }

    // Заполнение всех селектов ссылками
    function populateSelects(links) {
        selectLinks.forEach(selectLink => {
            selectLink.innerHTML = ''; // Очистка текущих опций
            links.forEach(link => {
                const option = document.createElement('option');
                option.value = link.id;
                option.textContent = link.name;
                selectLink.appendChild(option);
            });
        });
    }

    // Обработчик поиска по ссылкам
    searchInputs.forEach((searchInput, index) => {
        searchInput.addEventListener('input', function () {
            const searchValue = this.value.toLowerCase();
            const correspondingSelect = selectLinks[index]; 
            Array.from(correspondingSelect.options).forEach(option => {
                option.style.display = option.text.toLowerCase().includes(searchValue) ? '' : 'none';
            });
        });
    });

    loadLinksFromPage(); // Инициализация данных для выбора ссылок
}

// Инициализация поиска по каталогам
function initializeCatalogSearchAndSelect() {
    const searchInputs = [
        { searchInput: document.getElementById('catalog-search-edit'), selectElement: document.getElementById('catalog-select') },
        { searchInput: document.getElementById('catalog-search-del'), selectElement: document.getElementById('catalog-del') },
        { searchInput: document.getElementById('catalog-search-add'), selectElement: document.getElementById('parent-catalog') }
    ];

    // Загрузка и отображение каталогов
    function loadCatalogs() {
        const catalogs = gatherAndSortCatalogs(); 
        searchInputs.forEach(({ selectElement }) => populateSelectWithCatalogs(selectElement, catalogs));
    }

    // Заполнение select каталогами
    function populateSelectWithCatalogs(selectElement, catalogs) {
        selectElement.innerHTML = '<option value="">--</option>'; // Опция по умолчанию
        catalogs.forEach(catalog => {
            const option = document.createElement('option');
            option.value = catalog.id;
            option.textContent = catalog.name;
            selectElement.appendChild(option);
        });
    }

    // Обработчик поиска по каталогам
    function attachSearchFunctionality() {
        searchInputs.forEach(({ searchInput, selectElement }) => {
            searchInput.addEventListener('input', function () {
                const searchValue = this.value.toLowerCase();
                Array.from(selectElement.options).forEach(option => {
                    option.style.display = option.text.toLowerCase().includes(searchValue) ? '' : 'none';
                });
            });
        });
    }

    loadCatalogs(); // Загрузка каталогов
    attachSearchFunctionality(); // Привязка обработчиков поиска
}

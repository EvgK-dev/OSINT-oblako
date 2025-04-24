// Запрос на сервер для получения данных о каталогах и ссылках при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    loadCatalogData();
});

// Загрузка данных каталогов с сервера и создание элементов интерфейса
function loadCatalogData() {
    const listWindow = document.querySelector('.list-window');
    const workWindow = document.querySelector('.work-window');

    if (listWindow) listWindow.innerHTML = ''; // Очистка списка каталогов
    if (workWindow) workWindow.innerHTML = ''; // Очистка рабочей области

    // Запрос на сервер для получения данных о каталогах
    fetch('/api/aos/')
        .then(response => response.json())
        .then(data => {
            if (data.catalog_data && Array.isArray(data.catalog_data)) {
                // Создание и добавление элементов каталогов
                data.catalog_data.forEach(cat => {
                    const element = createCatalogElement(cat, 1);
                    if (element) {
                        listWindow.appendChild(element);
                    }
                });
                updateLinkCounts(); // Обновление подсчета ссылок
            } else {
                console.error('Некорректные данные:', data);
            }
        })
        .catch(error => console.error('Ошибка загрузки данных:', error));
}

// Функция для создания элемента каталога на основе данных
function createCatalogElement(cat, level) {
    if (!cat || !cat.id || !cat.name) {
        console.error('Недостаточно данных для создания элемента каталога:', cat);
        return null;
    }

    const container = document.createElement('div');
    const containerClass = level === 1 ? 'level-one-conteiner level-one' : `level-next-conteiner level-${level}`;
    container.className = containerClass;
    container.setAttribute('data-cat', cat.id);

    // Создание блока с названием каталога и количеством ссылок
    const titleBlock = document.createElement('div');
    const titleClass = level === 1 ? 'level-one-title' : `level-${level}-title`;
    titleBlock.className = `level-next-title-block ${titleClass}`;
    titleBlock.innerHTML = `
        <div class="osint-next-circle-count"><span>${cat.resource_links_count || 0}</span></div>
        <div class="osint-next-circle-name"><p>${cat.name}</p></div>
        <div class="osint-next-circle-close">${level === 1 ? '✗' : '⋎'}</div>
    `;
    titleBlock.setAttribute('onclick', level === 1 ? 'levelOneClick(this)' : 'levelNextClick(this)');
    container.appendChild(titleBlock);

    // Создание контейнера для дочерних элементов (каталогов и ссылок)
    const childContainer = document.createElement('div');
    const childClass = level < 5 ? `level-next-conteiner level-${level + 1} none` : `level-next-conteiner level-${level + 1}`;
    childContainer.className = childClass;

    // Создание блоков с ссылками, если они есть в данных
    if (Array.isArray(cat.resource_links_grouped) && cat.resource_links_grouped.length > 0) {
        const linksBlock = document.createElement('div');
        linksBlock.className = 'level-next-links-block';
        cat.resource_links_grouped.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = `links-rating-${group.rating}`;
            groupDiv.innerHTML = `<div class="links-star"><span>${'⭐'.repeat(group.rating)}</span></div>`;

            group.links.forEach(link => {
                const linkDiv = document.createElement('div');
                linkDiv.className = 'link-block';
                linkDiv.setAttribute('data-link', link.id);

                linkDiv.innerHTML = `
                    <div class="link-main-info ${link.is_paid ? 'pay' : 'free'} ${link.is_folder ? 'folder' : ''}">
                        <a class="link" href="${link.link}" target="_blank">${link.name}</a>
                        <div class="link-comment-img drop">?</div>
                    </div>
                    <div class="link-addition-info none">
                        <p>${link.comment || 'Без комментария'}</p>
                    </div>
                `;
                groupDiv.appendChild(linkDiv);
            });

            linksBlock.appendChild(groupDiv);
        });
        childContainer.appendChild(linksBlock);
    }

    // Рекурсивное создание дочерних каталогов, если они есть
    if (Array.isArray(cat.children) && cat.children.length > 0) {
        cat.children.forEach(child => {
            const childElement = createCatalogElement(child, level + 1);
            if (childElement) {
                childContainer.appendChild(childElement);
            }
        });
    }

    // Добавление контейнера дочерних элементов в родительский элемент
    if (childContainer.children.length > 0) {
        container.appendChild(childContainer);
    }

    return container;
}

// Подсчет количества ссылок в определенном уровне
function countLinksInLevel(levelElement) {
    const linkElements = levelElement.querySelectorAll('.link');
    const circleCountSpan = levelElement.querySelector('.osint-next-circle-count > span');
    if (circleCountSpan) {
        circleCountSpan.textContent = linkElements.length;
    }

    const childLevels = levelElement.querySelectorAll(':scope > .level-next-conteiner');
    childLevels.forEach(countLinksInLevel);
}

// Обновление подсчета ссылок в первом уровне
function updateLinkCounts() {
    const levelOneElements = document.querySelectorAll('.level-one');
    levelOneElements.forEach(countLinksInLevel);
}


//############################################################################
//            Логика отправки форм
//############################################################################

// Отслеживаем событие отправки формы
document.addEventListener('DOMContentLoaded', function () {
    const formSelectors = [
        '.createCatalog', 
        '.deleteCatalog', 
        '.modifyCatalog', 
        '.createLink', 
        '.deleteLink', 
        '.modifyLink'
    ];

    // Добавление обработчиков отправки форм
    formSelectors.forEach(selector => {
        const form = document.querySelector(selector);
        if (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault(); // Предотвращение стандартной отправки
                handleFormAPI(form);
            });
        }
    });
});

// Отправка формы на сервер и обработка ответа
function handleFormAPI(form) {
    const formData = new FormData(form);
    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

    // Отправка формы с CSRF-токеном и данными формы
    fetch(form.action, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        showNotification(data.message, data.status); // Отображение уведомления
        loadCatalogData(); // Перезагрузка данных каталогов
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showNotification('Произошла ошибка при отправке формы.', 'error'); // Ошибка отправки формы
    });
}

// Отображение уведомления о результате операции
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove(); // Удаление уведомления через 7 секунд
    }, 7000);

    hideAllForms();  // Скрытие всех форм
}

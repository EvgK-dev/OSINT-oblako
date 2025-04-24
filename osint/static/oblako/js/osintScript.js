// Подсчитываем количество ссылок и обновляем отображение на каждом уровне
document.addEventListener('DOMContentLoaded', function () {
    function countLinksInLevel(levelElement) {
      const linkElements = levelElement.querySelectorAll('.link');
      const circleCountSpan = levelElement.querySelector('.osint-next-circle-count > span');
      if (circleCountSpan) {
        circleCountSpan.textContent = linkElements.length;
      }
  
      const childLevels = levelElement.querySelectorAll(':scope > .level-next-conteiner');
      childLevels.forEach(countLinksInLevel);
    }
  
    const levelOneElements = document.querySelectorAll('.level-one');
    levelOneElements.forEach(countLinksInLevel);
});
  

// Показываем или скрываем комментарий по клику
document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (event) {
        const commentImg = event.target.closest('.link-comment-img');
        if (commentImg) {
            const linkBlock = commentImg.closest('.link-block');
            if (linkBlock) {
                const additionInfo = linkBlock.querySelector('.link-addition-info');
                if (additionInfo) {
                    if (additionInfo.classList.contains('visible')) {
                        // Скрываем комментарий
                        additionInfo.classList.remove('visible');
                        additionInfo.classList.add('invisible');
                        setTimeout(() => additionInfo.classList.add('none'), 100); // Убираем через 600 мс
                    } else {
                        // Показываем комментарий
                        additionInfo.classList.remove('invisible', 'none');
                        additionInfo.classList.add('visible');
                    }
                }
            }
        }
    });
});

// Переключаем видимость дочерних контейнеров следующего уровня
function levelNextClick(clickedElement) {
    const parentContainer = clickedElement.closest('.level-next-conteiner');
    if (!parentContainer) return; 
  
    const nextLevelContainers = parentContainer.querySelectorAll(':scope > .level-next-conteiner');
    nextLevelContainers.forEach(function (container) {
      container.classList.toggle('visible');
      container.classList.toggle('invisible');
    });
}

// Обрабатываем клик по элементу уровня 1, перемещаем между окнами
function levelOneClick(clickedElement) {
    const levelOneContainer = clickedElement.closest('.level-one-conteiner');
    if (!levelOneContainer) return;

    // Прокручиваем страницу до верха для мобильных устройств
    if (window.innerWidth < 800) {
        window.scrollTo(0, 0);
    }

    const workWindow = document.querySelector('.work-window');
    const listWindow = document.querySelector('.list-window');
    const activeInWorkWindow = workWindow.querySelector('.level-one-conteiner');

    // Если элемент уже в work-window, перемещаем его в list-window
    if (levelOneContainer.parentNode === workWindow) {
        const levelTwoElements = levelOneContainer.querySelectorAll('.level-2');
        levelTwoElements.forEach(element => element.classList.add('none'));

        levelOneContainer.classList.add('invisible');
        levelOneContainer.classList.remove('visible');
        setTimeout(() => {
            workWindow.removeChild(levelOneContainer);
            listWindow.appendChild(levelOneContainer);
            levelOneContainer.classList.remove('invisible');
        }, 500);
    } else {
        // Если другой элемент в work-window, возвращаем его в list-window
        if (activeInWorkWindow) {
            const activeLevelTwoElements = activeInWorkWindow.querySelectorAll('.level-2');
            activeLevelTwoElements.forEach(element => element.classList.add('none'));

            activeInWorkWindow.classList.add('invisible');
            activeInWorkWindow.classList.remove('visible');
            setTimeout(() => {
                workWindow.removeChild(activeInWorkWindow);
                listWindow.appendChild(activeInWorkWindow);
                activeInWorkWindow.classList.remove('invisible');
            }, 500);
        }

        // Перемещаем текущий элемент в work-window
        levelOneContainer.classList.add('invisible');
        setTimeout(() => {
            if (listWindow.contains(levelOneContainer)) {
                listWindow.removeChild(levelOneContainer);
            }
            workWindow.appendChild(levelOneContainer);
            levelOneContainer.classList.remove('invisible');
            levelOneContainer.classList.add('visible');

            // Убираем класс .none у дочерних элементов уровня 2
            const levelTwoElements = levelOneContainer.querySelectorAll('.level-2');
            levelTwoElements.forEach(element => element.classList.remove('none'));
        }, 500);
    }
}

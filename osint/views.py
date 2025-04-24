from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponseNotFound, JsonResponse
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required, user_passes_test
from collections import defaultdict
from django.views.decorators.csrf import csrf_exempt

from .models import Catalog, ResourceLink, CatalogResourceLink, ChoicePage
from .forms import UserLoginForm

def index(request):
    if request.user.is_authenticated:  
        return redirect('choicePage')
    
    if request.method == 'POST':
        form = UserLoginForm(data=request.POST)

        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('choicePage')
    else:
        form = UserLoginForm()

    return render(request, 'oblako/LoginPage.html', {'title': 'СК-ГЛАВНАЯ', 'form': form})


@login_required(login_url='LoginPage')  
def choicePage(request):
    choice_pages = ChoicePage.objects.all()  
    return render(request, 'oblako/choicePage.html', {
        'title': 'СК-ВЫБОР ПРИЛОЖЕНИЯ',
        'choice_pages': choice_pages  
    })


def get_catalog_data(catalog):
    # Группируем ссылки по рейтингу
    resource_links_by_rating = defaultdict(list)
    for crl in catalog.resource_links.select_related('resource_link').all():
        link = crl.resource_link
        resource_links_by_rating[link.rating].append(link)
    
    # Создаем отсортированный список групп по рейтингу (от 5 до 1)
    resource_links_grouped = []
    for rating in sorted(resource_links_by_rating.keys(), reverse=True):
        resource_links_grouped.append({
            'rating': rating,
            'links': resource_links_by_rating[rating],
        })
    
    # Рекурсивно собираем данные для дочерних каталогов
    children = [get_catalog_data(child) for child in catalog.children.all()]
    
    return {
        
        'catalog': catalog,
        'resource_links_grouped': resource_links_grouped,
        'children': children,
        'resource_links_count': catalog.resource_links.count(),
    }


@login_required(login_url='LoginPage')
def OsintPage(request):
    root_categories = Catalog.objects.filter(parent__isnull=True).prefetch_related('children', 'resource_links__resource_link')
    catalog_data = [get_catalog_data(cat) for cat in root_categories]

    return render(request, 'oblako/OsintPage.html', {
        'title': 'СК-OSINT',
        'catalog_data': catalog_data
    })


@login_required(login_url='belcard') 
def belcard(request):
    return render(request, 'oblako/belcard.html', {'title': 'СК-БПК'})


@login_required(login_url='LoginPage') 
def CardGeneration(request):
    return render(request, 'oblako/CardGeneration.html', {'title': 'СК-БПК'})

def pageNotFound(request, exception):
    return HttpResponseNotFound('<h1>Страница не найдена</h1>')

# admin

def admin_or_moderator_required(user):
    """
    Проверяем, является ли пользователь администратором или модератором.
    """
    return user.is_authenticated and (user.is_superuser or user.groups.filter(name='Moderators').exists())


@user_passes_test(admin_or_moderator_required, login_url='LoginPage')
def aosjson(request):
    """
    Генерируем данные для страницы администрирования OSINT-каталога.
    """
    root_categories = Catalog.objects.filter(parent__isnull=True).prefetch_related(
        'children', 'resource_links__resource_link'
    )
    
    catalog_data = [get_catalog_data(cat) for cat in root_categories]

    return render(request, 'oblako/editOsintPageAPI.html', {
        'title': 'СК-OSINT',
        'catalog_data': catalog_data
    })


@csrf_exempt
@user_passes_test(admin_or_moderator_required, login_url='LoginPage')
def aos_json(request):
    """
    Возвращает данные для OSINT-каталога в формате JSON.
    """
    root_categories = Catalog.objects.filter(parent__isnull=True).prefetch_related(
        'children', 'resource_links__resource_link'
    )
    
    def serialize_catalog(catalog):
        """
        Сериализует данные каталога, включая ссылки и дочерние каталоги.
        """
        # Группируем ссылки по рейтингу
        resource_links_by_rating = defaultdict(list)
        for crl in catalog.resource_links.select_related('resource_link').all():
            link = crl.resource_link
            resource_links_by_rating[link.rating].append({
                'id': link.id,
                'name': link.name,
                'link': link.link,
                'comment': link.comment,
                'is_paid': link.is_paid,
                'is_folder': link.is_folder,
                'rating': link.rating,
            })

        # Формируем данные для ссылок, сгруппированных по рейтингу
        resource_links_grouped = [
            {'rating': rating, 'links': links}
            for rating, links in sorted(resource_links_by_rating.items(), reverse=True)
        ]

        # Рекурсивно сериализуем дочерние каталоги
        children = [serialize_catalog(child) for child in catalog.children.all()]

        return {
            'id': catalog.id,
            'name': catalog.name,
            'full_path': catalog.get_full_path(),
            'resource_links_grouped': resource_links_grouped,
            'children': children,
            'resource_links_count': catalog.resource_links.count(),
        }

    catalog_data = [serialize_catalog(cat) for cat in root_categories]

    return JsonResponse({'catalog_data': catalog_data}, safe=False, json_dumps_params={'indent': 2})


#   API
def add_catalog_api(request):
    if request.method == 'POST':
        catalog_name = request.POST.get('catalog_name')
        parent_catalog = request.POST.get('parent_catalog')

        if not catalog_name:
            return JsonResponse({"message": "Имя каталога обязательно для заполнения", "status": "error"}, status=400)

        parent_catalog_value = None
        if parent_catalog and parent_catalog != '':
            parent_catalog_value = parent_catalog

        if Catalog.objects.filter(name=catalog_name, parent=parent_catalog_value).exists():
            return JsonResponse({"message": "Каталог с таким именем уже существует в выбранной родительской категории", "status": "error"}, status=400)

        parent = None
        if parent_catalog_value:
            try:
                parent = Catalog.objects.get(id=parent_catalog_value)
            except Catalog.DoesNotExist:
                return JsonResponse({"message": f"Родительский каталог с ID {parent_catalog_value} не найден", "status": "error"}, status=400)

        new_catalog = Catalog.objects.create(name=catalog_name, parent=parent)

        return JsonResponse({"message": "Каталог добавлен успешно", "status": "success"})

    return JsonResponse({"message": "Недопустимый метод запроса", "status": "error"}, status=405)


def delete_catalog_api(request):
    if request.method == 'POST':
        catalog_del_id = request.POST.get('catalog_del')

        if not catalog_del_id:
            return JsonResponse({"message": "Выберите каталог для удаления", "status": "error"}, status=400)

        try:
            catalog_to_delete = Catalog.objects.get(id=catalog_del_id)
            catalog_to_delete.delete() 
            return JsonResponse({"message": "Каталог успешно удалён", "status": "success"})
        except Catalog.DoesNotExist:
            return JsonResponse({"message": "Каталог с таким ID не найден", "status": "error"}, status=400)

    return JsonResponse({"message": "Неверный метод запроса", "status": "error"}, status=405)


def edit_catalog_api(request):
    if request.method == 'POST':
        catalog_select_id = request.POST.get('catalog_select')
        new_catalog_name = request.POST.get('parent_catalog')

        if not catalog_select_id or not new_catalog_name:
            return JsonResponse({"message": "Все поля должны быть заполнены", "status": "error"}, status=400)

        try:
            catalog_to_edit = Catalog.objects.get(id=catalog_select_id)
            catalog_to_edit.name = new_catalog_name
            catalog_to_edit.save()

            return JsonResponse({"message": "Каталог успешно изменён", "status": "success"})
        except Catalog.DoesNotExist:
            return JsonResponse({"message": f"Каталог с ID {catalog_select_id} не найден", "status": "error"}, status=400)

    return JsonResponse({"message": "Неверный метод запроса", "status": "error"}, status=405)


def save_link_api(request):
    if request.method == 'POST':
        link_name = request.POST.get('link_name')
        link_url = request.POST.get('link_url')
        link_comment = request.POST.get('link_comment', '')
        is_paid = request.POST.get('is_paid') == 'on'
        is_folder = request.POST.get('is_directory') == 'on'
        link_rating = int(request.POST.get('link_rating', 1))
        selected_catalog_ids = [int(key) for key in request.POST.keys() if key.isdigit()]

        if not selected_catalog_ids:
            return JsonResponse({"message": "Ссылку нужно привязать к каталогу(ам)", "status": "error"}, status=400)

        if not link_name or not link_url:
            return JsonResponse({"message": "Имя и URL ссылки обязательны", "status": "error"}, status=400)

        new_link = ResourceLink.objects.create(
            name=link_name,
            link=link_url,
            comment=link_comment,
            is_paid=is_paid,
            is_folder=is_folder,
            rating=link_rating,
        )

        # Привязываем ссылки к выбранным каталогам
        for catalog_id in selected_catalog_ids:
            try:
                catalog = Catalog.objects.get(id=catalog_id)
                CatalogResourceLink.objects.create(catalog=catalog, resource_link=new_link)
            except Catalog.DoesNotExist:
                print(f"Каталог с ID {catalog_id} не найден.")

        return JsonResponse({"message": "Ссылка успешно добавлена", "status": "success"})

    return JsonResponse({"message": "Неверный метод запроса", "status": "error"}, status=405)


def delete_link_api(request):
    if request.method == 'POST':

        link_id = request.POST.get('select_link')

        if not link_id:
            return JsonResponse({"message": "Не выбрана ссылка для удаления", "status": "error"}, status=400)

        try:
            link = ResourceLink.objects.get(id=link_id)
        except ResourceLink.DoesNotExist:
            return JsonResponse({"message": "Ссылка не найдена", "status": "error"}, status=404)

        CatalogResourceLink.objects.filter(resource_link=link).delete()

        link.delete()

        return JsonResponse({"message": "Ссылка успешно удалена", "status": "success"})

    return JsonResponse({"message": "Неверный метод запроса", "status": "error"}, status=405)


def update_link_api(request):
    if request.method == 'POST':

        link_id = request.POST.get('select_link')
        new_link_name = request.POST.get('new_link_name')
        link_url = request.POST.get('link_url_update')
        link_comment = request.POST.get('link_comment_update', '')
        is_paid = request.POST.get('is_paid_update') == 'on'
        is_folder = request.POST.get('is_directory_update') == 'on'
        link_rating = int(request.POST.get('link_rating_update', 1))

        if not link_id or not link_url:
            return JsonResponse({"message": "Не все обязательные поля заполнены", "status": "error"}, status=400)

        try:
            link = ResourceLink.objects.get(id=link_id)
        except ResourceLink.DoesNotExist:
            return JsonResponse({"message": "Ссылка не найдена", "status": "error"}, status=404)

        if new_link_name:
            link.name = new_link_name

        link.link = link_url
        link.comment = link_comment
        link.is_paid = is_paid
        link.is_folder = is_folder
        link.rating = link_rating
        link.save()

        selected_catalog_ids = [int(key) for key in request.POST.keys() if key.isdigit()]
        if not selected_catalog_ids:
            return JsonResponse({"message": "Не выбраны каталоги", "status": "error"}, status=400)

        CatalogResourceLink.objects.filter(resource_link=link).delete()  
        for catalog_id in selected_catalog_ids:
            try:
                catalog = Catalog.objects.get(id=catalog_id)
                CatalogResourceLink.objects.create(catalog=catalog, resource_link=link)
            except Catalog.DoesNotExist:
                print(f"Каталог с ID {catalog_id} не найден.")

        return JsonResponse({"message": "Ссылка успешно обновлена", "status": "success"})

    return JsonResponse({"message": "Неверный метод запроса", "status": "error"}, status=405)

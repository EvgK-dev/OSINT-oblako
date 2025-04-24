from django.urls import path
 
from .views import *


urlpatterns = [
    path('', index, name='LoginPage'), 
    path('apps', choicePage, name='choicePage'), 
    path('osint', OsintPage, name='OsintPage'), 
    path('card', CardGeneration, name='CardGeneration'), 

    path('belcard', belcard, name='belcard'), 

    path('OSM', aosjson, name='aosjson'),
    path('api/aos/', aos_json, name='aos_json'),

    path('add-catalog-api/', add_catalog_api, name='add_catalog_api'),
    path('del-catalog-api/', delete_catalog_api, name='delete_catalog_api'),
    path('edit-catalog-api/', edit_catalog_api, name='edit_catalog_api'),

    path('save-link-api/', save_link_api, name='save_link_api'),
    path('delete-link-api/', delete_link_api, name='delete_link_api'),
    path('update-link-api/', update_link_api, name='update_link_api'),

]


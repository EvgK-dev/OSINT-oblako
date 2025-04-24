from django.urls import path
from .views import got_view

urlpatterns = [
    path('get_data/', get_data, name='get_data'),  
]

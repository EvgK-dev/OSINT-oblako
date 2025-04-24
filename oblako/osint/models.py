from django.db import models
from django.urls import reverse
from django.contrib.auth.models import User
from django.utils import timezone


class Catalog(models.Model):
    name = models.CharField(max_length=100, db_index=True)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children',
        verbose_name="Родительская категория"
    )

    class Meta:
        verbose_name = "Каталог"
        verbose_name_plural = "Каталоги"
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('catalog_detail', args=[self.pk])

    def get_full_path(self):
        """
        Получает полный путь каталога через родителей.
        """
        path = [self.name]
        parent = self.parent
        while parent is not None:
            path.insert(0, parent.name)
            parent = parent.parent
        return " / ".join(path)


class ResourceLink(models.Model):
    name = models.CharField(max_length=100)
    link = models.URLField(max_length=200)
    comment = models.TextField(blank=True)
    is_paid = models.BooleanField(default=False)
    is_folder = models.BooleanField(default=False)
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)], default=1)

    class Meta:
        verbose_name = "Ссылка на ресурс"
        verbose_name_plural = "Ссылки на ресурсы"
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('resource_link_detail', args=[self.pk])


class CatalogResourceLink(models.Model):
    catalog = models.ForeignKey(Catalog, on_delete=models.CASCADE, related_name='resource_links')
    resource_link = models.ForeignKey(ResourceLink, on_delete=models.CASCADE, related_name='catalogs')

    class Meta:
        verbose_name = "Привязать ссылку к каталогам"
        verbose_name_plural = "Привязать ссылку к каталогам"
        unique_together = ('catalog', 'resource_link')

    def __str__(self):
        return f"{self.catalog.name} -> {self.resource_link.name}"


class PageVisit(models.Model):
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)  
    url = models.CharField(max_length=255) 
    visit_time = models.DateField(default=timezone.now)  
    visit_count = models.IntegerField(default=1)  

    class Meta:
        verbose_name = "Входы"
        verbose_name_plural = "Входы"

    def __str__(self):
        return f"{self.user} --- {self.url} --- {self.visit_count} --- {self.visit_time}"
    

class ChoicePage(models.Model):
    name = models.CharField(max_length=255, verbose_name='Имя приложения')  
    description = models.TextField(verbose_name='Описание приложения')  
    link = models.URLField(verbose_name='Адрес (ссылка) на приложение')  

    class Meta:
        verbose_name = "страница выбора приложений"
        verbose_name_plural = "страница выбора приложений"

    def __str__(self):
        return self.name


from django.contrib import admin
from .models import Catalog, ResourceLink, CatalogResourceLink, PageVisit, ChoicePage

class CatalogResourceLinkInline(admin.TabularInline):
    model = CatalogResourceLink
    extra = 1  

class CatalogAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'get_full_path')
    search_fields = ('name',)
    list_filter = ('parent',)
    ordering = ['name']
    inlines = [CatalogResourceLinkInline]  

    def get_full_path(self, obj):
        return obj.get_full_path()
    get_full_path.short_description = "Полный путь каталога"

class ResourceLinkAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_paid', 'is_folder', 'rating')
    search_fields = ('name', 'comment')
    list_filter = ('is_paid', 'is_folder', 'rating')
    ordering = ['name']
    inlines = [CatalogResourceLinkInline]  

class PageVisitAdmin(admin.ModelAdmin):
    list_display = ('user', 'url', 'visit_time', 'visit_count')  
    list_filter = ('visit_time',)  
    search_fields = ('user__username', 'visit_time')  
    ordering = ('-visit_time',)  


admin.site.register(Catalog, CatalogAdmin)
admin.site.register(ResourceLink, ResourceLinkAdmin)
admin.site.register(PageVisit, PageVisitAdmin)
admin.site.register(ChoicePage)


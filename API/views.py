from django.shortcuts import render

from django.http import JsonResponse
from collections import defaultdict
from osint.models import Catalog


def get_data(request):
    root_categories = Catalog.objects.filter(parent__isnull=True).prefetch_related(
        'children', 'resource_links__resource_link'
    )

    def serialize_catalog(catalog):
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

        resource_links_grouped = [
            {'rating': rating, 'links': links}
            for rating, links in sorted(resource_links_by_rating.items(), reverse=True)
        ]

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

    return JsonResponse({'got_data': catalog_data}, safe=False, json_dumps_params={'indent': 2, 'ensure_ascii': False})


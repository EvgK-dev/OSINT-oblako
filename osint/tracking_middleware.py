from django.utils import timezone
from .models import PageVisit

class PageVisitTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.user.is_authenticated:
            today = timezone.now().date()  
            user = request.user
            url = request.path

            page_visit = PageVisit.objects.filter(user=user, url=url, visit_time=today).first()

            if page_visit:
                page_visit.visit_count += 1
                page_visit.save()
            else:
                PageVisit.objects.create(
                    user=user,
                    url=url,
                    visit_time=today,
                    visit_count=1
                )
        return response

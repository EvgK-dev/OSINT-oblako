from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from .models import *

from captcha.fields import CaptchaField

# авторизация
class UserLoginForm(AuthenticationForm):
    username = forms.CharField(label='Логин:', 
                               widget=forms.TextInput(
                                   attrs={'class': 'login-input-name',
                                          'placeholder': 'Введите имя пользователя'
                                          }))
    password = forms.CharField(label='Пароль:', 
                               widget=forms.PasswordInput(
                                   attrs={'class': 'login-input-password',
                                          'placeholder': 'Введите пароль'}))
    captcha = CaptchaField(label='Введите текст:', )
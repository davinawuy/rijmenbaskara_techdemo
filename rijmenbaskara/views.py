from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings

def contact(request):
    if request.method == 'POST':
        email = request.POST.get('email', '')
        message = request.POST.get('message', '')
        
        if email and message:
            # Compose the email
            subject = f'New Contact Form Message from {email}'
            full_message = f'From: {email}\n\nMessage:\n{message}'
            
            try:
                # Send email
                send_mail(
                    subject,
                    full_message,
                    email,  # From email
                    ['rijmenbaskara@gmail.com'],  # To email
                    fail_silently=False,
                )
                messages.success(request, 'Your message has been sent successfully!')
            except Exception as e:
                messages.error(request, f'Failed to send message. Please try again later.')
            
            return redirect('contact')
        else:
            messages.error(request, 'Please fill in all fields.')
    
    return render(request, 'contact.html')

def home(request):
    return render(request, 'home.html')

def works(request):
    return render(request, 'works.html')

def articles(request):
    return render(request, 'articles.html')

def about(request):
    return render(request, 'about.html')

def add_article(request):
    """
    Lightweight article composer (front-end only).
    Captures a cover image + body HTML and surfaces a success message.
    Hook this up to persistence later.
    """
    context = {}

    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        subtitle = request.POST.get('subtitle', '').strip()
        body_html = request.POST.get('body_html', '').strip()

        context.update({
            'draft_title': title,
            'draft_subtitle': subtitle,
            'draft_body': body_html,
        })

        if title and body_html:
            messages.success(
                request,
                'Draft captured. Wire this form to your storage layer to publish.'
            )
        else:
            messages.error(request, 'Please add a title and some body text.')

    return render(request, 'add_article.html', context)

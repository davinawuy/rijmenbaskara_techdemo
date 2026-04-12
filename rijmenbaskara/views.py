from django.shortcuts import render, redirect
from django.http import FileResponse, HttpResponse, Http404, JsonResponse
from django.contrib import messages
from django.core.mail import send_mail
from django.core.mail import EmailMessage
from django.conf import settings
from django.urls import reverse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from pathlib import Path
import json
import re
from datetime import datetime
from typing import Optional
from uuid import uuid4
import zipfile
import io
import os

# --- ARTICLE STORAGE ---
ARTICLES_DIR = Path(settings.BASE_DIR) / "articles_store"
ARTICLES_DIR.mkdir(exist_ok=True)

ARTICLES_COVERS_DIR = Path(settings.MEDIA_ROOT) / "articles"
ARTICLES_COVERS_DIR.mkdir(parents=True, exist_ok=True)


# --- PROJECT STORAGE ---
PROJECTS_DIR = Path(settings.BASE_DIR) / "projects_store"
PROJECTS_DIR.mkdir(exist_ok=True)

PROJECT_UPLOADS_DIR = Path(settings.MEDIA_ROOT) / "projects"
PROJECT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _media_url(*parts: str) -> str:
    cleaned = "/".join(str(part).strip("/") for part in parts if part)
    return f"{settings.MEDIA_URL}{cleaned}"


def _project_image_url(image_ref: Optional[str]) -> Optional[str]:
    if not image_ref:
        return None
    if image_ref.startswith(("http://", "https://", settings.MEDIA_URL, settings.STATIC_URL)):
        return image_ref

    normalized = image_ref.strip().replace("\\", "/").lstrip("/")
    if normalized.startswith(("projects/", "galleries/", "articles/")):
        return _media_url(normalized)

    return _media_url("legacy-static", Path(normalized).name)


def _with_project_image_urls(project: dict) -> dict:
    normalized = project.copy()
    normalized["image_urls"] = [_project_image_url(image) for image in project.get("images", [])]
    normalized["thumb_url"] = normalized["image_urls"][0] if normalized["image_urls"] else None
    return normalized


def _slugify(value: str) -> str:
    slug = re.sub(r'[^a-zA-Z0-9-]+', '-', value.strip().lower()).strip('-')
    return slug or "article"


def _article_path(article_id: str) -> Path:
    return ARTICLES_DIR / f"{article_id}.json"


def _load_articles():
    items = []
    for path in ARTICLES_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            data.setdefault("id", path.stem)
            items.append(data)
        except Exception:
            continue
    return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)


def _load_article(article_id: str):
    path = _article_path(article_id)
    if not path.exists():
        raise Http404("Article not found")
    data = json.loads(path.read_text(encoding="utf-8"))
    data.setdefault("id", article_id)
    return data


def _load_projects():
    projects_file = PROJECTS_DIR / "seed_projects.json"
    if projects_file.exists():
        try:
            data = json.loads(projects_file.read_text(encoding="utf-8"))
            return sorted(data, key=lambda x: x.get("created_at", ""), reverse=True)
        except Exception:
            pass
    return []


def _load_project(project_id: str):
    """Load a single project by ID"""
    projects = _load_projects()
    for project in projects:
        if project.get("id") == project_id:
            return project
    raise Http404("Project not found")


def _save_projects(projects):
    """Save projects list to JSON file"""
    projects_file = PROJECTS_DIR / "seed_projects.json"
    projects_file.write_text(json.dumps(projects, indent=2), encoding="utf-8")


def _save_project_image(uploaded_file):
    """Save an uploaded image to MEDIA_ROOT/projects and return its relative media path."""
    import hashlib

    # Generate unique filename
    ext = Path(uploaded_file.name).suffix.lower()
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    hash_part = hashlib.md5(uploaded_file.read()).hexdigest()[:8]
    uploaded_file.seek(0)  # Reset file pointer
    filename = f"project_{timestamp}_{hash_part}{ext}"

    filepath = PROJECT_UPLOADS_DIR / filename
    with open(filepath, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)

    return f"projects/{filename}"


def _ensure_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        messages.error(request, "Admins only.")
        return False
    return True

# Tags management
def _merge_tag_choices(*tag_groups):
    seen = set()
    merged = []
    for group in tag_groups:
        for tag in group or []:
            normalized = str(tag).strip()
            if not normalized:
                continue
            key = normalized.casefold()
            if key in seen:
                continue
            seen.add(key)
            merged.append(normalized)
    return merged


def _article_tag_choices(items=None, extra_tags=None):
    items = items if items is not None else _load_articles()
    discovered = []
    for item in items:
        discovered.extend(item.get("tags") or [])

    discovered_unique = _merge_tag_choices(discovered, extra_tags)
    discovered_unique.sort(key=str.casefold)
    return _merge_tag_choices(discovered_unique, extra_tags)


def _parse_article_tags(selected_tags, custom_tags_raw=""):
    custom_tags = [tag.strip() for tag in custom_tags_raw.split(",")]
    return _merge_tag_choices(selected_tags, custom_tags)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"}

def contact(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        message = request.POST.get('message')
        
        if email and message:
            # Compose the email
            subject = f'rijmenbaskara.com from {email}'
            full_message = f'From: {email}\n\nMessage:\n{message}'
            sender_email = settings.DEFAULT_FROM_EMAIL
            receiver_email = "rijmenbaskara@gmail.com"
            
            try:
                # Send email
                email_obj = EmailMessage(
                    subject=subject,
                    body=full_message,
                    from_email=sender_email,
                    to=[receiver_email],
                    reply_to=[email],
                )
                email_obj.send(fail_silently=False)
                messages.success(request, 'Your message has been sent successfully!')
            except Exception as e:
                messages.error(request, f'Failed to send message. Please try again later.')
            
            return redirect('contact')
        else:
            messages.error(request, 'Please fill in all fields.')
    
    return render(request, 'contact.html')

def home(request):
    projects = [_with_project_image_urls(project) for project in _load_projects()[:6]]
    hero_images = []

    # Use project images for hero carousel
    for project in projects:
        for image_url in project.get('image_urls', [])[:2]:
            hero_images.append({
                'url': image_url
            })

    # Prepare works items from projects
    works_items = []
    for project in projects:
        if project.get('thumb_url'):
            works_items.append({
                'title': project.get('title', ''),
                'slug': project.get('id', ''),
                'thumb_url': project.get('thumb_url'),
                'category': project.get('category', '')
            })

    # Get featured articles
    all_articles = _load_articles()
    featured_articles = [a for a in all_articles if a.get("featured", False)][:3]

    fallback_hero_images = [{"url": item["thumb_url"]} for item in works_items if item.get("thumb_url")]
    return render(request, 'home.html', {
        "works_items": works_items,
        "hero_images": hero_images if hero_images else fallback_hero_images,
        "featured_articles": featured_articles
    })

def works(request):
    all_projects = _load_projects() 

    active_tag = request.GET.get('tag', '').strip()
    query = request.GET.get('q', '').strip().lower()

    # 1. Get all unique categories for the filter bar
    cat_set = set()
    for p in all_projects:
        cats = p.get('category', [])
        if isinstance(cats, str): cats = [cats]
        for c in cats:
            if c: cat_set.add(c)
    cat_choices = sorted(list(cat_set), key=str.casefold)

    # 2. Filter logic
    filtered_projects = []
    for p in all_projects:
        p_cats = p.get('category', [])
        if isinstance(p_cats, str): p_cats = [p_cats]
        p_cats_lower = [c.lower() for c in p_cats]
        
        matches_tag = not active_tag or active_tag.lower() in p_cats_lower
        
        matches_query = not query or (
            query in p.get('title', '').lower() or 
            query in p.get('description', '').lower() or
            any(query in c.lower() for c in p_cats)
        )

        if matches_tag and matches_query:
            filtered_projects.append(_with_project_image_urls(p))

    context = {
        'projects': filtered_projects,
        'cat_choices': cat_choices,
        'active_tag': active_tag,
        'project_query': query,
        'is_admin': request.user.is_staff
    }
    return render(request, 'works.html', context)

def articles(request):
    all_articles = _load_articles() # Keep a master list
    items = all_articles

    active_tag = request.GET.get('tag', '').strip()
    query = request.GET.get('q', '').strip().lower()

    if active_tag:
        items = [a for a in items if active_tag in (a.get("tags") or [])]
    if query:
        items = [
            a for a in items
            if query in (a.get("title") or "").lower()
            or query in (a.get("subtitle") or "").lower()
            or query in " ".join(a.get("tags") or []).lower()
        ]

    year_groups = {}
    for art in items:
        year = (art.get("created_at") or "")[:4] or "Unknown"
        year_groups.setdefault(year, []).append(art)

    ordered_years = sorted(year_groups.keys(), reverse=True)
    year_list = [(year, year_groups[year]) for year in ordered_years]
    return render(request, 'articles.html', {
        "year_groups": year_groups,
        "ordered_years": ordered_years,
        "year_list": year_list,
        "active_tag": active_tag,
        "tag_choices": _article_tag_choices(all_articles),
        "articles_query": request.GET.get('q', ''),
    })

def about(request):
    return render(request, 'about.html')


def article_detail(request, article_id):
    article = _load_article(article_id)
    all_articles = _load_articles()
    
    # Get article tags for matching
    current_tags = set(article.get("tags") or [])
    current_slug = article.get("slug") or article_id
    
    # Find related articles (same tags, excluding current)
    related = []
    other_articles = []
    
    for art in all_articles:
        art_slug = art.get("slug") or art.get("file", "").split("/")[-1].replace(".json", "")
        if art_slug == current_slug:
            continue
            
        art_tags = set(art.get("tags") or [])
        if current_tags & art_tags:  # Has common tags
            related.append(art)
        else:
            other_articles.append(art)
    
    # Sort by date (newest first) - using created_at timestamp
    related.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    other_articles.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    # Take up to 3 related, fill remaining with other articles
    related_posts = related[:3]
    if len(related_posts) < 3:
        related_posts.extend(other_articles[:3 - len(related_posts)])
    
    return render(request, 'article_detail.html', {
        "article": article,
        "related_posts": related_posts,
        "tag_choices": _article_tag_choices(all_articles, article.get("tags") or [])
    })

def add_article(request):
    if not _ensure_staff(request):
        return redirect('articles')
    return _article_form(request)


def edit_article(request, article_id):
    if not _ensure_staff(request):
        return redirect('articles')
    return _article_form(request, article_id=article_id, is_edit=True)


def manage_articles(request):
    if not _ensure_staff(request):
        return redirect('articles')
    items = _load_articles()
    return render(request, 'manage_articles.html', {"articles": items})


def delete_article(request, article_id):
    if request.method == 'POST':
        try:
            article_data = _load_article(article_id)
            
            if article_data and article_data.get('cover'):
                cover_filename = Path(article_data['cover']).name
                cover_file_path = ARTICLES_COVERS_DIR / cover_filename
                if cover_file_path.exists():
                    os.remove(cover_file_path)

            json_path = _article_path(article_id)
            if json_path.exists():
                os.remove(json_path)
                return JsonResponse({'success': True})
            
            return JsonResponse({'success': False, 'error': 'File not found'}, status=404)

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)


def toggle_featured(request, article_id):
    """Toggle the featured status of an article"""
    if not _ensure_staff(request):
        return JsonResponse({"error": "Unauthorized"}, status=403)
    
    try:
        article = _load_article(article_id)
        article["featured"] = not article.get("featured", False)
        
        # Save the article
        path = _article_path(article_id)
        path.write_text(json.dumps(article, indent=2), encoding="utf-8")
        
        return JsonResponse({
            "success": True, 
            "featured": article["featured"]
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


def export_content_backup(request):
    """
    Admin-only: Create a ZIP file containing all content files
    (articles, images, projects) for backup and easy restoration.
    """
    if not _ensure_staff(request):
        return redirect('articles')
    
    # Create in-memory ZIP file
    zip_buffer = io.BytesIO()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add articles_store directory (JSON files and covers)
        articles_dir = Path(settings.BASE_DIR) / "articles_store"
        if articles_dir.exists():
            for file_path in articles_dir.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(settings.BASE_DIR)
                    zip_file.write(file_path, arcname)
        
        # Add static/images directory (galleries, projects, etc.)
        images_dir = Path(settings.MEDIA_ROOT)
        if images_dir.exists():
            for file_path in images_dir.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(settings.BASE_DIR)
                    zip_file.write(file_path, arcname)
        
        # Add projects_store directory
        projects_dir = Path(settings.BASE_DIR) / "projects_store"
        if projects_dir.exists():
            for file_path in projects_dir.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(settings.BASE_DIR)
                    zip_file.write(file_path, arcname)
        
        # Add a README for restoration instructions
        readme_content = """# Content Backup - Rijmen & Baskara

## Backup Date: {date}

## Contents:
- articles_store/: All article JSON files and cover images
- projects_store/: Project data files
- media/: Gallery images, project images, and other static images

## Restoration Instructions:

1. Extract this ZIP file
2. Copy the folders to your project root directory:
   - articles_store/ -> <project_root>/articles_store/
   - projects_store/ -> <project_root>/projects_store/
   - media/ -> <project_root>/media/

3. Ensure proper permissions (on Linux/Mac):
   chmod -R 755 articles_store/ projects_store/ media/

4. Restart your Django server

All content will be immediately available.
""".format(date=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
        
        zip_file.writestr('README_RESTORATION.txt', readme_content)
    
    # Prepare HTTP response
    zip_buffer.seek(0)
    response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="rijmenbaskara_backup_{timestamp}.zip"'
    
    messages.success(request, f'Backup created successfully: rijmenbaskara_backup_{timestamp}.zip')
    
    return response


def _article_form(request, article_id=None, is_edit=False):
    """
    File-backed composer: saves JSON + optional cover locally.
    """
    all_articles = _load_articles()
    context = {"is_edit": is_edit, "tag_choices": _article_tag_choices(all_articles)}

    existing = None
    if is_edit and article_id:
        existing = _load_article(article_id)
        existing_tags = existing.get("tags", []) or []
        context.update({
            'draft_title': existing.get("title", ""),
            'draft_subtitle': existing.get("subtitle", ""),
            'draft_body': existing.get("body_html", ""),
            'draft_tags': existing_tags,
            'draft_custom_tags': ", ".join(existing_tags),
            'article_id': existing.get("id", article_id),
            'existing_cover': existing.get("cover"),
            'tag_choices': _article_tag_choices(all_articles, existing_tags),
        })

    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        subtitle = request.POST.get('subtitle', '').strip()
        body_html = request.POST.get('body_html', '').strip()
        custom_tags_raw = request.POST.get('custom_tags', '').strip()
        tags = _parse_article_tags(request.POST.getlist('tags'), custom_tags_raw)
        posted_id = request.POST.get('article_id')
        if posted_id:
            article_id = posted_id

        context.update({
            'draft_title': title,
            'draft_subtitle': subtitle,
            'draft_body': body_html,
            'draft_tags': tags,
            'draft_custom_tags': custom_tags_raw,
            'article_id': article_id,
            'tag_choices': _article_tag_choices(all_articles, tags),
        })

        if not (title and body_html):
            messages.error(request, 'Please add a title and some body text.')
        else:
            if is_edit and article_id:
                record = existing or _load_article(article_id)
                record.update({
                    "title": title,
                    "subtitle": subtitle,
                    "body_html": body_html,
                    "tags": tags,
                    "slug": _slugify(title),
                })
                record["updated_at"] = datetime.utcnow().strftime("%Y%m%d%H%M%S")
                if not record.get("created_at"):
                    record["created_at"] = record["updated_at"]
            else:
                timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
                slug = _slugify(title)
                article_id = f"{timestamp}-{slug}"
                record = {
                    "id": article_id,
                    "title": title,
                    "subtitle": subtitle,
                    "body_html": body_html,
                    "tags": tags,
                    "slug": slug,
                    "created_at": timestamp,
                }

            cover_path = existing.get("cover") if existing else None
            if request.FILES.get('cover'):
                cover_file = request.FILES['cover']
                cover_name = f"{article_id}{Path(cover_file.name).suffix}"
                target = ARTICLES_COVERS_DIR / cover_name
                with target.open('wb') as fh:
                    for chunk in cover_file.chunks():
                        fh.write(chunk)
                cover_path = _media_url("articles", cover_name)

            record["cover"] = cover_path
            record["id"] = article_id
            record["file"] = str(_article_path(article_id).relative_to(settings.BASE_DIR))

            _article_path(article_id).write_text(
                json.dumps(record, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
            messages.success(
                request,
                'Draft saved locally.' if is_edit else 'Draft created locally.'
            )
            if not is_edit:
                return redirect('manage_articles')

            context.update({
                'draft_title': record.get("title", ""),
                'draft_subtitle': record.get("subtitle", ""),
                'draft_body': record.get("body_html", ""),
                'draft_tags': record.get("tags", []) or [],
                'article_id': record.get("id", article_id),
                'existing_cover': record.get("cover"),
            })

    return render(request, 'add_article.html', context)

    
# Project management views
def add_project(request):
    if not _ensure_staff(request):
        return redirect('works')
    
    all_projects = _load_projects()
    cat_choices = _project_category_choices(all_projects)
    
    # Context dictionary to preserve inputs if validation fails
    context = {
        'tag_choices': cat_choices,
        'draft_tags': [],
        'draft_custom_tags': ''
    }
    
    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        description = request.POST.get('description', '').strip()
        uploaded_images = request.FILES.getlist('images')
        
        # 1. EXPLICIT CATEGORY PARSING (No external functions)
        selected_cats = request.POST.getlist('categories')
        custom_cats_raw = request.POST.get('custom_categories', '').strip()
        
        # Merge checkboxes and custom text into one clean list
        categories = set(c.strip() for c in selected_cats if c.strip())
        if custom_cats_raw:
            categories.update(c.strip() for c in custom_cats_raw.split(',') if c.strip())
        categories = sorted(list(categories), key=str.casefold)
        
        # 2. VALIDATION
        errors = []
        if not title: errors.append('Title is required.')
        if not categories: errors.append('At least one category is required.')
        if not uploaded_images: errors.append('At least one image is required.')

        if not errors:
            project_id = _slugify(title)
            try:
                saved_filenames = [_save_project_image(img) for img in uploaded_images]
                
                new_project = {
                    "id": project_id,
                    "title": title.upper(),
                    "description": description,
                    "category": categories, # Saves as a clean list
                    "images": saved_filenames,
                    "created_at": datetime.utcnow().isoformat()
                }
                all_projects.append(new_project)
                _save_projects(all_projects)
                messages.success(request, 'Project added successfully!')
                return redirect('works')
            except Exception as e:
                errors.append(f'Error saving project: {str(e)}')
        
        # 3. IF ERRORS, SEND THEM TO THE UI
        for error in errors:
            messages.error(request, error)
            
        # Keep the user's tags so they don't have to re-click them
        context['draft_tags'] = categories
        context['draft_custom_tags'] = custom_cats_raw

    return render(request, 'add_project.html', context)


def edit_project(request, project_id):
    if not _ensure_staff(request):
        return redirect('works')
    
    all_projects = _load_projects()
    
    project_data = _load_project(project_id)
    if not project_data:
        return redirect('works')
        
    project = _with_project_image_urls(project_data)
    
    current_cats = project.get("category", [])
    if isinstance(current_cats, str):
        current_cats = [current_cats] if current_cats else []

    cat_choices = _project_category_choices(all_projects, current_cats)
    draft_custom = ""

    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        description = request.POST.get('description', '').strip()
        
        selected_cats = request.POST.getlist('categories')
        custom_cats_raw = request.POST.get('custom_categories', '').strip()
        draft_custom = custom_cats_raw 
        
        categories = set(c.strip() for c in selected_cats if c.strip())
        if custom_cats_raw:
            categories.update(c.strip() for c in custom_cats_raw.split(',') if c.strip())
        categories = sorted(list(categories), key=str.casefold)

        keep_existing = request.POST.get('keep_existing') == 'true'
        
        if keep_existing:
            final_images = request.POST.getlist('ordered_filenames')
        else:
            final_images = []

        new_files = request.FILES.getlist('new_images')
        for f in new_files:
            new_img_path = _save_project_image(f) 
            final_images.append(new_img_path)

        errors = []
        if not title: errors.append('Title is required.')
        if not categories: errors.append('At least one category is required.')

        if not errors:
            try:
                for p in all_projects:
                    if p.get('id') == project_id:
                        p['title'] = title.upper()
                        p['description'] = description
                        p['category'] = categories
                        p['images'] = final_images 
                        break
                
                _save_projects(all_projects)
                messages.success(request, 'Project updated successfully!')
                return redirect('works')
                
            except Exception as e:
                 errors.append(f'Error updating project: {str(e)}')
                 
        for error in errors:
            messages.error(request, error)
            
        project['title'] = title
        project['description'] = description
        current_cats = categories

    return render(request, 'edit_project.html', {
        'project': project,
        'tag_choices': cat_choices,
        'draft_tags': current_cats,
        'draft_custom_tags': draft_custom
    })


def _delete_physical_images(image_list):
    """Helper to remove files from the media/projects folder"""
    for filename in image_list:
        file_path = os.path.join(settings.MEDIA_ROOT, 'projects', filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")


def delete_project(request, project_id):
    if not _ensure_staff(request):
        return redirect('works')
    
    if request.method == 'POST':
        all_projects = _load_projects()
        
        project_to_del = next((p for p in all_projects if p.get('id') == project_id), None)
        
        if project_to_del:
            image_list = project_to_del.get('images', [])
            for img_path in image_list:
                full_path = os.path.join(settings.MEDIA_ROOT, img_path)
                
                if os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                    except Exception as e:
                        print(f"Error deleting file {full_path}: {e}")

            new_projects_list = [p for p in all_projects if p.get('id') != project_id]
            _save_projects(new_projects_list)
            
            messages.success(request, 'Project and images deleted successfully!')
        else:
            messages.error(request, 'Could not find that project to delete.')
    
    return redirect('works')


def serve_media(request, path):
    normalized = path.replace("\\", "/").lstrip("/")
    allowed_roots = {
        "articles": Path(settings.MEDIA_ROOT) / "articles",
        "projects": Path(settings.MEDIA_ROOT) / "projects",
    }

    top_level = normalized.split("/", 1)[0]
    root_dir = allowed_roots.get(top_level)
    if root_dir is None:
        raise Http404("File not found")

    relative_path = normalized[len(top_level):].lstrip("/")
    candidate = (root_dir / relative_path).resolve() if relative_path else root_dir.resolve()
    root_resolved = root_dir.resolve()
    if root_resolved not in candidate.parents and candidate != root_resolved:
        raise Http404("File not found")
    if not candidate.exists() or not candidate.is_file():
        raise Http404("File not found")

    return FileResponse(candidate.open("rb"))


def _project_category_choices(projects=None, extra_cats=None):
    """Gathers all unique categories used across projects."""
    projects = projects if projects is not None else _load_projects()
    discovered = []
    for p in projects:
        # Handles both old (string) and new (list) data for safety
        cats = p.get("category")
        if isinstance(cats, list):
            discovered.extend(cats)
        elif cats:
            discovered.append(cats)
            
    unique = _merge_tag_choices(discovered, extra_cats)
    unique.sort(key=str.casefold)
    return unique
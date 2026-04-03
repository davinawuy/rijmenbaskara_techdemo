# Deploying To Rumahweb

This project is prepared for Rumahweb's cPanel `Setup Python App` flow.

## What changed

- Added `passenger_wsgi.py` for Passenger/cPanel entrypoint support.
- Kept framework static assets in `static/` for `collectstatic`.
- Moved runtime-uploaded project and gallery images to Django media paths so uploads still work after deployment.
- Relaxed Django from `6.0` to `>=5.2,<6.0` because Django 6 requires newer Python versions than many shared-hosting Python setups provide.

## Rumahweb setup steps

1. In cPanel, open `Setup Python App`.
2. Create the app with:
   - Python Version: the newest version Rumahweb offers for your plan.
   - Application Root: the folder where this project will live.
   - Application URL: your domain or subpath.
   - Application Startup File: `passenger_wsgi.py`
   - Application Entry Point: `application`
3. Open the app details and copy the virtualenv `source` command Rumahweb shows.
4. Connect with SSH or cPanel Terminal and run that `source` command.
5. Inside the app root, install dependencies:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

6. Set these environment variables in cPanel:
   - `DJANGO_ENV=production`
   - `DEBUG=False`
   - `SECRET_KEY=<your-production-secret>`
   - `ALLOWED_HOSTS=<your-domain>,www.<your-domain>`
   - `CSRF_TRUSTED_ORIGINS=https://<your-domain>,https://www.<your-domain>`

7. Run:

```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

8. Restart the Python app from cPanel.

## Notes

- Existing article covers continue to load from `/media/covers/...`.
- New project and gallery uploads are now served from `/media/...`, which is safer on shared hosting than writing into `static/`.
- If Rumahweb shows an app error, inspect `stderr.log` in the application root.

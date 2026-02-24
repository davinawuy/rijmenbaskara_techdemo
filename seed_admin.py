import os
import sys
import django
from pathlib import Path

# Setup Django
sys.path.append(str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rijmenbaskara.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def seed_admin():
    """Create an admin superuser with username 'admin' and password 'admin'"""
    username = 'admin'
    password = 'admin'
    email = 'admin@example.com'
    
    # Check if admin user already exists
    if User.objects.filter(username=username).exists():
        print(f"✓ Admin user '{username}' already exists")
        # Update password in case it changed
        user = User.objects.get(username=username)
        user.set_password(password)
        user.save()
        print(f"✓ Updated password for '{username}'")
    else:
        # Create new superuser
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        print(f"✓ Created admin superuser '{username}' with password '{password}'")
    
    print("-" * 50)
    print("Admin credentials:")
    print(f"  Username: {username}")
    print(f"  Password: {password}")
    print("-" * 50)

if __name__ == "__main__":
    seed_admin()

"""
Script to create an admin user (Django version)
Usage: python scripts/create_admin.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studybuddy.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from users.models import User, UserRole


def create_admin():
    try:
        # Check if admin already exists
        admin_exists = User.objects.filter(role=UserRole.ADMIN).first()
        
        if admin_exists:
            print(f"Admin user already exists: {admin_exists.username}")
            return
        
        # Get admin details
        print("Create Admin User")
        print("-" * 50)
        username = input("Enter admin username: ").strip()
        email = input("Enter admin email: ").strip()
        password = input("Enter admin password: ").strip()
        full_name = input("Enter admin full name: ").strip()
        
        # Check if username or email already exists
        if User.objects.filter(username=username).exists():
            print("Error: Username already exists!")
            return
        
        if User.objects.filter(email=email).exists():
            print("Error: Email already exists!")
            return
        
        # Create admin user using Django's create_user method
        admin_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            full_name=full_name,
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
            is_staff=True,
            is_superuser=True
        )
        
        print("\n" + "=" * 50)
        print("[SUCCESS] Admin user created successfully!")
        print(f"Username: {admin_user.username}")
        print(f"Email: {admin_user.email}")
        print(f"Role: {admin_user.role}")
        print(f"Can access Django admin: Yes")
        print("=" * 50)
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    create_admin()

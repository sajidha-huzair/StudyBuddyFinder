from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserRole(models.TextChoices):
    STUDENT = 'STUDENT', 'Student'
    ADMIN = 'ADMIN', 'Admin'


class UserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        if not username:
            raise ValueError('Username is required')
        
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('role', UserRole.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)
        
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=150, unique=True, db_index=True)
    hashed_password = models.CharField(max_length=255)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.STUDENT
    )
    
    bio = models.TextField(blank=True, null=True)
    education_level = models.CharField(max_length=50, blank=True, null=True)
    university = models.CharField(max_length=200, blank=True, null=True)
    major = models.CharField(max_length=100, blank=True, null=True)
    year = models.CharField(max_length=50, blank=True, null=True)
    grade = models.CharField(max_length=20, blank=True, null=True)
    grade_band = models.CharField(max_length=20, blank=True, null=True)
    stream = models.CharField(max_length=40, blank=True, null=True)
    medium = models.CharField(max_length=20, blank=True, null=True)
    exam_year = models.IntegerField(blank=True, null=True)
    district = models.CharField(max_length=80, blank=True, null=True)
    mentor_mode = models.BooleanField(default=False)
    parent_email = models.EmailField(blank=True, null=True)
    school_verified = models.BooleanField(default=False)
    courses = models.TextField(default='[]', blank=True)
    study_preferences = models.TextField(default='{}', blank=True)
    availability = models.TextField(default='{}', blank=True)
    
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    last_login = models.DateTimeField(null=True, blank=True)
    last_active_at = models.DateTimeField(null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.username
    
    def get_password(self):
        return self.hashed_password
    
    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.hashed_password = make_password(raw_password)
    
    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.hashed_password)
    
    @property
    def password(self):
        return self.hashed_password
    
    @password.setter
    def password(self, value):
        if value.startswith('pbkdf2_sha256$') or value.startswith('bcrypt$'):
            self.hashed_password = value
        else:
            from django.contrib.auth.hashers import make_password
            self.hashed_password = make_password(value)


class BlockedUser(models.Model):
    blocker = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='blocks_made',
        db_column='blocker_id',
    )
    blocked = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='blocks_received',
        db_column='blocked_id',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blocked_users'
        unique_together = ['blocker', 'blocked']
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.blocker.username} blocked {self.blocked.username}'


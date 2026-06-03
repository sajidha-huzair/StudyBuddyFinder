from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('buddy_request', 'Buddy Request'), ('buddy_accepted', 'Buddy Accepted'), ('buddy_rejected', 'Buddy Rejected'), ('session_invite', 'Session Invite'), ('session_reminder', 'Session Reminder'), ('new_message', 'New Message'), ('system', 'System')], max_length=50)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('link', models.CharField(blank=True, default='', max_length=255)),
                ('read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='users.user')),
            ],
            options={
                'db_table': 'notifications',
                'ordering': ['-created_at'],
            },
        ),
    ]

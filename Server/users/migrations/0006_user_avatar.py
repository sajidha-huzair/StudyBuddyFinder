from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_user_last_active_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar',
            field=models.ImageField(blank=True, null=True, upload_to='avatars/'),
        ),
    ]

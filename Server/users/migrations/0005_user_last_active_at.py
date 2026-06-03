from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_blockeduser'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='last_active_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

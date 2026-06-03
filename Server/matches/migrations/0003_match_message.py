from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('matches', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='message',
            field=models.TextField(blank=True, null=True),
        ),
    ]

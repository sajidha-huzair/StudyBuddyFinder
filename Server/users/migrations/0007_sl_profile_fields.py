from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_user_avatar'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='grade_band',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='stream',
            field=models.CharField(blank=True, max_length=40, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='medium',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='exam_year',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='district',
            field=models.CharField(blank=True, max_length=80, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='mentor_mode',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='parent_email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='school_verified',
            field=models.BooleanField(default=False),
        ),
    ]

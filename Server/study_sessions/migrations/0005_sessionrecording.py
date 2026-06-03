import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('study_sessions', '0004_studysession_actual_duration_minutes_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='SessionRecording',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('daily_recording_id', models.CharField(blank=True, default='', max_length=120, unique=True)),
                ('download_url', models.URLField(blank=True, default='', max_length=1000)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('duration_seconds', models.IntegerField(default=0)),
                ('status', models.CharField(default='pending', max_length=30)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recordings', to='study_sessions.studysession')),
            ],
            options={
                'db_table': 'session_recordings',
                'ordering': ['-created_at'],
            },
        ),
    ]

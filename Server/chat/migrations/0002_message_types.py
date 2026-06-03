import json

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='attachment',
            field=models.FileField(blank=True, null=True, upload_to='chat/%Y/%m/'),
        ),
        migrations.AddField(
            model_name='message',
            name='is_pinned',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='message',
            name='message_type',
            field=models.CharField(
                choices=[
                    ('TEXT', 'Text'),
                    ('FILE', 'File'),
                    ('RECORDING', 'Recording'),
                    ('SESSION_PROPOSAL', 'Session proposal'),
                    ('SYSTEM', 'System'),
                ],
                default='TEXT',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='message',
            name='metadata',
            field=models.TextField(blank=True, default='{}'),
        ),
        migrations.AddField(
            model_name='message',
            name='read_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

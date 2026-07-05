import json

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('study_sessions', '0006_session_agenda_vault_parent'),
        ('users', '0007_sl_profile_fields'),
        ('chat', '0002_message_types'),
    ]

    operations = [
        migrations.CreateModel(
            name='ChatRoom',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('room_type', models.CharField(choices=[('session', 'Session'), ('group', 'Group')], default='session', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='chat_room', to='study_sessions.studysession')),
            ],
            options={'db_table': 'chat_rooms', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='ChatRoomMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('room', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='members', to='chat.chatroom')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chat_room_memberships', to='users.user')),
            ],
            options={'db_table': 'chat_room_members', 'unique_together': {('room', 'user')}},
        ),
        migrations.CreateModel(
            name='ChatRoomMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message_type', models.CharField(choices=[('TEXT', 'Text'), ('FILE', 'File'), ('RECORDING', 'Recording'), ('SESSION_PROPOSAL', 'Session proposal'), ('SYSTEM', 'System')], default='TEXT', max_length=20)),
                ('content', models.TextField()),
                ('attachment', models.FileField(blank=True, null=True, upload_to='chat/rooms/%Y/%m/')),
                ('metadata', models.TextField(blank=True, default='{}')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('room', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='chat.chatroom')),
                ('sender', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='room_messages', to='users.user')),
            ],
            options={'db_table': 'chat_room_messages', 'ordering': ['created_at']},
        ),
    ]

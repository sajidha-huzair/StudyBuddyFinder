import study_sessions.models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('study_sessions', '0005_sessionrecording'),
    ]

    operations = [
        migrations.CreateModel(
            name='SessionAgenda',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('topics', models.JSONField(blank=True, default=list)),
                ('past_paper_ref', models.CharField(blank=True, default='', max_length=200)),
                ('checklist', models.JSONField(blank=True, default=list)),
                ('pre_read_notes', models.TextField(blank=True, default='')),
                ('session_goal', models.TextField(blank=True, default='')),
                ('template_id', models.CharField(blank=True, default='', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('session', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='agenda', to='study_sessions.studysession')),
            ],
            options={'db_table': 'session_agendas'},
        ),
        migrations.CreateModel(
            name='SessionNote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('note_type', models.CharField(choices=[('pre', 'Pre-session'), ('post', 'Post-session')], default='post', max_length=10)),
                ('content', models.TextField(blank=True, default='')),
                ('weak_topics', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notes', to='study_sessions.studysession')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='session_notes', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'session_notes', 'unique_together': {('session', 'user', 'note_type')}},
        ),
        migrations.CreateModel(
            name='SessionSummary',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('summary_text', models.TextField(blank=True, default='')),
                ('action_items', models.JSONField(blank=True, default=list)),
                ('ai_generated', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='session_summaries_created', to=settings.AUTH_USER_MODEL)),
                ('session', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='summary', to='study_sessions.studysession')),
            ],
            options={'db_table': 'session_summaries'},
        ),
        migrations.CreateModel(
            name='SubjectVaultFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subject', models.CharField(max_length=100)),
                ('title', models.CharField(max_length=200)),
                ('file', models.FileField(upload_to='vault/')),
                ('file_size', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='vault_files', to='study_sessions.studysession')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vault_files', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'subject_vault_files', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='ParentLink',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('parent_email', models.EmailField(max_length=254)),
                ('access_token', models.CharField(max_length=64, unique=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parent_links', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'parent_links', 'unique_together': {('student', 'parent_email')}},
        ),
    ]

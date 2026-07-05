from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0003_chatroom_group_chat'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatroom',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='chatroom',
            name='icon',
            field=models.ImageField(blank=True, null=True, upload_to='chat/rooms/icons/'),
        ),
        migrations.AddField(
            model_name='chatroom',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]

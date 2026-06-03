import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studybuddy.settings')
django.setup()
from django.db import connection
with connection.cursor() as c:
    for table in ['study_sessions', 'messages', 'session_participants']:
        c.execute("""
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_name = %s ORDER BY ordinal_position
        """, [table])
        rows = c.fetchall()
        print(table + ':', rows if rows else 'NOT FOUND')

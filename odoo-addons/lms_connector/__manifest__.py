{
    'name': 'MasteryLMS Connector',
    'version': '1.0.0',
    'category': 'Education',
    'summary': 'Bridges Odoo course sales & enrollment payments with MasteryLMS microservices',
    'description': """
MasteryLMS Connector
====================
Synchronizes paid student enrollments and course completions between Odoo and MasteryLMS.
- Emits webhook to NestJS Gateway upon payment confirmation
- Triggers student concept mastery row seeding via gRPC
- Archives verified completion certificates
    """,
    'author': 'MasteryLMS Team',
    'depends': ['base', 'sale_management', 'account'],
    'data': [],
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}

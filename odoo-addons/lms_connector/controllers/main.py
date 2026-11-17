# -*- coding: utf-8 -*-
import json
from odoo import http
from odoo.http import request

class LmsConnectorController(http.Controller):

    @http.route('/lms/health', type='http', auth='public', methods=['GET'], csrf=False)
    def health_check(self):
        return request.make_response(
            json.dumps({'status': 'ok', 'connector': 'MasteryLMS Odoo Bridge'}),
            headers=[('Content-Type', 'application/json')]
        )

    @http.route('/lms/enrollments', type='json', auth='public', methods=['POST'], csrf=False)
    def create_odoo_enrollment(self, **kwargs):
        """Creates an unconfirmed enrollment order in Odoo from the LMS."""
        student_name = kwargs.get('student_name', 'Student')
        student_email = kwargs.get('student_email')
        student_uuid = kwargs.get('student_uuid')
        course_id = kwargs.get('course_id')

        if not student_uuid or not course_id:
            return {'error': 'Missing student_uuid or course_id'}

        enrollment = request.env['lms.enrollment'].sudo().create({
            'student_name': student_name,
            'student_email': student_email,
            'student_uuid': student_uuid,
            'course_id': course_id,
            'state': 'draft',
        })

        return {
            'success': True,
            'enrollment_id': enrollment.id,
            'reference': enrollment.name,
        }

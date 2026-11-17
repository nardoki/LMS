# -*- coding: utf-8 -*-
import json
import logging
import os
import urllib.request
from odoo import models, fields, api, _
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

class LmsEnrollment(models.Model):
    _name = 'lms.enrollment'
    _description = 'MasteryLMS Paid Course Enrollment'
    _order = 'create_date desc'

    name = fields.Char(string='Enrollment Ref', required=True, copy=False, default=lambda self: _('New'))
    student_name = fields.Char(string='Student Name', required=True)
    student_email = fields.Char(string='Student Email', required=True)
    student_uuid = fields.Char(string='Supabase Student UUID', required=True)
    course_id = fields.Char(string='Mastery Course UUID', required=True)
    amount_paid = fields.Float(string='Paid Amount', default=0.0)
    state = fields.Selection([
        ('draft', 'Draft'),
        ('paid', 'Payment Received'),
        ('enrolled', 'Synced with LMS'),
        ('failed', 'Sync Error')
    ], string='Status', default='draft')
    sync_response = fields.Text(string='LMS Gateway Response', readonly=True)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('New')) == _('New'):
                vals['name'] = self.env['ir.sequence'].next_by_code('lms.enrollment') or 'ENR-001'
        return super().create(vals_list)

    def action_confirm_and_sync_lms(self):
        """Sends an enrollment webhook to the MasteryLMS NestJS Gateway."""
        gateway_url = os.environ.get('LMS_GATEWAY_URL', 'http://host.docker.internal:3000')
        webhook_endpoint = f"{gateway_url}/odoo/webhook/enrollment"

        for rec in self:
            payload = {
                'student_id': rec.student_uuid,
                'course_id': rec.course_id,
                'odoo_ref': rec.name,
                'student_email': rec.student_email,
            }

            try:
                data = json.dumps(payload).encode('utf-8')
                req = urllib.request.Request(
                    webhook_endpoint,
                    data=data,
                    headers={
                        'Content-Type': 'application/json',
                        'User-Agent': 'Odoo-LMS-Connector/1.0',
                    },
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp_body = resp.read().decode('utf-8')
                    rec.write({
                        'state': 'enrolled',
                        'sync_response': resp_body,
                    })
                    _logger.info("Successfully synced enrollment %s to MasteryLMS", rec.name)
            except Exception as e:
                rec.write({
                    'state': 'failed',
                    'sync_response': str(e),
                })
                _logger.error("Failed to sync enrollment %s to MasteryLMS: %s", rec.name, e)
                raise UserError(_("Failed to sync with MasteryLMS Gateway: %s") % str(e))

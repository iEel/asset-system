# Overview

## Purpose

Asset Management System is an enterprise system for registering, tracking, auditing, maintaining, disposing, and reporting company assets. It is designed around Thai operational workflows while keeping route, data, and permission boundaries clear enough for production support.

## Primary Users

- `system_admin`
- `asset_admin` / IT staff
- `auditor`
- `audit_reviewer`
- `accounting`
- `department_manager`
- `employee`
- `viewer`

## Core Modules

- Dashboard and actionable operations summary
- Asset Register, Asset Detail, Asset Create/Edit, and Batch Create
- QR/barcode scan and asset search
- QR label printing and print tracking
- Check-out, check-in, transfer, and bulk movement
- Asset audit rounds, scan, findings, review, and close-round controls
- Maintenance tickets and Preventive Maintenance plans
- Disposal request, approval, evidence, and actual execution
- Reports and exports
- Master Data for company, branch, department, employee, location, category, brand/model, supplier
- Admin settings, RBAC, audit trail, readiness checks, storage governance, and scheduler settings

## Production Handoff Goals

- Keep business workflows intact.
- Keep real credentials and infrastructure values outside Git.
- Document operational readiness before go-live.
- Make UAT clear by role.
- Make security and backup responsibilities explicit.

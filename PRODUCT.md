# Product

## Register

product

## Users

This is an enterprise asset management system for Thai corporate operations. It supports users who manage, audit, approve, maintain, report on, and review physical assets across companies, branches, departments, and custody workflows.

Primary users include:

- system_admin
- asset_admin / IT staff
- auditor
- audit_reviewer
- accounting
- department_manager
- branch staff
- employee
- viewer
- executives / management users who review dashboards and reports

Users work in operational contexts where accuracy, traceability, permission boundaries, and fast lookup matter. Desktop users manage dense records, approvals, reports, settings, imports, and exports. Mobile and tablet users perform field audit work, QR scanning, evidence capture, custody checks, and asset lookup on-site.

## Product Purpose

The product exists to manage the full lifecycle of corporate assets: registration, ownership and custody, QR and label workflows, audit rounds, maintenance, disposal, reporting, RBAC and admin settings, LDAP/AD integration, and production operations.

Success means users can trust the system as the source of record for asset operations, audits, accounting evidence, compliance review, and management reporting. The interface should reduce operational mistakes, make asset state and responsibility clear, preserve audit trails, and support production readiness assumptions.

## Brand Personality

Professional, Reliable, Audit-friendly

The UI should also feel clean, calm, corporate, data-driven, and operationally efficient. It should communicate that the system is used for real internal asset operations, audits, accounting, and compliance, not for marketing or casual exploration.

## Anti-references

Avoid consumer-app styling, bright playful colors, heavy animation, marketing-style hero layouts, gamified UI, casual startup dashboards, decorative gradients, and anything that makes the system feel like a landing page instead of an enterprise operations tool.

Do not make the product feel playful or marketing-oriented. Avoid decorative interface choices that compete with dense operational content, weaken trust, or obscure workflow state.

## Design Principles

1. Preserve operational trust: workflow state, permissions, audit trails, and destructive actions must be clear before visual flourish.
2. Make dense work scannable: tables, forms, dashboards, reports, and logs should be calm, structured, and easy to compare.
3. Support field work without friction: QR scanning, audit evidence, touch controls, and mobile layouts must work under real on-site conditions.
4. Respect enterprise boundaries: RBAC, locale routing, Prisma and SQL Server behavior, and production readiness assumptions must remain intact.
5. Use status with evidence: status cues should combine text, shape, iconography, and clear labels instead of relying on color alone.

## Accessibility & Inclusion

Target WCAG 2.1 AA where practical.

The product should include strong mobile support for field audit and QR scanning, readable Thai and English text, keyboard navigation, visible focus states, reduced-motion support, color-blind-safe status cues, and status cues that do not rely on color alone.

Controls should be touch-safe on mobile and tablet field workflows. Empty, loading, error, permission-denied, and validation states should be clear, actionable, and consistent across the product.

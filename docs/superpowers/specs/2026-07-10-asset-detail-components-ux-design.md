# Asset Detail And Component Manager UX Design

## Status

Approved direction from the product owner on 2026-07-10. This specification covers presentation, navigation, client-side preferences, and read-path performance only. Existing API contracts, SQL schema, lifecycle transitions, RBAC enforcement, SOD, audit logs, attachment validation, and component sync behavior remain authoritative.

## Problem

The current Asset Detail page is reliable but asks an operator to process too many overlapping controls before reaching the asset record:

- A view selector and a section navigator both look like peer navigation.
- Desktop exposes six header actions; mobile stacks them above a second fixed action bar.
- Activity, summary cards, data health, and the record sections repeat the same facts.
- The responsibility summary can show an empty value for shared, stock, and component assets even when the matching department or parent exists.
- The read-only relationship map is followed by an always-expanded component installation editor. It loads candidate assets before the operator asks to install anything.

The resulting page is long, hard to scan on mobile, and expensive to load for a record that only needs a quick lookup.

## Goals

1. Make the first viewport answer: what is this asset, what is its condition, where is it, who or what owns responsibility, and what should happen next.
2. Use one visible navigation system for Asset Detail content.
3. Keep field actions touch-safe without duplicating desktop actions on mobile.
4. Make component installation fast through scan/search, clear review, and traceable confirmation.
5. Keep the relationship map as a read-only record while moving installation/removal work to a focused workspace.
6. Defer nonessential detail data so normal lookup does not wait for every history and evidence query.

## Non-Goals

- No changes to checkout, check-in, transfer, maintenance, audit, disposal, or component-sync business rules.
- No new category-to-component compatibility policy. Existing API guards remain in force. A configurable compatibility policy requires a separate business decision and data model.
- No destructive hard-delete behavior.
- No new visual theme; retain Navy, White, Action Blue, Electric Blue focus, semantic status tones, and Lucide icons.

## Asset Detail Information Architecture

### One Tab System

Replace the view selector plus section-link row with one URL-backed tab bar:

| Tab | Content |
| --- | --- |
| `ภาพรวม` | identity, status/condition, core data, specs, purchase/warranty, photos/files, notes |
| `ผู้ถือครอง` | company/branch/department, custody, locations, relationship summary, handover/return |
| `การดำเนินงาน` | movement timeline, maintenance, disposal-related follow-up where visible |
| `ตรวจนับ` | audit history and findings/follow-up |

The existing `view=overview|custody|operations|audit` query remains the shareable source of truth. Selecting a tab renders its matching content group; it does not change data, permissions, or workflow behavior. The old secondary section navigation is removed. Long groups may offer a compact local "ไปยังหัวข้อ" control only when the group has more than one long section.

### Identity And Exception Header

The header contains a compact image or category fallback icon, Asset Tag, name, category/serial metadata, StatusPill, Condition StatusPill, current location, and responsibility summary.

The responsibility summary must use the correct source by ownership type:

- personal: custodian
- shared and stock: department, falling back to current location
- component: installed parent, falling back to current location
- software license: assigned asset or license responsibility

Use `ยังไม่ระบุ` rather than `-` for missing operational data. Activity copy must not concatenate a movement title with an already titled summary.

Show one compact follow-up panel only when there is an actionable exception such as missing required data, open maintenance, active checkout, warranty risk, or audit finding. A healthy record does not need a large data-health panel in the first viewport.

### Action Hierarchy

Desktop header actions: Back, primary Edit when permitted, and an overflow menu for Activity, Evidence Center, Print Label, and Clone. Quick lifecycle actions remain within the active content group and are permission-aware.

Mobile header actions: Back and a More menu only. The fixed action bar has at most three stable actions: the ownership-specific primary lifecycle action, one secondary action, and More. It must not repeat Edit, Print, Evidence, Clone, or activity actions already available through the header menu. Long labels use short Thai labels plus Lucide icons rather than truncation.

All action visibility is determined from existing permission helpers. A user with view-only access sees the record, relationship, evidence, and history that their current access already permits, but does not receive mutation controls that lead to a permission-denied page.

## Component Manager

### Route And Read Model

`/{locale}/assets/{assetId}/components` is a focused Component Manager linked from the custody tab with `จัดการส่วนควบ`. It preserves a safe `returnTo` path to the originating Asset Detail.

Asset Detail retains a compact read-only relationship summary: installed-under parent, installed child count, missing-serial warning, and a small list of current components. The full three-lane map is retained only when the relationship is nontrivial. The inline installation/removal editor is removed from Asset Detail.

### Install Flow

1. The manager identifies the parent asset at the top of the page and shows current installed count.
2. The operator scans a component Asset Tag or searches by Asset Tag, Serial Number, or name. Candidate results stay empty until at least two search characters are entered, except for an explicit scan result.
3. The operator chooses or enters a suggested role, enters an optional slot, date, reason, and optional evidence photo.
4. A review surface shows parent and child Asset Tag, role, slot, current state, and any existing API validation warning before the existing install request is sent.
5. On success, the current-component list updates and offers `เพิ่มส่วนควบอีกชิ้น` while keeping parent context and optional shared defaults.

Suggested roles are a non-enforcing datalist: RAM, SSD, HDD, Power Supply, Network Card, Monitor, Adapter, and Other. Free text remains allowed to preserve existing business flexibility and legacy data.

### Removal And History

Current components render as compact rows with Asset Tag, name, role, slot, serial, installed date, installer, status badge, and evidence count. The `ถอดส่วนควบ` action opens a focused confirmation dialog containing the selected component, removal reason, optional evidence, and confirmation. Evidence selection must live in the same removal flow rather than separately on every installed row.

History is collapsed by default, shows recent records first, and uses a bounded preview with an explicit load-more or full-history action. Print and export are secondary More-menu actions.

### Mobile Behavior

On mobile, Scan Component is the primary entry action. Search is the fallback. The review and removal surfaces are bottom sheets or dialogs that keep the parent Asset Tag visible. Controls are at least 44px high, no page-level horizontal scroll is allowed, and the manager does not display the global mobile field dock while its contextual action bar is active.

## Performance And Code Boundaries

The current Asset Detail page is a large server component with initial data, evidence, operational history, and component candidates intertwined. Refactor only along existing data boundaries:

- `asset-detail-summary`: identity, responsibility, status, exception follow-up, and permission-aware action model.
- `asset-detail-tab-content`: per-view data/content boundaries with route-level loading fallbacks.
- `asset-detail-components`: compact read-only relationship summary for Asset Detail.
- `component-manager`: installation/removal client workflow and on-demand candidate lookup.

Do not fetch the global installed-component id set or the initial 300 component candidates for ordinary Asset Detail rendering. Candidate lookup belongs to Component Manager and remains server-filtered. Bound history and attachment previews; use existing Evidence Center for full evidence indexing.

## Accessibility And Error Behavior

- Preserve visible focus states and keyboard navigation for tabs, menus, list rows, dialogs, and search results.
- Use real buttons for actions and clear `aria-label` text for icon-only controls.
- Pair status color with StatusPill text and icon/context.
- Show API validation failures next to the affected install/removal field when possible; toasts supplement rather than replace form context.
- Keep existing attachment validation and evidence permission checks unchanged.

## Acceptance Criteria

- Asset Detail has one visible navigation layer and the selected `view` renders only its content group.
- At 390px, core asset identity is visible before secondary actions; there are no six stacked header actions and no duplicate fixed-action choices.
- Responsibility summary matches ownership type and does not contradict the ownership section.
- Component Manager opens from Asset Detail, preserves return context, and supports scan/search, review, install, remove, history, and existing audit logging.
- Component candidates are not loaded until a meaningful search or scan starts.
- View-only users do not see component install/remove or other mutation controls they cannot complete.
- Existing component installation, removal, audit expansion, parent-sync, evidence attachment, and return navigation tests remain green.
- New focused tests cover view grouping, mobile action limits, responsibility mapping, component manager URL/return handling, candidate search threshold, review state, and permission-aware controls.

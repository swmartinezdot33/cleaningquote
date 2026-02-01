# User roles (3 levels)

The app has three effective levels of access:

## 1. Super Admin (you)

- **How:** Your email is listed in the env variable `SUPER_ADMIN_EMAILS` (comma-separated). Same variable for local (`.env.local`) and production (Vercel env vars).
- **Access:** Full access everywhere, no restrictions.
  - **Dashboard:** Can switch to any organization and see that org’s tools, quotes, and members.
  - **Tools:** Can view, create, edit, delete, and clone any tool (any org). Tool APIs use service-role when you’re super admin so RLS never blocks you.
  - **Quotes:** Can list and delete any quote; can reassign quotes to other tools (super-admin-only API).
  - **Orgs:** Can invite/remove members and cancel invites for **any** org (even orgs you’re not a member of), list members for any org, create/delete orgs, and manage users via the Super Admin UI.
  - **Billing:** When you switch to an org in the header, you see billing for that org (same as org admin).
  - **Subscription gating:** Stripe subscription checks are skipped for you; you can use the dashboard for any org regardless of subscription.
- **UI:** “Super Admin” link in the dashboard header → `/dashboard/super-admin` (users, orgs, memberships, inbox, etc.).

## 2. Admin (org admin)

- **How:** User has `role = 'admin'` in `organization_members` for that organization.
- **Access:** Full control **within that org**:
  - Create, edit, delete tools for the org; manage widget/survey, GHL, pricing, etc.
  - List and delete quotes for tools in the org.
  - Invite and remove members, cancel invitations for the org.
  - List org members and pending invites.
  - Manage billing for the org (if Stripe is linked).
- **Restrictions:** Can only see and manage the orgs they belong to; cannot reassign quotes to other orgs’ tools or access Super Admin APIs.

## 3. Member

- **How:** User has `role = 'member'` in `organization_members` for that organization.
- **Access:** Can use the dashboard for that org’s tools (view/edit tools they have access to, view quotes) but **cannot**:
  - Invite or remove members, or cancel invites.
  - List org members (members list is restricted to org admin or super admin).
  - Manage billing for the org.
  - Delete quotes (only org admin or super admin can delete).
  - Create/delete organizations (only super admin can create/delete orgs via Super Admin UI; normal “create org” adds the user as org admin).

---

**Summary**

| Action / area        | Super Admin | Org Admin | Member |
|----------------------|-------------|-----------|--------|
| Switch to any org    | ✅          | ❌ (own orgs only) | ❌ (own orgs only) |
| Manage any tool      | ✅          | ✅ (own org) | ✅ (own org, view/edit) |
| Invite / members     | ✅ (any org) | ✅ (own org) | ❌ |
| Billing              | ✅ (any org) | ✅ (own org) | ❌ |
| Delete quotes        | ✅          | ✅ (own org) | ❌ |
| Reassign quote       | ✅          | ❌        | ❌ |
| Super Admin UI       | ✅          | ❌        | ❌ |
| Create/delete orgs   | ✅          | ❌*      | ❌ |

\* Normal users can create an org via dashboard (and become its admin); only super admin can create/delete orgs and users from the Super Admin UI.

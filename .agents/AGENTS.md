# Project Rules & Customizations

## User Financial Balance Rules
- **New User Initial Balance**: When a new user registers or signs up, they MUST always start with **0 money** (0 balance). No initial balance, welcome money, or automatic bonus funds are credited on account creation unless explicitly deposited.

## Admin Access & Authorization Rules
- **Admin Panel Access Control**: Normal users (`role !== 'admin'`) MUST NOT see or access the Admin Panel. Admin links in navigation/footer are strictly hidden from non-admin accounts. Direct navigation to `/admin` by non-admin users must immediately redirect to the homepage (`/`).


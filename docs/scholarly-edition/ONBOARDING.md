# PuniCodex Scholarly Edition — Onboarding Guide

## Authentication

All users sign in with their email and password at `/scholars/login/index.html`. Passwords must be at least 8 characters. If you forget your password, contact your institution admin (students and reviewers) or a PuniCodex curator (institution admins and curators).

## For Students

1. **Sign in** with your university email and password at `/scholars/login/index.html`.
2. Choose a flagship temple and open its **Scholars** tab.
3. Click **Propose Edit** on any section.
4. Write scholarly content, cite sources, and submit.
5. Wait for a faculty reviewer to approve your edit.

## For Faculty Reviewers

1. Sign in with your university email and password.
2. Visit `/scholars/review/index.html`.
3. Review pending edits from your institution.
4. Approve, reject, or request revision with a comment.

## For Institution Admins

1. Sign in with your email and password.
2. Visit `/scholars/institution/index.html`.
3. Add students:
   ```
   POST /api/v1/scholars/institution/students
   {
     "email": "student@university.edu",
     "displayName": "Student Name",
     "department": "Classics",
     "password": "temporary-password"
   }
   ```
   If `password` is omitted, a temporary password is generated and returned.
4. Promote a student to reviewer:
   ```
   POST /api/v1/scholars/institution/reviewers
   { "userId": 123 }
   ```
5. Reset passwords, disable accounts, and monitor contributions from the institution dashboard.

## For PuniCodex Curators

1. Sign in at `/scholars/login/index.html`.
2. Visit `/scholars/admin/index.html`.
3. Create institutions and institution admins:
   ```
   POST /api/v1/scholars/institutions
   {
     "name": "University Name",
     "slug": "university-name",
     "domain": "university.edu",
     "accreditation": "Regional",
     "adminEmail": "admin@university.edu",
     "adminPassword": "temporary-password",
     "adminDisplayName": "Admin Name",
     "adminDepartment": "Classics",
     "sponsorshipStatus": "active",
     "departmentAllowlist": ["Classics", "History"]
   }
   ```
4. Update sponsorship status and department allowlists as needed.
5. Monitor stats, freeze temples in disputes, and override reviews when necessary.
6. Disable or re-enable any account (`PATCH /api/v1/scholars/users/:id/status`).

## Password Requirements and Security

- Minimum 8 characters.
- Hashed with bcrypt (12 rounds).
- 5 failed sign-in attempts lock an account for 15 minutes.
- Institution admins must change their temporary password on first sign-in.
- Users can change their own password from the account menu.
- Institution admins can reset student/reviewer passwords.
- Curators can revoke access by setting `accountStatus` to `disabled`.

## Content Standards

- Cite sources from the hierarchy in `ACCURACY.md`.
- Avoid original research and religious advocacy.
- Use the markdown-like editor for paragraphs; sources are listed separately.

## Support

Contact the PuniCodex curator team for disputes, partnership inquiries, or technical issues.

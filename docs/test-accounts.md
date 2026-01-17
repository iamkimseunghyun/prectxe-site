# Test Accounts Documentation

## Admin Test Account

### Current Test Admin
- **Username**: `testadmin`
- **Password**: `test1234`
- **User ID**: `cmkhux5ju0000ga8jl29dclbm`
- **Role**: `ADMIN`

> ⚠️ **Note**: This is a test account with a simple password for development convenience.
> Use strong passwords for production environments.

### Accessing Admin Panel
1. Navigate to `http://localhost:3000/auth/signin` (dev) or `https://yourdomain.com/auth/signin` (production)
2. Enter credentials:
   - Username: `testadmin`
   - Password: `test1234`
3. Click "로그인" (Sign In)
4. You'll be redirected to `/admin` dashboard

### Admin Features
- **Dashboard**: `/admin` - Overview with stats for programs, journal, artists, venues, artworks, and forms
- **Programs**: `/admin/programs` - Manage programs (exhibitions, live events, parties, workshops, talks)
- **Journal**: `/admin/journal` - Manage articles and blog posts
- **Artists**: `/admin/artists` - Manage artist profiles
- **Venues**: `/admin/venues` - Manage venue information
- **Artworks**: `/admin/artworks` - Manage artwork catalog
- **Forms**: `/admin/forms` - Create and manage dynamic forms with custom fields

## Creating New Test Accounts

### Via Database (Recommended for Test Accounts)

1. Connect to the database using Prisma Studio:
   ```bash
   bunx prisma studio
   ```

2. Navigate to the `User` model

3. Create a new user with:
   - **username**: Your desired username
   - **email**: Optional email address
   - **password**: Hashed password (see below)
   - **role**: `ADMIN` or `USER`

### Generating Hashed Password

Run this Node.js script to generate a bcrypt hash:

```javascript
const bcrypt = require('bcryptjs');
const password = 'your-password-here';
const hash = await bcrypt.hash(password, 12);
console.log(hash);
```

Or use the sign-up flow at `/auth/signup` (if enabled).

### Via Sign Up Form

1. Navigate to `/auth/signup`
2. Fill in:
   - Username
   - Email
   - Password
3. Click "가입하기" (Sign Up)
4. **Note**: New users have `USER` role by default
5. To promote to `ADMIN`, update the `role` field in database:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE username = 'username';
   ```

## Database Access

### Connection Details
- Database: PostgreSQL (Neon)
- Connection string: See `DATABASE_URL` in `.env`
- Management: Prisma Studio (`bunx prisma studio`)

### Environment Variables
All sensitive credentials are stored in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `COOKIE_PASSWORD` - Iron Session encryption key
- `CLOUDFLARE_IMAGE_STREAM_API_TOKEN` - Image upload API token
- `CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID` - Cloudflare account ID

**⚠️ Never commit `.env` files to version control**

## Quick Reference

### Login URLs
- **Development**: `http://localhost:3000/auth/signin`
- **Production**: `https://yourdomain.com/auth/signin`

### Protected Routes
All `/admin/*` routes require `ADMIN` role:
- `/admin` - Dashboard
- `/admin/programs` - Programs management
- `/admin/journal` - Journal management
- `/admin/artists` - Artists management
- `/admin/venues` - Venues management
- `/admin/artworks` - Artworks management
- `/admin/forms` - Forms management

### Session Management
- **Technology**: Iron Session
- **Cookie Name**: `prectxe`
- **Session Data**: `{ id, name, isAdmin }`
- **Logout**: Click "로그아웃" in admin header or navigate to sign out

## Troubleshooting

### Can't Login
1. Verify username is correct (case-sensitive)
2. Check password is correct
3. Verify user exists in database: `bunx prisma studio`
4. Check user has password field set (not null)
5. Verify role is `ADMIN` for admin access

### Session Issues
1. Clear browser cookies
2. Restart development server
3. Check `COOKIE_PASSWORD` in `.env` is at least 32 characters
4. Verify session cookie is being set (check browser DevTools → Application → Cookies)

### Database Connection
1. Verify `DATABASE_URL` in `.env` is correct
2. Test connection: `bunx prisma db pull`
3. Check network access to Neon database
4. Verify SSL mode is enabled in connection string

## Security Notes

1. **Production**: Always use strong passwords for admin accounts
2. **Development**: Test accounts can use simple passwords for convenience
3. **Password Reset**: Not implemented - manage via database if needed
4. **2FA**: Not implemented - consider adding for production
5. **Session Timeout**: Configure in `iron-session` settings if needed

## Future Improvements

- [ ] Password reset functionality
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] Role-based permission system
- [ ] User management UI in admin panel
- [ ] Audit log for admin actions

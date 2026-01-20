# Staff Management Module - Implementation Guide

## Overview
This module implements comprehensive staff management functionality for restaurant administration. It's **separated from operational staff modules** (waiter, kitchen) to clarify this is an **admin-only feature** for creating and managing staff accounts.

## Module Purpose

**Staff Management** (Admin Feature):
- Create admin, waiter, and kitchen staff accounts
- List and filter staff members
- Update staff profiles and status
- Soft-deactivate staff accounts

**Operational Staff Modules** (in `/staff`):
- Waiter order management workflows
- Kitchen order preparation workflows

## Architecture

```
staff-management/
├── dto/
│   ├── create-staff.dto.ts      # DTOs for staff creation
│   ├── update-staff.dto.ts      # DTO for staff updates
│   ├── staff-response.dto.ts    # Response DTOs
│   └── list-staff-query.dto.ts  # Query parameters DTO
├── staff-management.controller.ts  # HTTP endpoints
├── staff-management.service.ts     # Business logic
├── staff-management.repository.ts  # Database operations
└── staff-management.module.ts      # Module configuration
```

## Database Migration

### Migration File
**Location**: `supabase/migrations/20260120000000_add_is_active_to_profiles.sql`

**Changes**:
- Added `is_active` column to `profiles` table (BOOLEAN, DEFAULT TRUE)
- Created indexes for performance optimization:
  - `idx_profiles_is_active` - For filtering by active status
  - `idx_profiles_role_restaurant` - For efficient staff listing queries

**To Apply**:
```bash
# Run the migration
npx supabase db push
```

## API Endpoints

### 1. POST `/staff/admins`
**Create Admin Account**

**Authorization**: Requires `admin` role

**Request Body**:
```json
{
  "email": "admin@restaurant.com",
  "name": "John Admin",
  "password": "CustomPassword123!" // Optional, uses default if not provided
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "admin account created successfully",
  "data": {
    "id": "uuid",
    "email": "admin@restaurant.com",
    "name": "John Admin",
    "role": "admin",
    "is_active": true,
    "created_at": "2024-01-20T00:00:00.000Z",
    "restaurant_id": "uuid"
  },
  "defaultPassword": "StaffDefault123!" // Only returned if password not provided
}
```

---

### 2. POST `/staff/waiters`
**Create Waiter Account**

**Authorization**: Requires `admin` role

**Request Body**:
```json
{
  "email": "waiter@restaurant.com",
  "name": "Jane Waiter",
  "password": "CustomPassword123!" // Optional
}
```

**Response**: Same structure as admin creation

---

### 3. POST `/staff/kitchen`
**Create Kitchen Staff Account**

**Authorization**: Requires `admin` role

**Request Body**:
```json
{
  "email": "chef@restaurant.com",
  "name": "Chef Mike",
  "password": "CustomPassword123!" // Optional
}
```

**Response**: Same structure as admin creation

---

### 4. GET `/staff`
**List All Restaurant Staff**

**Authorization**: Requires `admin` role

**Query Parameters**:
- `role` (optional): Filter by role (`admin`, `waiter`, `kitchen_staff`)
- `is_active` (optional): Filter by active status (boolean)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example Request**:
```
GET /staff?role=waiter&is_active=true&page=1&limit=10
```

**Response** (200):
```json
{
  "success": true,
  "message": "Staff list retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "email": "waiter@restaurant.com",
      "name": "Jane Waiter",
      "role": "waiter",
      "phone_number": "+1234567890",
      "avatar_url": "https://...",
      "is_active": true,
      "created_at": "2024-01-20T00:00:00.000Z",
      "restaurant_id": "uuid"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 5. GET `/staff/:id`
**Get Staff Member Details**

**Authorization**: Requires `admin` role

**Response** (200):
```json
{
  "success": true,
  "message": "Staff member retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "waiter@restaurant.com",
    "name": "Jane Waiter",
    "role": "waiter",
    "phone_number": "+1234567890",
    "avatar_url": "https://...",
    "is_active": true,
    "created_at": "2024-01-20T00:00:00.000Z",
    "restaurant_id": "uuid"
  }
}
```

---

### 6. PATCH `/staff/:id`
**Update Staff Member**

**Authorization**: Requires `admin` role

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "phone_number": "+1234567890",
  "avatar_url": "https://...",
  "is_active": false // Soft deactivate
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Staff member updated successfully",
  "data": {
    "id": "uuid",
    "email": "waiter@restaurant.com",
    "name": "Updated Name",
    "role": "waiter",
    "phone_number": "+1234567890",
    "avatar_url": "https://...",
    "is_active": false,
    "created_at": "2024-01-20T00:00:00.000Z",
    "restaurant_id": "uuid"
  }
}
```

## Implementation Details

### Architecture

```
staff/
├── dto/
│   ├── create-staff.dto.ts      # DTOs for staff creation
│   ├── update-staff.dto.ts      # DTO for staff updates
│   ├── staff-response.dto.ts    # Response DTOs
│   └── list-staff-query.dto.ts  # Query parameters DTO
├── staff.controller.ts          # HTTP endpoints
├── staff.service.ts             # Business logic
├── staff.repository.ts          # Database operations
└── staff.module.ts              # Module configuration
```

### Key Features

1. **Authentication Integration**
   - Uses `AuthService.signUp()` to create accounts
   - Automatically associates staff with restaurant
   - Generates default passwords if not provided

2. **Security**
   - All endpoints protected by JWT authentication
   - Role-based access control (admin only)
   - Restaurant scope enforcement
   - Soft deactivation (not deletion)

3. **Default Password**
   - Configurable via `DEFAULT_STAFF_PASSWORD` environment variable
   - Falls back to `StaffDefault123!` if not set
   - Returned in response for admin to communicate to staff

4. **Restaurant Scoping**
   - All operations scoped to admin's restaurant
   - Staff cannot be created for other restaurants
   - Staff listing filtered by restaurant

5. **Restrictions**
   - Cannot change staff role (immutable)
   - Cannot change restaurant association
   - Cannot hard delete staff (only deactivate via `is_active`)

### Environment Variables

Add to `.env`:
```env
# Default password for new staff accounts
DEFAULT_STAFF_PASSWORD=YourSecureDefaultPassword123!
```

## Testing

### Using Swagger UI
1. Start the server: `pnpm run dev`
2. Navigate to: `http://localhost:3000/api`
3. Authenticate as admin
4. Test the staff endpoints

### Using cURL

**Create a waiter**:
```bash
curl -X POST http://localhost:3000/staff/waiters \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "waiter@test.com",
    "name": "Test Waiter"
  }'
```

**List staff**:
```bash
curl http://localhost:3000/staff?role=waiter&is_active=true \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Deactivate staff**:
```bash
curl -X PATCH http://localhost:3000/staff/{staff-id} \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

## Security Considerations

1. **Password Management**
   - Default passwords should be changed by staff on first login
   - Implement password change flow for staff
   - Consider email notification for new accounts

2. **Soft Deletion**
   - Deactivated staff cannot login
   - Historical data remains intact
   - Can be reactivated if needed

3. **Audit Trail**
   - Track who created each staff account
   - Log status changes
   - Monitor failed login attempts

## Future Enhancements

- [ ] Email notification when staff account is created
- [ ] Require password change on first login
- [ ] Staff activity logging
- [ ] Bulk staff import
- [ ] Staff performance metrics
- [ ] Shift management integration

## Files Modified/Created

### New Files:
1. `supabase/migrations/20260120000000_add_is_active_to_profiles.sql`
2. `src/staff/dto/create-staff.dto.ts`
3. `src/staff/dto/update-staff.dto.ts`
4. `src/staff/dto/staff-response.dto.ts`
5. `src/staff/dto/list-staff-query.dto.ts`
6. `src/staff/staff.controller.ts`
7. `src/staff/staff.service.ts`
8. `src/staff/staff.repository.ts`
9. `src/staff/staff.module.ts`

### Modified Files:
1. `src/app.module.ts` - Added StaffModule import
2. `src/profiles/dto/profile-response.dto.ts` - Added is_active field

## Common Issues & Solutions

**Issue**: Email already registered
**Solution**: Check if user exists before creation, handle conflict appropriately

**Issue**: Staff from wrong restaurant
**Solution**: Always filter by `req.user.restaurantId`

**Issue**: Cannot deactivate self
**Solution**: Add validation to prevent admin from deactivating their own account

## Support

For issues or questions:
1. Check the implementation files
2. Review the migration SQL
3. Test endpoints in Swagger UI
4. Check logs for errors

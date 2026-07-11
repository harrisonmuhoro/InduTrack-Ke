# InduTrack KE — Profile Edit Permissions

> **Document:** Profile Management Reference  
> **System:** InduTrack KE  
> **Version:** 1.0.0  
> **Scope:** Defines exactly what each user role can and cannot edit on their profile.

---

## Core Rules (Apply to All Roles)

| Rule | Detail |
|---|---|
| **Email change** | Triggers re-verification email — account access continues but email is unverified until confirmed |
| **Password change** | Current password always required before setting a new one |
| **Locked fields** | Can only be changed by Institution Admin or Super Admin — never by the user themselves |
| **Profile photo** | Max 2MB, JPG or PNG only |
| **CV / Transcript** | Max 5MB, PDF only — uploading replaces the previous file |
| **Skills** | Stored as tags — user can add or remove individual tags |
| **Sensitive fields** | Reg number, institution, role, verified status — locked permanently at user level |

---

## Student

### ✅ Can Edit

#### Personal Information
| Field | Notes |
|---|---|
| Name | Full legal name |
| Phone number | With country code (+254) |
| Profile photo | JPG/PNG, max 2MB |
| Emergency contact name | — |
| Emergency contact phone | — |
| Emergency contact relation | e.g. Father, Mother, Guardian |

#### Attachment Profile
| Field | Notes |
|---|---|
| Skills | Add or remove skill tags (e.g. PHP, React, AutoCAD) |
| CV | Upload/replace — PDF only, max 5MB |
| Transcript | Upload/replace — PDF only, max 5MB |

#### Account & Security
| Field | Notes |
|---|---|
| Email | Triggers re-verification on change |
| Password | Current password required |

---

### 🔒 Cannot Edit (Locked)

| Field | Who Can Change It |
|---|---|
| Registration number | Institution Admin |
| Institution | Institution Admin |
| Department | Institution Admin |
| Program | Institution Admin |
| Year of study | Institution Admin |
| Role | Super Admin only |

---

## Company

### ✅ Can Edit

#### Organization Information
| Field | Notes |
|---|---|
| Description | About the company, what they do |
| Website | Full URL |
| Phone | Company contact number |
| Physical address | Street, building, county |
| Logo | JPG/PNG, max 2MB |

#### Account & Security
| Field | Notes |
|---|---|
| Email | Triggers re-verification on change |
| Password | Current password required |

---

### 🔒 Cannot Edit (Locked)

| Field | Who Can Change It |
|---|---|
| Company name | Institution Admin / Super Admin |
| Registration number | Super Admin only |
| Verified status | Institution Admin / Super Admin |
| Blacklist status | Institution Admin / Super Admin |
| Rating | System-calculated — not manually editable |
| Industry | Institution Admin / Super Admin |
| County | Institution Admin / Super Admin |

---

## Company Supervisor

### ✅ Can Edit

#### Personal Information
| Field | Notes |
|---|---|
| Name | Full name |
| Phone number | With country code |
| Profile photo | JPG/PNG, max 2MB |

#### Account & Security
| Field | Notes |
|---|---|
| Email | Triggers re-verification on change |
| Password | Current password required |

---

### 🔒 Cannot Edit (Locked)

| Field | Who Can Change It |
|---|---|
| Assigned company | Company / Institution Admin |
| Assigned students | Company |
| Role | Super Admin only |

---

## Academic Supervisor

### ✅ Can Edit

#### Personal Information
| Field | Notes |
|---|---|
| Name | Full name |
| Phone number | With country code |
| Profile photo | JPG/PNG, max 2MB |
| Department / Faculty | e.g. Department of ICT, School of Engineering |

#### Account & Security
| Field | Notes |
|---|---|
| Email | Triggers re-verification on change |
| Password | Current password required |

---

### 🔒 Cannot Edit (Locked)

| Field | Who Can Change It |
|---|---|
| Institution | Institution Admin |
| Assigned students | Institution Admin |
| Role | Super Admin only |

---

## Institution Admin

### ✅ Can Edit

#### Personal Information
| Field | Notes |
|---|---|
| Name | Full name |
| Phone number | With country code |
| Profile photo | JPG/PNG, max 2MB |

#### Institution Information
| Field | Notes | Permission Required |
|---|---|---|
| Institution email | Contact email for the institution | Super Admin approval |
| Institution phone | Main contact number | Super Admin approval |
| Institution address | Physical address | Super Admin approval |

> Institution name and active status can only be changed by Super Admin.

#### Account & Security
| Field | Notes |
|---|---|
| Email | Triggers re-verification on change |
| Password | Current password required |

---

### 🔒 Cannot Edit (Locked)

| Field | Who Can Change It |
|---|---|
| Institution name | Super Admin only |
| Institution active status | Super Admin only |
| Role | Super Admin only |
| Other users' roles | Super Admin only |

---

## Super Admin

### ✅ Can Edit

#### Personal Information
| Field | Notes |
|---|---|
| Name | Full name |
| Profile photo | JPG/PNG, max 2MB |

#### Account & Security
| Field | Notes |
|---|---|
| Email | Triggers re-verification on change |
| Password | Current password required |

---

### 🔒 Cannot Edit (Locked — by Design)

| Field | Why It's Locked |
|---|---|
| Own role | Prevents accidental self-lockout from Super Admin access |
| Own active status | Cannot disable their own account |

> These restrictions exist to prevent system lockout. A second Super Admin account must exist before any changes to Super Admin roles are made.

---

## Summary Table

| Field | Student | Company | Co. Supervisor | Ac. Supervisor | Inst. Admin | Super Admin |
|---|---|---|---|---|---|---|
| Name | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phone | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Profile photo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Email | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Password | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Skills | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CV upload | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Transcript upload | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Emergency contact | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Company description | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Company logo | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Company website | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Department/Faculty | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Institution info | ❌ | ❌ | ❌ | ❌ | ✅ (limited) | ✅ |
| Reg number | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Role | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Verified status | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## API Endpoints

```
PUT    /api/v1/profile                ← editable fields, role-aware
PUT    /api/v1/profile/password       ← all roles, requires current password
PUT    /api/v1/profile/email          ← all roles, triggers re-verification
POST   /api/v1/profile/photo          ← all roles, JPG/PNG max 2MB
POST   /api/v1/profile/cv             ← student only, PDF max 5MB
POST   /api/v1/profile/transcript     ← student only, PDF max 5MB
```

> One `PUT /profile` endpoint detects the authenticated user's role and updates
> the correct table automatically — no separate endpoints per role needed.

---

## Validation Rules (Backend)

```php
// Name
'name' => 'required|string|min:3|max:100'

// Phone
'phone' => 'required|string|regex:/^\+254[0-9]{9}$/'

// Email
'email' => 'required|email|unique:users,email,' . $user->id

// Password change
'current_password' => 'required'
'password'         => 'required|min:8|confirmed|different:current_password'

// Photo
'photo' => 'required|image|mimes:jpg,jpeg,png|max:2048'

// CV / Transcript
'cv'         => 'required|mimes:pdf|max:5120'
'transcript' => 'required|mimes:pdf|max:5120'

// Skills
'skills' => 'required|array|min:1|max:20'
'skills.*' => 'string|max:50'

// Emergency contact
'emergency_contact.name'     => 'required|string|max:100'
'emergency_contact.phone'    => 'required|string|regex:/^\+254[0-9]{9}$/'
'emergency_contact.relation' => 'required|string|max:50'
```

---

*InduTrack KE — Profile Edit Permissions v1.0.0*

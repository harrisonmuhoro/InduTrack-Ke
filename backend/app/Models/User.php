<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

// institution_id and company_id are included for seeder/admin assignment.
// They are intentionally excluded from ProfileController validation rules
// so ordinary profile requests cannot manipulate ownership fields.
#[Fillable(['name', 'email', 'phone', 'password', 'profile_photo_path', 'institution_id', 'company_id'])]
#[Hidden(['password', 'remember_token', 'google2fa_secret'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected $appends = ['profile_photo_url'];

    public function getProfilePhotoUrlAttribute()
    {
        return $this->profile_photo_path 
            ? url('storage/' . $this->profile_photo_path) 
            : null;
    }

    public function institution()
    {
        return $this->belongsTo(Institution::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function student()
    {
        return $this->hasOne(Student::class);
    }

    public function companySupervisor()
    {
        return $this->hasOne(CompanySupervisor::class);
    }

    public function institutionSupervisor()
    {
        return $this->hasOne(InstitutionSupervisor::class);
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    /**
     * Check if user has a specific role (or any of the passed roles).
     * Supports case-insensitivity, formatted strings, and role aliases like academic_supervisor <-> institution_supervisor.
     */
    public function hasRole(string|array $roles): bool
    {
        if (is_string($roles)) {
            $roles = array_map('trim', explode(',', $roles));
        }

        // Expand aliases and normalize (case-insensitive, underscore-separated)
        $checkRoles = [];
        foreach ($roles as $role) {
            $normalized = self::canonicalRoleName($role);
            $checkRoles[] = $normalized;
            if ($normalized === 'academic_supervisor') {
                $checkRoles[] = 'institution_supervisor';
            }
        }
        $checkRoles = array_unique($checkRoles);

        return $this->roles()->whereIn('name', $checkRoles)->exists();
    }

    public static function canonicalRoleName(?string $role): string
    {
        $normalized = strtolower(str_replace([' ', '-'], '_', trim((string) $role)));

        return $normalized === 'institution_supervisor' ? 'academic_supervisor' : $normalized;
    }

    /**
     * Check if user has a specific permission.
     * Superadmin always returns true.
     */
    public function hasPermission(string $permissionName): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->roles()
            ->whereHas('permissions', function ($query) use ($permissionName) {
                $query->where('name', $permissionName);
            })
            ->exists();
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function isInstitutionAdmin(): bool
    {
        return $this->hasRole('institution_admin');
    }

    public function isAcademicSupervisor(): bool
    {
        return $this->hasRole('academic_supervisor');
    }

    public function isCompanySupervisor(): bool
    {
        return $this->hasRole('company_supervisor');
    }

    public function isStudent(): bool
    {
        return $this->hasRole('student');
    }

    public function isCompany(): bool
    {
        return $this->hasRole('company');
    }

    /**
     * Resolve the company ID strictly according to the user's actual role.
     * - Company supervisors strictly use their assigned supervisor relationship (company_supervisors.company_id).
     * - Company managers strictly use their direct company assignment (users.company_id).
     * This prevents cross-contamination when a supervisor account has an inconsistent users.company_id set.
     */
    public function getCompanyId(): ?int
    {
        // 1. Company supervisor: strictly via CompanySupervisor relationship
        if ($this->isCompanySupervisor()) {
            return $this->companySupervisor?->company_id;
        }

        // 2. Company manager: strictly via direct company_id
        if ($this->isCompany()) {
            return $this->company_id;
        }

        // 3. Fallback for other roles if assigned
        return $this->company_id ?? $this->companySupervisor?->company_id;
    }
}

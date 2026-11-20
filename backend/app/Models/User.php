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

#[Fillable(['name', 'email', 'password', 'profile_photo_path', 'institution_id'])]
#[Hidden(['password', 'remember_token'])]
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
     * Supports role aliases like academic_supervisor <-> institution_supervisor.
     */
    public function hasRole(string|array $roles): bool
    {
        if (is_string($roles)) {
            $roles = array_map('trim', explode(',', $roles));
        }

        // Expand aliases
        $checkRoles = [];
        foreach ($roles as $role) {
            $checkRoles[] = $role;
            if ($role === 'academic_supervisor') {
                $checkRoles[] = 'institution_supervisor';
            } elseif ($role === 'institution_supervisor') {
                $checkRoles[] = 'academic_supervisor';
            }
        }
        $checkRoles = array_unique($checkRoles);

        return $this->roles()->whereIn('name', $checkRoles)->exists();
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
     * Resolve the company ID for company managers or company supervisors.
     */
    public function getCompanyId(): ?int
    {
        if ($this->companySupervisor) {
            return $this->companySupervisor->company_id;
        }

        $company = Company::where('email', $this->email)->first();
        return $company?->id;
    }
}

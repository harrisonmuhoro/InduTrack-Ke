<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TwoFactorAuthenticationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_login_challenge_does_not_authenticate_until_otp_is_verified(): void
    {
        $user = User::where('email', 'supervisor@uonbi.ac.ke')->firstOrFail();
        $user->forceFill([
            'google2fa_secret' => 'TESTSECRET',
            'two_factor_enabled' => true,
        ])->save();

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk()
            ->assertJsonPath('2fa_required', true)
            ->assertJsonPath('setup_required', false)
            ->assertJsonMissingPath('user');

        $this->getJson('/api/profile')->assertUnauthorized();

        $google2fa = \Mockery::mock();
        $google2fa->shouldReceive('verifyKey')->once()->with('TESTSECRET', '123456')->andReturnTrue();
        $this->app->instance('pragmarx.google2fa', $google2fa);

        $this->postJson('/api/auth/2fa/verify', ['otp' => '123456'])
            ->assertOk()
            ->assertJsonPath('role', 'academic_supervisor')
            ->assertJsonMissingPath('user.google2fa_secret');

        $this->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('role', 'academic_supervisor')
            ->assertJsonMissingPath('google2fa_secret');
    }

    public function test_pending_login_can_repair_missing_secret_and_verify_without_auth_middleware(): void
    {
        $user = User::where('email', 'john.doe@student.uonbi.ac.ke')->firstOrFail();
        $user->forceFill(['two_factor_enabled' => true, 'google2fa_secret' => null])->save();

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('2fa_required', true)->assertJsonPath('setup_required', true);

        $google2fa = \Mockery::mock();
        $google2fa->shouldReceive('generateSecretKey')->once()->andReturn('NEWSECRET');
        $google2fa->shouldReceive('getQRCodeInline')->once()->andReturn('<svg></svg>');
        $this->app->instance('pragmarx.google2fa', $google2fa);

        $this->postJson('/api/auth/2fa/setup')
            ->assertOk()
            ->assertJsonPath('secret', 'NEWSECRET')
            ->assertJsonPath('qr_code_svg', '<svg></svg>');

        $google2fa->shouldReceive('verifyKey')->once()->with('NEWSECRET', '654321')->andReturnTrue();
        $this->postJson('/api/auth/2fa/verify', ['otp' => '654321'])
            ->assertOk()
            ->assertJsonPath('role', 'student')
            ->assertJsonMissingPath('user.google2fa_secret');

        $this->assertTrue($user->fresh()->two_factor_enabled);
    }

    public function test_two_factor_endpoints_reject_requests_without_authentication_or_pending_login(): void
    {
        $this->postJson('/api/auth/2fa/setup')->assertUnauthorized();
        $this->postJson('/api/auth/2fa/verify', ['otp' => '123456'])->assertUnauthorized();
    }

    public function test_disabling_two_factor_requires_password_and_valid_otp(): void
    {
        $user = User::where('email', 'john.doe@student.uonbi.ac.ke')->firstOrFail();
        $user->forceFill(['two_factor_enabled' => true, 'google2fa_secret' => 'TESTSECRET'])->save();
        Sanctum::actingAs($user);

        $google2fa = \Mockery::mock();
        $google2fa->shouldReceive('verifyKey')->once()->with('TESTSECRET', '123456')->andReturnTrue();
        $this->app->instance('pragmarx.google2fa', $google2fa);

        $this->postJson('/api/auth/2fa/toggle', [
            'current_password' => 'password123',
            'otp' => '123456',
        ])->assertOk()->assertJsonPath('enabled', false);

        $user->refresh();
        $this->assertFalse((bool) $user->two_factor_enabled);
        $this->assertNull($user->google2fa_secret);
    }

    public function test_two_factor_login_returns_the_user_role_and_institution_context(): void
    {
        $user = User::where('email', 'admin@strathmore.edu')->firstOrFail();
        $user->forceFill([
            'google2fa_secret' => 'ADMINSECRET',
            'two_factor_enabled' => true,
        ])->save();

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('2fa_required', true);

        $google2fa = \Mockery::mock();
        $google2fa->shouldReceive('verifyKey')->once()->with('ADMINSECRET', '123456')->andReturnTrue();
        $this->app->instance('pragmarx.google2fa', $google2fa);

        $this->postJson('/api/auth/2fa/verify', ['otp' => '123456'])
            ->assertOk()
            ->assertJsonPath('role', 'institution_admin')
            ->assertJsonPath('context', 'Dr. Grace Njeri (Strathmore University)');
    }
}

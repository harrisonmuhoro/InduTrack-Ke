<?php

namespace Tests\Feature\Phase3;

use Tests\TestCase;
use App\Models\User;
use App\Models\Placement;
use App\Models\Message;
use Laravel\Sanctum\Sanctum;

class Phase3MessagingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    /**
     * Test 1: Student and assigned company supervisor can exchange messages.
     */
    public function test_student_and_assigned_company_supervisor_can_message(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();

        Sanctum::actingAs($john);
        $response = $this->postJson('/api/messages', [
            'receiver_id' => $jane->id,
            'body'        => 'Hello supervisor, I have pushed the week 10 sprint code.',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('messages', [
            'sender_id'   => $john->id,
            'receiver_id' => $jane->id,
            'body'        => 'Hello supervisor, I have pushed the week 10 sprint code.',
        ]);

        // Supervisor views thread and responds
        Sanctum::actingAs($jane);
        $threadRes = $this->getJson("/api/messages/thread/{$john->id}");
        $threadRes->assertStatus(200);

        $replyRes = $this->postJson('/api/messages', [
            'receiver_id' => $john->id,
            'body'        => 'Great job John, I will review it today.',
        ]);
        $replyRes->assertStatus(201);
    }

    /**
     * Test 2: Student and assigned academic supervisor can exchange messages.
     */
    public function test_student_and_assigned_academic_supervisor_can_message(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $alan = User::where('email', 'supervisor@uonbi.ac.ke')->first();

        Sanctum::actingAs($john);
        $response = $this->postJson('/api/messages', [
            'receiver_id' => $alan->id,
            'body'        => 'Dr. Alan, when will our next field visit be scheduled?',
        ]);

        $response->assertStatus(201);
    }

    /**
     * Test 3: Unrelated student and supervisor cannot message each other.
     */
    public function test_unrelated_student_and_supervisor_cannot_message(): void
    {
        // David is at Strathmore, Jane is Safaricom supervisor for John (UoN)
        $david = User::where('email', 'david.kamau@student.strathmore.edu')->first();
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();

        Sanctum::actingAs($david);
        $response = $this->postJson('/api/messages', [
            'receiver_id' => $jane->id,
            'body'        => 'Unauthorized message attempt.',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 4: Two unrelated students cannot message each other.
     */
    public function test_unrelated_students_cannot_message_each_other(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $david = User::where('email', 'david.kamau@student.strathmore.edu')->first();

        Sanctum::actingAs($john);
        $response = $this->postJson('/api/messages', [
            'receiver_id' => $david->id,
            'body'        => 'Hi David, are you free to chat?',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 5: Empty or oversized messages are rejected.
     */
    public function test_empty_or_oversized_messages_are_rejected(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();

        Sanctum::actingAs($john);

        // Empty message
        $this->postJson('/api/messages', [
            'receiver_id' => $jane->id,
            'body'        => '',
        ])->assertStatus(422);

        // Oversized message (> 2000 chars)
        $this->postJson('/api/messages', [
            'receiver_id' => $jane->id,
            'body'        => str_repeat('a', 2001),
        ])->assertStatus(422);
    }

    /**
     * Test 6: Unread count increments and clears when thread is opened.
     */
    public function test_unread_count_tracks_and_clears_correctly(): void
    {
        $john = User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $jane = User::where('email', 'jane.smith@safaricom.co.ke')->first();

        Sanctum::actingAs($john);
        $this->postJson('/api/messages', [
            'receiver_id' => $jane->id,
            'body'        => 'Message 1',
        ]);
        $this->postJson('/api/messages', [
            'receiver_id' => $jane->id,
            'body'        => 'Message 2',
        ]);

        Sanctum::actingAs($jane);
        $countRes = $this->getJson('/api/messages/unread');
        $this->assertEquals(2, $countRes->json('unread'));

        // Opening thread clears unread count
        $this->getJson("/api/messages/thread/{$john->id}")->assertStatus(200);

        $afterRes = $this->getJson('/api/messages/unread');
        $this->assertEquals(0, $afterRes->json('unread'));
    }
}

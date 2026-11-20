<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('logbook_entries')
            ->where('status', 'rejected')
            ->whereNull('correction_deadline')
            ->orderBy('id')
            ->chunkById(500, function ($entries) {
                foreach ($entries as $entry) {
                    // Without a reliable review timestamp, use original creation
                    // time so an old record is not silently granted fresh access.
                    $base = $entry->reviewed_at ?: $entry->created_at;
                    DB::table('logbook_entries')->where('id', $entry->id)->update([
                        'correction_deadline' => Carbon::parse($base)->addHours(72),
                    ]);
                }
            });

        DB::table('logbook_review_histories')
            ->where('previous_status', 'rejected')
            ->where('new_status', 'draft')
            ->where(function ($query) {
                $query->where('event_type', 'resubmit')
                    ->orWhere('comment', 'like', '%reopened the rejected entry%');
            })
            ->update([
                'actor_id' => DB::raw('COALESCE(actor_id, reviewer_id)'),
                'actor_role' => 'student',
                'event_type' => 'resubmit',
                'reviewer_id' => null,
            ]);

        DB::table('logbook_review_histories')
            ->whereIn('new_status', ['approved', 'rejected', 'flagged'])
            ->where(function ($query) {
                $query->whereNull('event_type')->orWhere('event_type', 'review');
            })
            ->orderBy('id')
            ->chunkById(500, function ($histories) {
                foreach ($histories as $history) {
                    $actorId = $history->actor_id ?: $history->reviewer_id;
                    $role = 'unknown';
                    if ($actorId) {
                        $roles = DB::table('user_roles')
                            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
                            ->where('user_roles.user_id', $actorId)
                            ->pluck('roles.name');
                        $role = $roles->contains('super_admin') ? 'super_admin'
                            : ($roles->contains('academic_supervisor') || $roles->contains('institution_supervisor')
                                ? 'academic_supervisor' : 'unknown');
                    }
                    DB::table('logbook_review_histories')->where('id', $history->id)->update([
                        'actor_id' => $actorId,
                        'actor_role' => $role,
                        'event_type' => 'review',
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Do not reverse data repair: that would reintroduce indefinite access.
    }
};

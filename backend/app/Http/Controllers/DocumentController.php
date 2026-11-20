<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class DocumentController extends Controller
{
    private const ALLOWED_TYPES = ['pdf', 'jpg', 'jpeg', 'png'];
    private const MAX_SIZE_KB = 5120; // 5MB

    private const DOCUMENT_TYPES = [
        'intro_letter', 'medical_cert', 'insurance_cert',
        'acceptance_letter', 'cv', 'transcript', 'other',
    ];

    public function upload(Request $request)
    {
        $request->validate([
            'type' => 'required|in:' . implode(',', self::DOCUMENT_TYPES),
            'file' => 'required|file|max:' . self::MAX_SIZE_KB
                     . '|mimes:pdf,jpg,jpeg,png',
        ]);

        $student = Student::where('user_id', $request->user()->id)->firstOrFail();
        $file    = $request->file('file');
        $path    = $file->store("documents/{$student->id}", 'local');

        if (! $path) {
            return response()->json(['message' => 'The document could not be stored.'], 500);
        }

        try {
            $doc = Document::create([
                'student_id'    => $student->id,
                'type'          => $request->type,
                'original_name' => $file->getClientOriginalName(),
                'file_path'     => $path,
                'mime_type'     => $file->getMimeType(),
                'file_size'     => $file->getSize(),
                'status'        => 'pending',
            ]);
        } catch (\Throwable $exception) {
            try {
                if (! Storage::disk('local')->delete($path)) {
                    Log::error('Failed to remove uploaded document after database persistence failed.', [
                        'student_id' => $student->id,
                    ]);
                }
            } catch (\Throwable $cleanupException) {
                Log::error('Document upload cleanup failed after database persistence failed.', [
                    'student_id' => $student->id,
                    'exception' => $cleanupException::class,
                ]);
            }
            throw $exception;
        }

        return response()->json($doc, 201);
    }

    public function list(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) return response()->json([]);
        
        return response()->json($student->documents()->latest()->get());
    }

    public function download(Request $request, $id)
    {
        $doc = Document::findOrFail($id);

        // Enforce policy authorization
        $this->authorize('download', $doc);

        if (!Storage::disk('local')->exists($doc->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return Storage::disk('local')->download($doc->file_path, $doc->original_name);
    }

    // Admin: review a document
    public function review(Request $request, $id)
    {
        $request->validate([
            'status'           => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|nullable|string',
        ]);

        $doc = Document::findOrFail($id);

        // Enforce policy authorization
        $this->authorize('review', $doc);

        $doc->update([
            'status'           => $request->status,
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by'      => $request->user()->id,
            'reviewed_at'      => now(),
        ]);

        return response()->json($doc);
    }

    // Admin: list all pending documents scoped to institution
    public function pendingDocuments(Request $request)
    {
        $user = $request->user();
        $query = Document::with('student.user')
            ->where('status', 'pending');

        if (!$user->isSuperAdmin()) {
            $query->whereHas('student', fn ($q) => $q->where('institution_id', $user->institution_id));
        }

        return response()->json($query->latest()->get());
    }
}

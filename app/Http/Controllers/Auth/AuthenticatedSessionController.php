<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\FarmUser;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/Login', [
            'status' => session('status'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'phone'    => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        // Find user by phone or email
        $user = User::where('phone', $request->phone)
            ->orWhere('email', $request->phone)
            ->first();

        if (!$user || !Auth::attempt(['email' => $user->email, 'password' => $request->password], $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'phone' => __('These credentials do not match our records.'),
            ]);
        }

        if (!$user->is_active) {
            Auth::logout();
            throw ValidationException::withMessages([
                'phone' => 'Your account has been deactivated. Please contact the farm owner.',
            ]);
        }

        // Verify user belongs to at least one farm
        $hasFarm = FarmUser::where('user_id', $user->id)->where('is_active', true)->exists();
        if (!$hasFarm) {
            Auth::logout();
            throw ValidationException::withMessages([
                'phone' => 'You are not associated with any farm. Please contact your farm owner.',
            ]);
        }

        // Update last login
        $user->update(['last_login_at' => now()]);

        $request->session()->regenerate();

        return redirect()->intended('/dashboard');
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}

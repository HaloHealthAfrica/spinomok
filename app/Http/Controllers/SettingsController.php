<?php

namespace App\Http\Controllers;

use App\Models\Farm;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function updateProfile(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $request->user()->id],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);

        $request->user()->update($validated);

        return back()->with('success', 'Profile updated.');
    }

    public function updateFarm(Request $request): RedirectResponse
    {
        abort_unless(
            in_array(app('current.farm.role'), ['farm_owner', 'farm_manager'], true),
            403
        );

        $farm = Farm::findOrFail(app('current.farm.id'));

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'owner_name' => ['required', 'string', 'max:255'],
            'county' => ['required', 'string', 'max:120'],
            'sub_county' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'default_milk_price' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'whatsapp_number' => ['nullable', 'string', 'max:40'],
        ]);

        $settings = $farm->settings ?? [];
        $settings['default_milk_price'] = $validated['default_milk_price'] ?? null;
        $settings['whatsapp_number'] = $validated['whatsapp_number'] ?? null;

        unset($validated['default_milk_price'], $validated['whatsapp_number']);

        $farm->update([
            ...$validated,
            'settings' => $settings,
        ]);

        return back()->with('success', 'Farm settings updated.');
    }
}

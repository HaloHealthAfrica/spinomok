<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Expense categories (system + custom per farm)
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('farm_id')->nullable(); // NULL = system-wide default
            $table->string('name', 100);
            $table->string('parent_category', 40)->nullable(); // feed|vet|labour|equipment|utilities|land|transport|breeding|other
            $table->string('icon', 10)->nullable(); // emoji
            $table->boolean('is_system')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['farm_id', 'name']);
        });

        // All farm expenditures
        Schema::create('expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->uuid('expense_category_id')->nullable();
            $table->string('category', 40)->nullable(); // shortcut: feed|vet|labour|equipment|utilities|land|transport|breeding|other
            $table->date('expense_date');
            $table->string('description', 255);
            $table->decimal('amount', 14, 2);
            $table->char('currency', 3)->default('KES');
            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence_interval', 20)->nullable(); // monthly|weekly|annual
            $table->string('supplier', 120)->nullable();
            $table->string('receipt_number', 80)->nullable();
            $table->string('payment_method', 40)->nullable(); // cash|mpesa|bank|credit
            $table->boolean('is_paid')->default(true);
            $table->timestamp('paid_at')->nullable();
            $table->uuid('reference_animal_id')->nullable(); // optional link to animal
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'expense_date']);
            $table->index(['farm_id', 'category']);
        });

        // Non-milk revenue streams
        Schema::create('revenues', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('category', 40); // milk_sales|animal_sales|manure_sales|crop_sales|subsidy|other
            $table->date('revenue_date');
            $table->string('description', 255);
            $table->decimal('amount', 14, 2);
            $table->char('currency', 3)->default('KES');
            $table->string('buyer_name', 120)->nullable();
            $table->uuid('reference_animal_id')->nullable();
            $table->string('receipt_number', 80)->nullable();
            $table->string('payment_method', 40)->nullable();
            $table->boolean('is_received')->default(true);
            $table->timestamp('received_at')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'revenue_date']);
            $table->index(['farm_id', 'category']);
        });

        // Pre-computed monthly P&L snapshots for fast dashboard loading
        Schema::create('profitability_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->smallInteger('period_year');
            $table->smallInteger('period_month'); // 1–12
            $table->decimal('total_milk_litres', 12, 3)->nullable();
            $table->decimal('total_milk_revenue', 14, 2)->nullable();
            $table->decimal('total_other_revenue', 14, 2)->nullable();
            $table->decimal('total_revenue', 14, 2)->nullable();
            $table->decimal('total_feed_cost', 14, 2)->nullable();
            $table->decimal('total_vet_cost', 14, 2)->nullable();
            $table->decimal('total_labour_cost', 14, 2)->nullable();
            $table->decimal('total_other_expenses', 14, 2)->nullable();
            $table->decimal('total_expenses', 14, 2)->nullable();
            $table->decimal('gross_margin', 14, 2)->nullable();
            $table->decimal('net_profit', 14, 2)->nullable();
            $table->decimal('cost_per_litre', 8, 4)->nullable();
            $table->decimal('revenue_per_litre', 8, 4)->nullable();
            $table->timestamp('computed_at')->nullable();
            $table->timestamps();

            $table->unique(['farm_id', 'period_year', 'period_month']);
            $table->index(['farm_id', 'period_year', 'period_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profitability_snapshots');
        Schema::dropIfExists('revenues');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
    }
};

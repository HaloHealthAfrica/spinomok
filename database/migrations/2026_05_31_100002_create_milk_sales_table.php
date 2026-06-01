<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('milk_sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignUuid('milk_buyer_id')->constrained('milk_buyers')->restrictOnDelete();
            $table->date('sale_date');
            $table->string('session', 10)->nullable();
            $table->decimal('quantity_litres', 8, 3);
            $table->decimal('price_per_litre', 8, 2);
            $table->decimal('total_amount', 12, 2);
            $table->boolean('is_paid')->default(false);
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_method', 40)->nullable(); // cash|mpesa|bank|credit
            $table->string('receipt_number', 80)->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farm_id', 'sale_date']);
            $table->index('milk_buyer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('milk_sales');
    }
};

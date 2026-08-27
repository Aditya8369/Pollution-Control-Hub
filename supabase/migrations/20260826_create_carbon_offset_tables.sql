-- CreateTable for Carbon Transactions
CREATE TABLE IF NOT EXISTS "carbon_transactions" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "project_id" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "tons_purchased" DECIMAL(10, 2) NOT NULL CHECK (tons_purchased > 0),
    "total_cost" DECIMAL(10, 2) NOT NULL,
    "currency" TEXT DEFAULT 'USD',
    "status" TEXT DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CreateTable for User Portfolio Summary
CREATE TABLE IF NOT EXISTS "user_carbon_portfolios" (
    "user_id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "total_offset_tons" DECIMAL(10, 2) DEFAULT 0.00,
    "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Index for faster querying of user transactions
CREATE INDEX IF NOT EXISTS "idx_carbon_transactions_user_id" ON "carbon_transactions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_carbon_transactions_created_at" ON "carbon_transactions"("created_at" DESC);

-- Add RLS Policies (Row Level Security)
ALTER TABLE "carbon_transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions" ON "carbon_transactions"
    FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE "user_carbon_portfolios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own portfolio" ON "user_carbon_portfolios"
    FOR SELECT USING (auth.uid() = user_id);

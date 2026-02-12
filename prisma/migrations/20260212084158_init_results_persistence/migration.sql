-- CreateTable
CREATE TABLE "AgentResult" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "checkpointId" TEXT,
    "questId" TEXT,
    "result" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckpointState" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "threadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckpointState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTrace" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,

    CONSTRAINT "AgentTrace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentResult_agentId_idx" ON "AgentResult"("agentId");

-- CreateIndex
CREATE INDEX "AgentResult_checkpointId_idx" ON "AgentResult"("checkpointId");

-- CreateIndex
CREATE INDEX "AgentResult_questId_idx" ON "AgentResult"("questId");

-- CreateIndex
CREATE INDEX "ExecutionLog_agentId_idx" ON "ExecutionLog"("agentId");

-- CreateIndex
CREATE INDEX "ExecutionLog_executionId_idx" ON "ExecutionLog"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckpointState_checkpointId_key" ON "CheckpointState"("checkpointId");

-- CreateIndex
CREATE INDEX "CheckpointState_agentId_idx" ON "CheckpointState"("agentId");

-- CreateIndex
CREATE INDEX "CheckpointState_threadId_idx" ON "CheckpointState"("threadId");

-- CreateIndex
CREATE INDEX "AgentTrace_agentId_idx" ON "AgentTrace"("agentId");

-- CreateIndex
CREATE INDEX "AgentTrace_executionId_idx" ON "AgentTrace"("executionId");

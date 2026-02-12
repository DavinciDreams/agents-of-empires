#!/bin/bash

# Test script for Results API endpoints
# Usage: ./test-results-api.sh [base-url]

BASE_URL="${1:-http://localhost:3000}"
AGENT_ID="test-agent-1"
RESULT_ID="test-result-1"

echo "Testing Results API Endpoints"
echo "================================"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: List results
echo "1. Testing GET /api/agents/$AGENT_ID/results"
curl -s "$BASE_URL/api/agents/$AGENT_ID/results?limit=10" | jq '.' || echo "Failed"
echo ""

# Test 2: List results with filters
echo "2. Testing GET /api/agents/$AGENT_ID/results (with filters)"
curl -s "$BASE_URL/api/agents/$AGENT_ID/results?status=completed&limit=5" | jq '.' || echo "Failed"
echo ""

# Test 3: Get single result (JSON)
echo "3. Testing GET /api/agents/$AGENT_ID/results/$RESULT_ID"
curl -s "$BASE_URL/api/agents/$AGENT_ID/results/$RESULT_ID" | jq '.' || echo "Failed"
echo ""

# Test 4: Get logs
echo "4. Testing GET /api/agents/$AGENT_ID/logs"
curl -s "$BASE_URL/api/agents/$AGENT_ID/logs?limit=10" | jq '.' || echo "Failed"
echo ""

# Test 5: Get traces
echo "5. Testing GET /api/agents/$AGENT_ID/traces"
curl -s "$BASE_URL/api/agents/$AGENT_ID/traces?limit=10" | jq '.' || echo "Failed"
echo ""

# Test 6: Get workspace files
echo "6. Testing GET /api/agents/$AGENT_ID/workspace"
curl -s "$BASE_URL/api/agents/$AGENT_ID/workspace" | jq '.' || echo "Failed"
echo ""

echo "================================"
echo "Tests completed!"

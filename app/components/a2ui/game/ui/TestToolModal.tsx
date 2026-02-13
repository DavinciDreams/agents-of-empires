'use client';

import React, { useState } from "react";
import { motion } from "framer-motion";
import type { TPMJSTool } from '@/app/lib/tpmjs-client';

// ============================================================================
// TestToolModal Component
// ============================================================================

interface TestToolModalProps {
  tool: TPMJSTool;
  onClose: () => void;
  onExecute: (params: Record<string, any>) => Promise<any>;
}

export function TestToolModal({ tool, onClose, onExecute }: TestToolModalProps) {
  const [params, setParams] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate form fields from inputSchema (JSON Schema format)
  const inputFields = tool.inputSchema?.properties
    ? Object.entries(tool.inputSchema.properties).map(([key, schema]: [string, any]) => ({
        name: key,
        type: schema.type || 'string',
        description: schema.description || `Enter ${key}`,
        required: tool.inputSchema.required?.includes(key) || false,
      }))
    : [];

  const handleParamChange = (fieldName: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const executionResult = await onExecute(params);
      setResult(executionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-gray-900/98 border-2 border-[var(--empire-gold)] rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl shadow-[var(--empire-gold)]/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--empire-gold)]/30 to-[var(--empire-gold)]/10 px-6 py-4 border-b border-[var(--empire-gold)]/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[var(--empire-gold)] font-bold text-xl" style={{ fontFamily: 'Cinzel, serif' }}>
                Test Tool
              </h3>
              <p className="text-sm text-gray-400" style={{ fontFamily: 'Lora, serif' }}>
                {tool.package}.{tool.toolName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700 w-8 h-8 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-12rem)]">
          {/* Tool Description */}
          <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-sm text-gray-300" style={{ fontFamily: 'Lora, serif' }}>
              {tool.description}
            </p>
          </div>

          {/* Input Form */}
          {inputFields.length > 0 ? (
            <div className="space-y-4 mb-6">
              <h4 className="text-white font-semibold text-sm mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                Input Parameters
              </h4>
              {inputFields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm text-gray-400 mb-2" style={{ fontFamily: 'Lora, serif' }}>
                    {field.name}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {field.description && (
                    <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                  )}
                  {field.type === 'string' && (
                    <input
                      type="text"
                      value={params[field.name] || ''}
                      onChange={(e) => handleParamChange(field.name, e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[var(--empire-gold)] focus:outline-none transition-colors"
                      placeholder={field.description || `Enter ${field.name}...`}
                    />
                  )}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={params[field.name] || ''}
                      onChange={(e) => handleParamChange(field.name, parseFloat(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[var(--empire-gold)] focus:outline-none transition-colors"
                      placeholder={field.description || `Enter ${field.name}...`}
                    />
                  )}
                  {field.type === 'boolean' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleParamChange(field.name, true)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          params[field.name] === true
                            ? 'bg-[var(--empire-gold)] text-gray-900'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        True
                      </button>
                      <button
                        onClick={() => handleParamChange(field.name, false)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          params[field.name] === false
                            ? 'bg-[var(--empire-gold)] text-gray-900'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        False
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6 text-center text-gray-500 text-sm py-4">
              This tool requires no input parameters
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full px-6 py-3 bg-[var(--empire-gold)] text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {isExecuting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⚙️</span>
                Running Test...
              </span>
            ) : (
              'Run Test'
            )}
          </button>

          {/* Results Display */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-green-900/20 border border-green-500 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-400 text-lg">✓</span>
                <h5 className="text-green-400 font-semibold text-sm" style={{ fontFamily: 'Cinzel, serif' }}>
                  Execution Successful
                </h5>
              </div>
              <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-900/50 p-3 rounded">
                {JSON.stringify(result, null, 2)}
              </pre>
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-900/20 border border-red-500 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-400 text-lg">✕</span>
                <h5 className="text-red-400 font-semibold text-sm" style={{ fontFamily: 'Cinzel, serif' }}>
                  Execution Failed
                </h5>
              </div>
              <p className="text-sm text-red-300">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
          {result && (
            <button
              onClick={() => {
                // TODO: Implement install after successful test
                onClose();
              }}
              className="px-4 py-2 bg-[var(--empire-gold)] text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Install Tool
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

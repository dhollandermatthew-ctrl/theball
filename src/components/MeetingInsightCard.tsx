// FILE: src/components/MeetingInsightCard.tsx

import React, { useState } from "react";
import { Copy } from "lucide-react";
import { MeetingRecord } from "@/domain/types";

interface MeetingInsightCardProps {
  record: MeetingRecord;
}

export const MeetingInsightCard: React.FC<MeetingInsightCardProps> = ({
  record,
}) => {
  if (!record.insight) return null;

  const { keyLearnings, followUps, openQuestions, summary } = record.insight;
  const [copied, setCopied] = useState(false);

  const copyTranscript = async () => {
    if (!record.transcript) return;
    await navigator.clipboard.writeText(record.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-3 rounded-2xl border bg-white shadow-sm">
      <div className="p-6 space-y-6">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          Meeting Insights
        </div>

        {/* ================= KEY LEARNINGS ================= */}
        {keyLearnings?.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-indigo-700 mb-3">
              Key Learnings
            </h3>

            <div className="space-y-3">
              {keyLearnings.map((rawItem, i) => {
                // Strip any leading numbering from model output
                const item = rawItem.replace(/^\s*\d+[\.\)]\s*/, "");

                return (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-5 text-sm font-semibold text-indigo-600 pt-[3px]">
                      {i + 1}.
                    </div>

                    <div className="text-[15px] text-slate-800 leading-relaxed">
                      {item}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================= FOLLOW-UPS + OPEN QUESTIONS ================= */}
        {(followUps?.length > 0 || openQuestions?.length > 0) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FOLLOW-UPS */}
            {followUps?.length > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <h4 className="text-sm font-semibold text-emerald-700 mb-2">
                  Follow-ups
                </h4>

                <ul className="space-y-2 text-sm text-slate-800">
                  {followUps.map((f, i) => (
                    <li
                      key={i}
                      className="pl-3 border-l-2 border-emerald-300 leading-snug"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* OPEN QUESTIONS */}
            {openQuestions?.length > 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                <h4 className="text-sm font-semibold text-amber-700 mb-2">
                  Open Questions
                </h4>

                <ul className="space-y-2 text-sm text-slate-800">
                  {openQuestions.map((q, i) => (
                    <li
                      key={i}
                      className="pl-3 border-l-2 border-amber-300 leading-snug"
                    >
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ================= SUMMARY (COLLAPSED) ================= */}
        {summary && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700">
              Summary
            </summary>

            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              {summary}
            </p>
          </details>
        )}

        {/* ================= TRANSCRIPT (COLLAPSED + COPY) ================= */}
        {record.transcript && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700">
              Transcript
            </summary>

            <div className="mt-3 relative rounded-lg border bg-slate-50 p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
              <button
                onClick={copyTranscript}
                className="absolute top-3 right-3 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                <Copy size={14} />
                {copied ? "Copied ✓" : "Copy"}
              </button>

              {record.transcript}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};
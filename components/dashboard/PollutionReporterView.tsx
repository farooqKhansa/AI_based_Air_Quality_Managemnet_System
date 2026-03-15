import React, { useState } from "react";
import {
  verifyPollutionIncident,
  generateComplaintLetter,
} from "../../services/api";
import type { PollutionAnalysisResult } from "../../types";

interface AnalysisItem {
  id: string;
  image: string;
  status: "pending" | "analyzing" | "done" | "error";
  result?: PollutionAnalysisResult;
  letter?: string;
}

export const PollutionReporterView: React.FC = () => {
  const [uploads, setUploads] = useState<AnalysisItem[]>([]);
  const [locationInput, setLocationInput] = useState("Rawalpindi, Pakistan");
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setError(null);
    const files: File[] = Array.from(e.target.files);

    // Limit total uploads to 5 to prevent overload
    if (uploads.length + files.length > 5) {
      setError("Maximum 5 images allowed at once.");
      return;
    }

    files.forEach((file) => {
      // Unsupported file format
      if (!file.type.startsWith("image/")) {
        setError("Unsupported file format skipped. Please use JPG/PNG.");
        return;
      }

      // Large file upload (>10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size too large skipped. Max 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const newUpload: AnalysisItem = {
          id: Date.now() + Math.random().toString(),
          image: reader.result as string,
          status: "pending",
        };
        setUploads((prev) => [...prev, newUpload]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyzeAll = async () => {
    const pendingItems = uploads.filter((u) => u.status === "pending");
    if (pendingItems.length === 0) return;

    // Mark all pending as analyzing
    setUploads((prev) =>
      prev.map((u) =>
        u.status === "pending" ? { ...u, status: "analyzing" } : u
      )
    );

    // Process sequentially
    for (const item of pendingItems) {
      try {
        const analysis: PollutionAnalysisResult = await verifyPollutionIncident(
          item.image
        );

        let letter: string | undefined;
        if (analysis.isViolation) {
          letter = await generateComplaintLetter(analysis, locationInput);
        }

        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? {
                  ...u,
                  status: "done",
                  result: analysis,
                  letter,
                }
              : u
          )
        );
      } catch (e) {
        console.error("Eco-Enforce analysis error:", e);
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id ? { ...u, status: "error" } : u
          )
        );
      }
    }
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const doneWithResult = uploads.filter(
    (u) => u.status === "done" && u.result
  );

  return (
    <div className="h-full flex flex-col animate-fade-in pb-10">
      <h1 className="text-3xl font-bold font-heading text-slate-900 mb-2">
        Eco-Enforce{" "}
        <span className="text-emerald-500 text-lg align-middle bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 ml-2">
          Beta
        </span>
      </h1>
      <p className="text-slate-500 mb-8 max-w-2xl">
        AI-powered legal action center. Upload evidence (smoke, burning,
        industrial waste) to generate verified legal complaints.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Upload Queue */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Incident Location
            </label>
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-100 transition-colors cursor-pointer relative">
            <input
              type="file"
              multiple
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center">
              <svg
                className="w-10 h-10 text-slate-400 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-slate-700 font-bold text-sm">
                Add Evidence Photos
              </span>
              <span className="text-slate-400 text-xs mt-1">
                Supports Multiple Files
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* Pending Thumbnails Grid */}
          <div className="grid grid-cols-2 gap-2">
            {uploads.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
              >
                <img
                  src={item.image}
                  alt="Thumb"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeUpload(item.id)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                {item.status === "done" && (
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500" />
                )}
                {item.status === "analyzing" && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {uploads.length > 0 && (
            <button
              onClick={handleAnalyzeAll}
              disabled={uploads.some((u) => u.status === "analyzing")}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-900/20"
            >
              {uploads.some((u) => u.status === "analyzing")
                ? "Processing Evidence..."
                : `Analyze ${uploads.length} Images`}
            </button>
          )}
        </div>

        {/* Right: Results Stream */}
        <div className="lg:col-span-8 space-y-6">
          {doneWithResult.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-10 text-slate-400 min-h-[300px]">
              <p>Analysis results will appear here.</p>
            </div>
          )}

          {doneWithResult.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row animate-fade-in"
            >
              <div className="md:w-1/3 relative h-48 md:h-auto">
                <img
                  src={item.image}
                  alt="Evidence"
                  className="w-full h-full object-cover"
                />
                <div
                  className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                    item.result?.isViolation
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {item.result?.isViolation
                    ? "Violation Confirmed"
                    : "No Violation"}
                </div>
              </div>

              <div className="p-6 md:w-2/3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-900">
                      {item.result?.violationType}
                    </h3>
                    {item.result?.isViolation && (
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Confidence: {item.result?.confidence}%
                      </span>
                    )}
                  </div>

                  <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                    {item.result?.description}
                  </p>

                  {item.result?.isViolation && (
                    <div className="flex gap-4 mb-4">
                      <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Severity
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            item.result.severity === "Critical"
                              ? "text-red-600"
                              : "text-slate-800"
                          }`}
                        >
                          {item.result.severity}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {item.result?.isViolation && item.letter && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <details className="group">
                      <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-slate-700 hover:text-primary">
                        <span>View Complaint Letter Draft</span>
                        <span className="transition group-open:rotate-180">
                          <svg
                            fill="none"
                            height="24"
                            shapeRendering="geometricPrecision"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                            width="24"
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </span>
                      </summary>
                      <div className="text-slate-600 mt-3 group-open:animate-fadeIn font-mono text-xs p-4 bg-slate-50 rounded-lg whitespace-pre-wrap border border-slate-200">
                        {item.letter}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

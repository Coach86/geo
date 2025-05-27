"use client";

import type { AttributeAlignmentSummaryItem } from "@/types/compliance"; // Adjust path if needed

interface AttributeAlignmentTableProps {
  alignmentData?: AttributeAlignmentSummaryItem[]; // Changed from attributes: Attribute[]
}

// Helper function from original AccordSection (can be moved to utils if shared)
const getAlignmentClass = (alignment: string) => {
  switch (alignment) {
    case "✅":
    case "High":
      return "text-[#0D47A1] font-medium";
    case "⚠️":
    case "Medium":
      return "text-[#4527A0] font-medium";
    case "❌":
    case "Low":
      return "text-[#AD1457] font-medium";
    default:
      return "text-gray-600";
  }
};

export default function AttributeAlignmentTable({
  alignmentData,
}: AttributeAlignmentTableProps) {
  if (!alignmentData || alignmentData.length === 0) {
    return (
      <p className="p-4 text-sm text-gray-600">
        No attribute alignment data available.
      </p>
    );
  }

  // Data is already sorted or its order is determined by the API response in ComplianceResults.summary.attributeAlignmentSummary
  // If sorting is still desired based on mentionRate, it can be done here:
  const sortedAttributes = [...alignmentData].sort((a, b) => {
    const aValue = Number.parseInt(a.mentionRate.replace("%", ""));
    const bValue = Number.parseInt(b.mentionRate.replace("%", ""));
    return bValue - aValue;
  });

  return (
    <div className="overflow-x-auto pt-2">
      {/* Removed h4 title as it's part of the accordion trigger or main page structure now */}
      <table className="w-full min-w-[500px] border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200">
              Attribute
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200">
              Mention Rate
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200">
              Alignment
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedAttributes.map((attribute, index) => (
            <tr
              key={index}
              className="hover:bg-gray-50 transition-colors duration-150"
            >
              <td className="px-4 py-3 border-b border-gray-200 text-sm text-gray-700">
                {attribute.name}
              </td>
              <td className="px-4 py-3 border-b border-gray-200 text-sm text-gray-700">
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: attribute.mentionRate, // mentionRate should be a string like "90%"
                        backgroundColor:
                          Number.parseInt(
                            attribute.mentionRate.replace("%", "")
                          ) >= 75
                            ? "#2196F3" // Blue for high
                            : Number.parseInt(
                                attribute.mentionRate.replace("%", "")
                              ) >= 50
                            ? "#673AB7" // Purple for medium
                            : "#C2185B", // Pink for low
                      }}
                    ></div>
                  </div>
                  <span>{attribute.mentionRate}</span>
                </div>
              </td>
              <td
                className={`px-4 py-3 border-b border-gray-200 text-sm ${getAlignmentClass(
                  attribute.alignment
                )}`}
              >
                {attribute.alignment}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

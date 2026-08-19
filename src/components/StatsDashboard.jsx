import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const ageData = [
  { age: "≤20", stress: 30.1, depression: 35.3, suicide: 24.4 },
  { age: "20-29", stress: 29.8, depression: 34.0, suicide: 19.2 },
  { age: "30-39", stress: 9.8, depression: 11.9, suicide: 5.5 },
  { age: "40-49", stress: 2.5, depression: 3.5, suicide: 1.2 },
  { age: "50-59", stress: 1.0, depression: 1.8, suicide: 0.5 },
  { age: "60+", stress: 0.6, depression: 1.0, suicide: 0.3 }
];

const yearData = [
  { category: "เครียดสูง", "2020": 3.2, "2021": 30.1, "2022": 13.8 },
  { category: "เสี่ยงซึมเศร้า", "2020": 3.4, "2021": 35.3, "2022": 17.5 },
  { category: "เสี่ยงฆ่าตัวตาย", "2020": 2.7, "2021": 24.4, "2022": 11.9 }
];

const tooltipStyle = { borderRadius: 12, border: "1px solid #1e293b", background: "#0f172a", fontSize: 12, color: "#e2e8f0" };

export default function StatsDashboard() {
  return (
    <div className="space-y-6">
      {/* Chart 1: by age */}
      <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-100 mb-1">ความเสี่ยงทางสุขภาพจิต จำแนกตามช่วงอายุ</h3>
        <p className="text-xs text-slate-500 mb-4">ที่มา: กรมสุขภาพจิต (2021)</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={ageData} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Bar dataKey="stress" name="เครียดสูง" fill="#f0a8b0" radius={[4, 4, 0, 0]} />
            <Bar dataKey="depression" name="เสี่ยงซึมเศร้า" fill="#54c7b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="suicide" name="เสี่ยงฆ่าตัวตาย" fill="#608ad9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: by year */}
      <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-100 mb-1">แนวโน้มความเสี่ยงในเยาวชน ปี 2020-2022</h3>
        <p className="text-xs text-slate-500 mb-4">ที่มา: กรมสุขภาพจิต</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={yearData} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Bar dataKey="2020" fill="#f7ab54" radius={[4, 4, 0, 0]} />
            <Bar dataKey="2021" fill="#55c3b4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="2022" fill="#6c91d9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

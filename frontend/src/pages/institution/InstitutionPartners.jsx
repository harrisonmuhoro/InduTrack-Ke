import React, { useEffect, useState } from 'react';
import api from '../../axios';

const DONUT_COLORS = ['#0A6E4F', '#F59E0B', '#12A37A', '#E2E8F0'];

export default function InstitutionPartners() {
    const [industrySegments, setIndustrySegments] = useState([]);
    const [totalHosts, setTotalHosts] = useState(0);

    useEffect(() => {
        api.get('/admin/companies')
            .then((res) => {
                const companies = res.data.data || [];
                setTotalHosts(res.data.total ?? companies.length);
                const counts = {};
                companies.forEach((c) => {
                    const key = c.industry || 'Other';
                    counts[key] = (counts[key] || 0) + 1;
                });
                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                const top = sorted.slice(0, 3);
                const otherCount = sorted.slice(3).reduce((sum, [, n]) => sum + n, 0);
                const totalN = companies.length || 1;
                const segments = top.map(([label, n], i) => ({
                    label,
                    pct: Math.round((n / totalN) * 100),
                    color: DONUT_COLORS[i],
                }));
                if (otherCount > 0 || segments.length === 0) {
                    segments.push({
                        label: 'Other',
                        pct: Math.max(0, 100 - segments.reduce((s, x) => s + x.pct, 0)),
                        color: DONUT_COLORS[3],
                    });
                }
                setIndustrySegments(segments);
            })
            .catch(() => {});
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-xl border border-border shadow-sm max-w-lg">
                <h3 className="text-headline-sm font-headline-sm mb-6">Industry Distribution</h3>
                <div className="relative w-48 h-48 mx-auto mb-8">
                    <div
                        className="w-full h-full rounded-full"
                        style={{
                            background:
                                industrySegments.length > 0
                                    ? `conic-gradient(${(() => {
                                          let acc = 0;
                                          return industrySegments
                                              .map((s) => {
                                                  const start = acc;
                                                  acc += s.pct;
                                                  return `${s.color} ${start}% ${Math.min(acc, 100)}%`;
                                              })
                                              .join(', ');
                                      })()})`
                                    : '#E2E8F0',
                        }}
                    ></div>
                    <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                        <p className="text-headline-sm font-bold">{totalHosts.toLocaleString()}</p>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Total Hosts</p>
                    </div>
                </div>
                <div className="space-y-3">
                    {industrySegments.length === 0 && (
                        <p className="text-body-sm text-on-surface-variant text-center">No company data available.</p>
                    )}
                    {industrySegments.map((seg) => (
                        <div className="flex items-center justify-between text-body-sm" key={seg.label}>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }}></span>
                                <span>{seg.label}</span>
                            </div>
                            <span className="font-bold">{seg.pct}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

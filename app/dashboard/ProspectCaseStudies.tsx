"use client";

interface Props {
  onSchedule: () => void;
}

const cases = [
  {
    initials: "RK",
    profile: "44-year-old business owner · Arizona",
    situation: "Came to VCG with $800K in a 401(k), no permanent insurance, and a $2.1M gap in coverage. His CPA had never addressed the tax exposure on his retirement accounts.",
    challenge: "Entirely dependent on taxable accounts. No estate plan. High lawsuit exposure as a business owner.",
    outcome: "$2M death benefit in place. Cash value growing tax-deferred. Reduced taxable income by restructuring how business profits flow. Policy funded inside a trust.",
    tag: "Business Owner",
    color: "border-blue-400",
  },
  {
    initials: "MT",
    profile: "38-year-old couple, 2 kids · Colorado",
    situation: "Both W-2 earners, combined $310K income. Had term insurance through their employers — would expire in 8 years. No plan for what happens to the kids' college or the mortgage.",
    challenge: "Temporary coverage on permanent need. No cash accumulation. No legacy structure.",
    outcome: "Permanent coverage in place for both. Dividend policy building toward college funding. Trust established to avoid probate. Cash value accessible for emergencies.",
    tag: "Young Family",
    color: "border-green-400",
  },
  {
    initials: "PH",
    profile: "57-year-old pre-retiree · California",
    situation: "Successful executive with $1.6M in traditional IRAs and 401(k)s. Deeply concerned about RMDs starting at 73 forcing him into a higher bracket after retirement.",
    challenge: "Entire retirement savings is a 'tax time bomb.' Projected to lose $400K+ to taxes over 20 years of RMDs.",
    outcome: "VCG designed a partial Roth conversion strategy paired with a permanent policy. Reduces RMD exposure, creates tax-free income stream in retirement, and transfers wealth to heirs with no income tax.",
    tag: "Pre-Retirement",
    color: "border-purple-400",
  },
  {
    initials: "JS",
    profile: "34-year-old physician · Texas",
    situation: "High income, high lawsuit risk, zero asset protection. All savings in brokerage accounts subject to creditor claims. No disability plan beyond group coverage ending if she left her practice.",
    challenge: "High malpractice exposure. Fully liquid assets with no protection layer. Disability plan tied to current employer.",
    outcome: "Own-occupation disability policy in place. Cash value structured inside an irrevocable trust — protected from creditors in Texas. Policy designed to fund a practice buyout if needed.",
    tag: "High Income Professional",
    color: "border-amber-400",
  },
];

export default function ProspectCaseStudies({ onSchedule }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-[#0A1628]">Client Stories</h2>
        <p className="text-slate-400 text-sm mt-1">Real outcomes for real people — names and details changed to protect privacy.</p>
      </div>

      <div className="space-y-5">
        {cases.map((c, i) => (
          <div key={i} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${c.color}`}>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A84C] text-sm font-semibold">{c.initials}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-0.5">
                    <p className="text-[#0A1628] font-semibold text-sm">{c.profile}</p>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gray-100 text-slate-500 font-medium">{c.tag}</span>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">{c.situation}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-red-600 text-[10px] uppercase tracking-widest font-semibold mb-2">The Problem</p>
                  <p className="text-slate-600 text-xs leading-relaxed">{c.challenge}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-green-600 text-[10px] uppercase tracking-widest font-semibold mb-2">The Outcome</p>
                  <p className="text-slate-600 text-xs leading-relaxed">{c.outcome}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#0A1628] rounded-2xl p-8 text-center">
        <p className="text-[#C9A84C] text-[10px] uppercase tracking-widest mb-2">See Which Story Fits You</p>
        <p className="text-white text-lg font-light mb-2">Your situation is unique — your plan should be too</p>
        <p className="text-slate-400 text-sm mb-6">In one call your advisor will identify which gaps are most urgent for your specific income, family, and goals.</p>
        <button onClick={onSchedule}
          className="bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] font-semibold text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl transition-colors">
          Get My Personalized Assessment
        </button>
      </div>
    </div>
  );
}

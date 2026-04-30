"use client";

interface Policy {
  product_type: string;
  owner_type: string;
  owner_name: string;
  death_benefit: number;
  cash_value: number;
  net_cash_value: number;
  dividend_value: number;
  status: string;
  carrier: string;
  policy_number: string;
}

interface Props {
  policies: Policy[];
  clientName: string;
}

const fmt = (n: number) =>
  !n || n === 0 ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const taxBenefits = [
  {
    icon: "◈",
    title: "Tax-Deferred Cash Value Growth",
    description:
      "Your cash value grows every year without generating a taxable event. Unlike a brokerage account, you receive no 1099 — the IRS does not tax internal policy growth.",
    tag: "IRC § 7702",
    color: "border-[#C9A84C]",
    tagColor: "bg-[#C9A84C]/10 text-[#C9A84C]",
  },
  {
    icon: "⟁",
    title: "Income Tax-Free Policy Loans",
    description:
      "When you access your cash value via a policy loan, you receive funds income-tax-free. Loans are not considered income and do not appear on your tax return.",
    tag: "IRC § 72(e)",
    color: "border-blue-400",
    tagColor: "bg-blue-50 text-blue-700",
  },
  {
    icon: "◆",
    title: "Income Tax-Free Death Benefit",
    description:
      "Your beneficiaries receive the death benefit completely free of federal income tax. This is one of the most efficient wealth transfer vehicles available.",
    tag: "IRC § 101(a)",
    color: "border-green-400",
    tagColor: "bg-green-50 text-green-700",
  },
  {
    icon: "▦",
    title: "Estate Tax Planning via Trust Ownership",
    description:
      "Policies owned by an irrevocable trust are removed from your taxable estate. This shields the death benefit from estate taxes and ensures proceeds pass directly to heirs.",
    tag: "ILIT Strategy",
    color: "border-purple-400",
    tagColor: "bg-purple-50 text-purple-700",
  },
  {
    icon: "⊟",
    title: "Dividend Income Not Currently Taxable",
    description:
      "Dividends paid by Penn Mutual are considered a return of premium — not income — up to your cost basis. They accumulate tax-free when used to purchase paid-up additions.",
    tag: "IRS Rev. Rul. 2009-13",
    color: "border-amber-400",
    tagColor: "bg-amber-50 text-amber-700",
  },
  {
    icon: "◇",
    title: "No Contribution Limits",
    description:
      "Unlike IRAs or 401(k)s, permanent life insurance has no annual contribution cap (subject to MEC rules). High earners can move significant capital into a tax-advantaged structure.",
    tag: "Non-Qualified",
    color: "border-slate-400",
    tagColor: "bg-slate-100 text-slate-600",
  },
];

export default function TaxStrategySection({ policies, clientName }: Props) {
  const activePolicies = policies.filter((p) => p.status === "Active");
  const totalDB = activePolicies.reduce((s, p) => s + (p.death_benefit ?? 0), 0);
  const totalCV = activePolicies.reduce((s, p) => s + (p.cash_value ?? 0), 0);
  const trustPolicies = activePolicies.filter((p) => p.owner_type === "Trust" || p.owner_type === "LLC");
  const hasTrustOwnership = trustPolicies.length > 0;

  const firstName = clientName.split(" ")[0];

  return (
    <div className="space-y-8">

      {/* Personalized Summary Banner */}
      <div className="bg-[#0A1628] rounded-2xl p-6">
        <p className="text-[#C9A84C] text-[10px] uppercase tracking-widest mb-3">Your Tax Position</p>
        <h2 className="text-white text-xl font-light mb-4">
          {firstName}, your portfolio is structured for maximum tax efficiency.
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Tax-Free Death Benefit</p>
            <p className="text-[#C9A84C] text-lg font-semibold">{fmt(totalDB)}</p>
            <p className="text-slate-500 text-[10px] mt-1">Passes to heirs income-tax-free</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Tax-Deferred Cash Value</p>
            <p className="text-[#C9A84C] text-lg font-semibold">{fmt(totalCV)}</p>
            <p className="text-slate-500 text-[10px] mt-1">No 1099 · No annual tax event</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Trust / LLC Ownership</p>
            <p className="text-[#C9A84C] text-lg font-semibold">{hasTrustOwnership ? `${trustPolicies.length} ${trustPolicies.length === 1 ? "Policy" : "Policies"}` : "None"}</p>
            <p className="text-slate-500 text-[10px] mt-1">{hasTrustOwnership ? "Estate tax shielded" : "Consider trust ownership"}</p>
          </div>
        </div>
      </div>

      {/* Taxable vs Tax-Advantaged Comparison */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-[#0A1628] font-medium text-sm mb-1">Taxable vs. Tax-Advantaged Growth</h3>
        <p className="text-slate-400 text-xs mb-6">How your cash value compares to a taxable account at the same growth rate</p>

        <div className="grid grid-cols-2 gap-4">
          {/* Taxable Account */}
          <div className="border border-red-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <p className="text-slate-600 text-sm font-medium">Taxable Brokerage Account</p>
            </div>
            <ul className="space-y-2.5">
              {[
                "Annual gains taxed at capital gains rate (15–20%)",
                "Dividends taxed as ordinary income",
                "Included in taxable estate",
                "Heirs pay income tax on IRD",
                "1099 issued every year",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* VCG Policy */}
          <div className="border border-green-100 bg-green-50/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <p className="text-slate-600 text-sm font-medium">Your VCG Life Insurance Portfolio</p>
            </div>
            <ul className="space-y-2.5">
              {[
                "Cash value grows with zero annual tax event",
                "Dividends accumulate tax-free as PUAs",
                "Trust-owned policies excluded from estate",
                "Heirs receive death benefit income-tax-free",
                "No 1099 · No K-1 · No schedule D",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Tax Benefit Cards */}
      <div>
        <h3 className="text-[#0A1628] font-medium text-sm mb-4">Tax Advantages in Your Portfolio</h3>
        <div className="grid grid-cols-2 gap-4">
          {taxBenefits.map((b) => (
            <div key={b.title} className={`bg-white rounded-2xl shadow-sm p-5 border-l-4 ${b.color}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#C9A84C]">{b.icon}</span>
                  <h4 className="text-[#0A1628] text-sm font-medium">{b.title}</h4>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 ${b.tagColor}`}>
                  {b.tag}
                </span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
        <span className="text-amber-500 text-lg">⚠</span>
        <p className="text-amber-700 text-xs">
          This overview is for educational purposes only and does not constitute tax advice. Consult your CPA or tax attorney regarding your specific situation. IRC references are provided for informational purposes.
        </p>
      </div>
    </div>
  );
}

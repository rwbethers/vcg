"use client";

interface CollateralAccount {
  id: string;
  lender: string;
  loan_amount: number;
  loan_balance: number;
  interest_rate: number;
  collateral_value: number;
  required_ratio: number;
  status: string;
  notes: string | null;
  policy_id: string | null;
}

interface Policy {
  id: string;
  policy_number: string;
  carrier: string;
  product_name: string;
}

interface Props {
  accounts: CollateralAccount[];
  policies: Policy[];
}

const fmt = (n: number) =>
  !n || n === 0 ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtPct = (n: number) => (n * 100).toFixed(0) + "%";

function surplus(acct: CollateralAccount) {
  return acct.collateral_value - acct.loan_balance * acct.required_ratio;
}

export default function CollateralAccountSection({ accounts, policies }: Props) {
  const active = accounts.filter((a) => a.status === "active");

  const totalLoan       = active.reduce((s, a) => s + a.loan_balance, 0);
  const totalCollateral = active.reduce((s, a) => s + a.collateral_value, 0);
  const totalSurplus    = active.reduce((s, a) => s + surplus(a), 0);
  const isDeficit       = totalSurplus < 0;

  const policyMap = Object.fromEntries(policies.map((p) => [p.id, p]));

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-light text-[#0A1628]">Collateral Account</h1>
          <p className="text-slate-400 text-sm mt-1">Track premium financing loans and pledged collateral</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
          <p className="text-3xl mb-3">🏦</p>
          <p className="text-slate-500 text-sm font-medium">No collateral accounts on file</p>
          <p className="text-slate-400 text-xs mt-1">Contact your advisor if you have a premium financing arrangement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light text-[#0A1628]">Collateral Account</h1>
        <p className="text-slate-400 text-sm mt-1">
          Premium financing loan balances and pledged policy cash values
        </p>
      </div>

      {/* Summary banner */}
      <div className={`rounded-2xl p-6 flex items-center justify-between ${isDeficit ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"}`}>
        <div>
          <p className={`text-[10px] uppercase tracking-widest font-semibold mb-1 ${isDeficit ? "text-red-500" : "text-green-600"}`}>
            {isDeficit ? "Collateral Deficit" : "Collateral Surplus"}
          </p>
          <p className={`text-3xl font-light ${isDeficit ? "text-red-700" : "text-green-700"}`}>
            {isDeficit ? "−" : "+"}{fmt(Math.abs(totalSurplus))}
          </p>
          <p className={`text-xs mt-1.5 ${isDeficit ? "text-red-500" : "text-green-600"}`}>
            {isDeficit
              ? "Additional collateral may be required. Contact your advisor."
              : "Your pledged collateral exceeds the loan requirement."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-right">
          <div>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">Total Loan Balance</p>
            <p className="text-[#0A1628] text-lg font-light mt-0.5">{fmt(totalLoan)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">Collateral Value</p>
            <p className="text-[#0A1628] text-lg font-light mt-0.5">{fmt(totalCollateral)}</p>
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div className="space-y-4">
        {accounts.map((acct) => {
          const net     = surplus(acct);
          const deficit = net < 0;
          const policy  = acct.policy_id ? policyMap[acct.policy_id] : null;

          return (
            <div key={acct.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Account header */}
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0A1628] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#C9A84C] text-xs font-bold">
                      {acct.lender.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[#0A1628] font-semibold text-sm">{acct.lender}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {acct.interest_rate > 0 ? `${(acct.interest_rate * 100).toFixed(2)}% annual interest` : "Premium financing loan"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                    deficit ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                  }`}>
                    {deficit ? `Deficit ${fmt(Math.abs(net))}` : `Surplus ${fmt(net)}`}
                  </span>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                    acct.status === "active" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                  }`}>
                    {acct.status.charAt(0).toUpperCase() + acct.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="p-6 grid grid-cols-3 gap-6">
                {/* Loan */}
                <div className="space-y-4">
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest">Loan</p>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Original Loan</p>
                    <p className="text-[#0A1628] text-sm font-medium">{fmt(acct.loan_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Current Balance</p>
                    <p className="text-[#C9A84C] text-lg font-semibold">{fmt(acct.loan_balance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Interest Rate</p>
                    <p className="text-[#0A1628] text-sm">
                      {acct.interest_rate > 0 ? `${(acct.interest_rate * 100).toFixed(2)}%` : "—"}
                    </p>
                  </div>
                </div>

                {/* Collateral */}
                <div className="space-y-4">
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest">Collateral</p>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Pledged Value</p>
                    <p className="text-green-600 text-lg font-semibold">{fmt(acct.collateral_value)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Required Ratio</p>
                    <p className="text-[#0A1628] text-sm">{fmtPct(acct.required_ratio)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Required Amount</p>
                    <p className="text-[#0A1628] text-sm">{fmt(acct.loan_balance * acct.required_ratio)}</p>
                  </div>
                </div>

                {/* Position */}
                <div className="space-y-4">
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest">Position</p>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Net Position</p>
                    <p className={`text-lg font-semibold ${deficit ? "text-red-600" : "text-green-600"}`}>
                      {deficit ? "−" : "+"}{fmt(Math.abs(net))}
                    </p>
                  </div>
                  {policy && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Pledged Policy</p>
                      <p className="text-[#0A1628] text-sm font-medium">{policy.carrier}</p>
                      <p className="text-slate-400 text-[10px]">#{policy.policy_number}</p>
                    </div>
                  )}
                  {acct.notes && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Notes</p>
                      <p className="text-slate-600 text-xs leading-relaxed">{acct.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Collateral bar */}
              <div className="px-6 pb-5">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                  <span>Collateral coverage</span>
                  <span>{acct.loan_balance > 0 ? ((acct.collateral_value / acct.loan_balance) * 100).toFixed(0) : 0}% of loan balance</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${deficit ? "bg-red-400" : "bg-green-400"}`}
                    style={{ width: `${Math.min(100, acct.loan_balance > 0 ? (acct.collateral_value / acct.loan_balance) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
        <span className="text-amber-500 text-lg">⚠</span>
        <p className="text-amber-700 text-xs">
          Collateral values are updated by your advisor based on current carrier statements. Contact your Vision Consulting Group team if you have questions about your collateral position.
        </p>
      </div>
    </div>
  );
}

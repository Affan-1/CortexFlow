import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Sparkles } from "lucide-react";

const plans = [
  { name: "Pro", price: "$19", description: "For growing automation projects.", features: ["5,000 executions / month", "Unlimited workflows", "Priority support"] },
  { name: "Business", price: "$49", description: "For teams running automation at scale.", features: ["25,000 executions / month", "Team workspaces", "Advanced execution history"] },
];

const UpgradePlan = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#030303] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => navigate("/settings?tab=billing")} className="mb-10 flex items-center gap-2 text-[11px] text-zinc-500 hover:text-white"><ArrowLeft size={14} />Back to Billing</button>
        <div className="mb-10 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#168FFF]/30 bg-[#168FFF]/10"><Sparkles className="text-[#168FFF]" size={20} /></div><h1 className="text-3xl font-medium">Upgrade your plan</h1><p className="mt-2 text-sm text-zinc-600">Choose the plan that fits your automation needs.</p></div>
        <div className="grid gap-5 md:grid-cols-2">{plans.map(plan => <div key={plan.name} className="rounded-2xl border border-white/[0.08] bg-[#080A0E] p-7"><h2 className="text-lg font-medium">{plan.name}</h2><p className="mt-2 text-xs text-zinc-600">{plan.description}</p><p className="mt-7 text-3xl font-semibold">{plan.price}<span className="text-xs text-zinc-600">/month</span></p><ul className="my-7 space-y-3">{plan.features.map(f => <li key={f} className="flex items-center gap-2 text-xs text-zinc-400"><Check size={14} className="text-[#168FFF]" />{f}</li>)}</ul><button onClick={() => alert(`${plan.name} plan checkout will be connected here.`)} className="w-full rounded-lg bg-[#168FFF] py-3 text-xs font-semibold text-black hover:bg-[#38A8FF]">Choose {plan.name}</button></div>)}</div>
      </div>
    </div>
  );
};
export default UpgradePlan;

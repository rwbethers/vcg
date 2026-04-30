"use client";
import { useState } from "react";

interface Props {
  advisorName: string;
  clientName: string;
}

const advisorDetails: Record<string, { title: string; email: string; phone: string; calendly: string; bio: string; photo: string; }> = {
  "Stephen Mongie": {
    title: "Principal",
    email: "team@vcgllc.com",
    phone: "(435) 899-0172",
    calendly: "https://vcgllc.com",
    photo: "https://img1.wsimg.com/isteam/ip/4642cbbf-939a-4b1c-9de2-2924242c8d1d/Stephen%20Mongie%20-%20photo.jpg",
    bio: "Stephen specializes in permanent life insurance, premium finance strategies, and multigenerational wealth transfer. He has helped hundreds of clients build tax-advantaged portfolios through Penn Mutual and other leading carriers.",
  },
  "Samuel Noel": {
    title: "Principal",
    email: "team@vcgllc.com",
    phone: "(435) 899-0172",
    calendly: "https://vcgllc.com",
    photo: "https://img1.wsimg.com/isteam/ip/4642cbbf-939a-4b1c-9de2-2924242c8d1d/Sam%20Noel%20photo%20-%20Final%20VCG%20-0002.jpg",
    bio: "Sam focuses on indexed universal life and annuity strategies, helping clients build protected growth portfolios with downside guarantees.",
  },
  "Zach McGlothin": {
    title: "Chief Operating Officer",
    email: "team@vcgllc.com",
    phone: "(435) 899-0172",
    calendly: "https://vcgllc.com",
    photo: "https://img1.wsimg.com/isteam/ip/4642cbbf-939a-4b1c-9de2-2924242c8d1d/Studio-Project.jpeg",
    bio: "Zach works with clients on term conversions, annuity planning, and foundational life insurance strategies for growing families and businesses.",
  },
};

const faqs = [
  {
    q: "How often should I review my policy?",
    a: "We recommend an annual review to assess cash value growth, dividend performance, and whether your coverage still aligns with your goals.",
  },
  {
    q: "Can I increase my death benefit?",
    a: "Yes, depending on your policy type and health status. Your advisor can request a policy change illustration from the carrier.",
  },
  {
    q: "How do I request an inforce illustration?",
    a: "Contact your advisor and they will request an updated illustration directly from the carrier. This shows projected values at current dividend scales.",
  },
  {
    q: "What happens if I can't pay my premium?",
    a: "Most whole life policies have options including using dividends or cash value to cover premiums. Contact your advisor before missing a payment.",
  },
];

export default function ContactAdvisorSection({ advisorName, clientName }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sent, setSent] = useState(false);

  const advisor = advisorDetails[advisorName] ?? advisorDetails["Stephen Mongie"];
  const firstName = clientName.split(" ")[0];
  const initials = advisorName.split(" ").map((w) => w[0]).join("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = `mailto:${advisor.email}?subject=${encodeURIComponent(subject || "Message from " + clientName)}&body=${encodeURIComponent(message)}`;
    window.open(mailto);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="space-y-8">

      {/* Advisor Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-[#0A1628]">
            {advisor.photo ? (
              <img src={advisor.photo} alt={advisorName} className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[#C9A84C] text-2xl font-semibold">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-[#0A1628] text-xl font-medium">{advisorName}</h2>
            <p className="text-[#C9A84C] text-sm mt-0.5">{advisor.title}</p>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">{advisor.bio}</p>
          </div>
        </div>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-3 gap-4">
        <a
          href={`mailto:${advisor.email}?subject=Question from ${clientName}`}
          className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center gap-3 hover:border-[#C9A84C] border border-transparent transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center group-hover:bg-[#C9A84C]/20 transition-colors">
            <svg className="w-5 h-5 text-[#C9A84C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[#0A1628] text-sm font-medium">Send Email</p>
            <p className="text-slate-400 text-xs mt-0.5">{advisor.email}</p>
          </div>
        </a>

        <a
          href={`tel:${advisor.phone.replace(/\D/g, "")}`}
          className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center gap-3 hover:border-[#C9A84C] border border-transparent transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center group-hover:bg-[#C9A84C]/20 transition-colors">
            <svg className="w-5 h-5 text-[#C9A84C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[#0A1628] text-sm font-medium">Call Direct</p>
            <p className="text-slate-400 text-xs mt-0.5">{advisor.phone}</p>
          </div>
        </a>

        <a
          href={advisor.calendly}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#0A1628] rounded-2xl shadow-sm p-5 flex flex-col items-center gap-3 hover:bg-[#0d1e3a] transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#C9A84C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white text-sm font-medium">Schedule a Call</p>
            <p className="text-slate-400 text-xs mt-0.5">Pick a time that works</p>
          </div>
        </a>
      </div>

      {/* Message Form */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-[#0A1628] font-medium text-sm mb-1">Send a Message</h3>
        <p className="text-slate-400 text-xs mb-5">Your message will open in your email app, pre-addressed to {advisorName}.</p>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-widest mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`Question about my policy — ${firstName}`}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-300"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-widest mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi Stephen, I have a question about..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-300 resize-none"
            />
          </div>
          <button
            type="submit"
            className="bg-[#C9A84C] hover:bg-[#E8C96C] text-[#0A1628] text-xs font-semibold px-6 py-3 rounded-lg tracking-widest uppercase transition-colors"
          >
            {sent ? "Opening Email App…" : "Send Message"}
          </button>
        </form>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-[#0A1628] font-medium text-sm mb-4">Frequently Asked Questions</h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAFBFC] transition-colors"
              >
                <span className="text-[#0A1628] text-sm font-medium">{faq.q}</span>
                <span className={`text-[#C9A84C] text-lg transition-transform flex-shrink-0 ml-4 ${openFaq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

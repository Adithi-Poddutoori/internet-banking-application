import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TICKER_ITEMS = [
  '🔔 New: Digital Savings Account — earn 7.25% interest p.a. Open now!',
  '💳 Offer: ₹500 cashback on your first Nova Credit Card transaction.',
  '🏠 Home Loan from 8.50% p.a. — Check eligibility & apply instantly.',
  '🔒 Book a safe deposit locker completely online.',
];

const NAV_LINKS = [
  { label: 'Personal', sub: ['Savings Account', 'Fixed Deposits', 'Recurring Deposit', 'NRI Banking', 'Senior Citizen Account'] },
  { label: 'Loans', sub: ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Business Loan', 'Gold Loan'] },
  { label: 'Cards', sub: ['Credit Cards', 'Debit Cards', 'Travel Cards'] },
  { label: 'Invest', sub: ['Mutual Funds', 'Fixed Deposits', 'PPF & NPS', 'Insurance'] },
  { label: 'Help', sub: ['FAQs', 'Locate Branch', '24×7 Support'] },
];

const QUICK_SERVICES = [
  { icon: '💸', label: 'Fund Transfer' },
  { icon: '⚡', label: 'Bill Payments' },
  { icon: '📄', label: 'Account Statement' },
  { icon: '💳', label: 'Credit Cards' },
  { icon: '🏠', label: 'Home Loan' },
  { icon: '📊', label: 'Investments' },
  { icon: '🛡️', label: 'Insurance' },
  { icon: '📈', label: 'Fixed Deposit' },
];

const OFFERS = [
  { icon: '', title: 'Travel Card', desc: 'Zero forex markup on international transactions. Earn 5x miles on travel spends.', badge: 'NEW' },
  { icon: '', title: 'Shopping Cashback', desc: 'Up to 10% cashback at 500+ partner stores this festive month.', badge: 'OFFER' },
  { icon: '', title: 'Recharge & Pay', desc: 'Extra 5% cashback on mobile recharges & utility bill payments via Nova Pay.', badge: 'LIMITED' },
  { icon: '', title: 'Free Health Cover', desc: 'Complimentary health insurance up to ₹1 lakh for savings account holders.', badge: 'FREE' },
];

const PRODUCTS = [
  { icon: '', title: 'Savings Account', rate: '7.25% p.a.', tag: 'Zero balance', desc: 'Open a fully digital savings account in under 5 minutes.' },
  { icon: '', title: 'Fixed Deposit', rate: '7.60% p.a.', tag: 'Guaranteed returns', desc: 'Park your money safely and earn guaranteed returns. Flexible tenures from 7 days to 10 years.' },
  { icon: '', title: 'Recurring Deposit', rate: '6.80% p.a.', tag: 'Monthly saving', desc: 'Build a saving habit with as little as ₹100/month and earn assured returns.' },
  { icon: '', title: 'Home Loan', rate: '8.50% p.a.', tag: 'Up to ₹5 Cr', desc: 'Finance your dream home with low EMIs, quick approval, and zero prepayment charges.' },
  { icon: '', title: 'Mutual Funds', rate: '12–15% p.a.*', tag: 'SIP from ₹500', desc: 'Start a SIP and grow wealth with ELSS, equity, and debt fund options curated by experts.' },
  { icon: '', title: 'Insurance', rate: '₹500/month', tag: 'Life + Health', desc: 'Protect your family with term life and health insurance plans with cashless claims at 10,000+ hospitals.' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', city: 'Mumbai', rating: 5, text: 'Transferring money is incredibly fast. IMPS in under 30 seconds — I\'ve never seen anything like it. Nova Bank is my go-to for everything financial.' },
  { name: 'Arjun Nair', city: 'Bengaluru', rating: 5, text: 'Got my home loan approved in 2 days. Customer support is also very responsive.' },
  { name: 'Sneha Reddy', city: 'Hyderabad', rating: 5, text: 'The investment portfolio tracker and expense analytics are game-changers. I actually understand where my money is going now.' },
  { name: 'Rahul Gupta', city: 'Delhi', rating: 4, text: 'Best digital banking experience I\'ve had. Instant FD, and the credit card rewards are top-notch.' },
];

const FAQS = [
  { q: 'How do I open an account with Nova Bank?', a: 'Click "Open Account" on this page, fill in your personal details including Aadhaar and PAN, and your account will be created instantly.' },
  { q: 'Is my money safe with Nova Bank?', a: 'Yes. All deposits are insured by DICGC up to ₹5,00,000 per depositor. We use 256-bit SSL encryption and RBI-compliant security standards.' },
  { q: 'How do I transfer money to another bank?', a: 'Log in to Internet Banking, go to Fund Transfer, and choose NEFT, IMPS, or RTGS. IMPS transfers are instant and available 24×7 including holidays.' },
  { q: 'What documents are needed to apply for a loan?', a: 'Typically Aadhaar, PAN Card, last 3 months\' salary slips, and bank statements.' },
  { q: 'How do I block my card if it is lost or stolen?', a: 'Log in and go to Cards → Manage → Freeze Card instantly. You can also call our 24×7 toll-free number 1800-208-1234 to report it immediately.' },
  { q: 'What is the interest rate on a Fixed Deposit?', a: 'Nova Bank offers up to 7.60% p.a. on FDs for senior citizens and 7.10% for regular customers. Rates vary by tenure — use our FD Calculator to estimate your maturity amount.' },
  { q: 'How long does it take to get a credit card?', a: 'Your card application goes to admin review and typically takes 3–5 business days. Once approved, the physical card is dispatched within 7–10 business days.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="lp">
      {/* ── NOTICE TICKER ── */}
      <div className="lp__ticker">
        <div className="lp__ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="lp__ticker-item">{item}</span>
          ))}
        </div>
      </div>

      {/* ── HEADER ── */}
      <header className="lp__header" onMouseLeave={() => setActiveNav(null)}>
        <div className="lp__header-inner">
          <div className="lp__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="lp__logo-mark">N</div>
            <div>
              <div className="lp__logo-name">Nova Bank</div>
              <div className="lp__logo-tagline">The Future of Banking</div>
            </div>
          </div>
          <nav className="lp__nav">
            {NAV_LINKS.map(item => (
              <div key={item.label} className="lp__nav-item" onMouseEnter={() => setActiveNav(item.label)}>
                <span className="lp__nav-link">{item.label} <span className="lp__nav-caret">▾</span></span>
                {activeNav === item.label && (
                  <div className="lp__nav-dropdown">
                    {item.sub.map(s => (
                      <a key={s} className="lp__nav-dropdown-item" onClick={() => {
                        if (s === 'FAQs') {
                          setActiveNav(null);
                          document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' });
                        } else {
                          navigate('/login');
                        }
                      }}>{s}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="lp__header-actions">
            <button className="lp__btn-ghost" onClick={() => navigate('/login')}>Login</button>
            <button className="lp__btn-primary" onClick={() => navigate('/login')}>Open Account</button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp__hero">
        <div className="lp__hero-content">
          <div className="lp__hero-badge">🏆 India's Most Trusted Digital Bank 2026</div>
          <h1 className="lp__hero-title">
            Smarter Banking<br />
            <span className="lp__hero-accent">For Every Indian</span>
          </h1>
          <p className="lp__hero-desc">
            Experience seamless banking with 500+ services — from instant transfers to smart investments,
            all secured with bank-grade 256-bit protection.
          </p>
          <div className="lp__hero-btns">
            <button className="lp__btn-primary lp__btn-lg" onClick={() => navigate('/login')}>
              Internet Banking Login
            </button>
            <button className="lp__btn-outline lp__btn-lg" onClick={() => navigate('/login')}>
              Open Account
            </button>
          </div>
          <div className="lp__hero-trust">
            <span>🔒 256-bit SSL Secured</span>
            <span>🏦 DICGC Insured</span>
            <span>✅ RBI Regulated</span>
          </div>
        </div>
        <div className="lp__hero-visual">
          <div className="lp__phone-mockup">
            <div className="lp__phone-screen">
              <div className="lp__phone-topbar">
                <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>Nova Bank</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Internet Banking</span>
              </div>
              <div className="lp__phone-balance-area">
                <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.2rem' }}>Total Balance</div>
                <div style={{ fontSize: '1.55rem', fontWeight: 800 }}>₹1,24,580.00</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.1rem' }}>XXXX XXXX 4821</div>
              </div>
              <div className="lp__phone-actions-row">
                {['💸 Send', '📥 Receive', '📊 Invest', '⚡ Pay'].map(a => (
                  <div key={a} className="lp__phone-action">{a}</div>
                ))}
              </div>
              <div style={{ padding: '0 0.875rem' }}>
                <div style={{ fontSize: '0.62rem', opacity: 0.45, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Transactions</div>
                {[
                  ['Netflix Subscription', '−₹499', '#f87171'],
                  ['Salary Credit', '+₹85,000', '#4ade80'],
                  ['Amazon Purchase', '−₹1,299', '#f87171'],
                ].map(([n, a, c]) => (
                  <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ opacity: 0.8 }}>{n}</span>
                    <span style={{ color: c, fontWeight: 700 }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lp__hero-floats">
            <div className="lp__float-chip lp__float-chip--green">
              <span>⚡</span><div><div style={{ fontWeight: 700, fontSize: '0.7rem' }}>IMPS Transfer</div><div style={{ fontSize: '0.6rem', opacity: 0.7 }}>Completed instantly</div></div>
            </div>
            <div className="lp__float-chip lp__float-chip--blue" style={{ marginTop: '1rem', marginLeft: '3rem' }}>
              <span>🔐</span><div><div style={{ fontWeight: 700, fontSize: '0.7rem' }}>Secured Login</div><div style={{ fontSize: '0.6rem', opacity: 0.7 }}>2FA Verified</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUICK SERVICES ── */}
      <section className="lp__services">
        <div className="lp__section-inner">
          <div className="lp__section-hdr">
            <div className="lp__section-title">Quick Services</div>
            <div className="lp__section-sub">Everything you need, right at your fingertips</div>
          </div>
          <div className="lp__services-grid">
            {QUICK_SERVICES.map(s => (
              <button key={s.label} className="lp__service-card" onClick={() => navigate('/login')}>
                <div className="lp__service-icon">{s.icon}</div>
                <div className="lp__service-label">{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── OFFERS ── */}
      <section className="lp__offers">
        <div className="lp__section-inner">
          <div className="lp__section-hdr">
            <div className="lp__section-title" style={{ color: '#fff' }}>Offers & Benefits</div>
            <div className="lp__section-sub" style={{ color: 'rgba(255,255,255,0.65)' }}>Exclusive deals curated for you</div>
          </div>
          <div className="lp__offers-grid">
            {OFFERS.map(o => (
              <div key={o.title} className="lp__offer-card" onClick={() => navigate('/login')}>
                <span className="lp__offer-badge">{o.badge}</span>
                <div className="lp__offer-icon">{o.icon}</div>
                <div className="lp__offer-title">{o.title}</div>
                <div className="lp__offer-desc">{o.desc}</div>
                <div className="lp__offer-cta">Know More →</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY NOVA BANK ── */}
      <section className="lp__why">
        <div className="lp__section-inner">
          <div className="lp__section-hdr">
            <div className="lp__section-title">Why Choose Nova Bank?</div>
            <div className="lp__section-sub">Trusted by millions, loved for simplicity</div>
          </div>
          <div className="lp__why-grid">
            {[
              { icon: '', title: 'Bank-grade Security', desc: '256-bit encryption, OTP authentication, and real-time AI fraud detection on every transaction.' },
              { icon: '', title: 'Instant Transfers', desc: 'IMPS in under 30 seconds. NEFT & RTGS available 24×7 with live status tracking.' },
              { icon: '', title: 'Zero-fee Banking', desc: 'No minimum balance on digital savings accounts. Free IMPS up to ₹1 lakh per transaction.' },
              { icon: '', title: 'Smart Insights', desc: 'AI-powered spend analytics, budget tracker, and personalised investment recommendations.' },
              { icon: '', title: 'Fully Digital', desc: 'Open account, apply for cards and loans — everything online.' },
              { icon: '', title: 'Award-winning', desc: 'Best Digital Bank 2024 & 2025 by Finance India Awards. Rated 4.8★ by 5 lakh+ users.' },
            ].map(w => (
              <div key={w.title} className="lp__why-card">
                <div className="lp__why-icon">{w.icon}</div>
                <div className="lp__why-title">{w.title}</div>
                <div className="lp__why-desc">{w.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="lp__stats-bar">
        {[
          ['10 Lakh+', 'Happy Customers'],
          ['₹500 Cr+', 'Daily Transactions'],
          ['500+', 'Branches & ATMs'],
          ['24×7', 'Customer Support'],
          ['99.9%', 'System Uptime'],
        ].map(([v, l]) => (
          <div key={l} className="lp__stats-item">
            <div className="lp__stats-val">{v}</div>
            <div className="lp__stats-label">{l}</div>
          </div>
        ))}
      </div>

      {/* ── PRODUCTS SHOWCASE ── */}
      <section className="lp__products">
        <div className="lp__section-inner">
          <div className="lp__section-hdr">
            <div className="lp__section-title">Our Products</div>
            <div className="lp__section-sub">Everything you need to save, invest, borrow, and protect</div>
          </div>
          <div className="lp__products-grid">
            {PRODUCTS.map(p => (
              <div key={p.title} className="lp__product-card" onClick={() => navigate('/login')}>
                <div className="lp__product-top">
                  <span className="lp__product-icon">{p.icon}</span>
                  <span className="lp__product-tag">{p.tag}</span>
                </div>
                <div className="lp__product-title">{p.title}</div>
                <div className="lp__product-rate">{p.rate}</div>
                <div className="lp__product-desc">{p.desc}</div>
                <div className="lp__product-cta">Learn More →</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp__how">
        <div className="lp__section-inner">
          <div className="lp__section-hdr">
            <div className="lp__section-title">Get Started in Minutes</div>
            <div className="lp__section-sub">Open your account fully online — no branch visit, no paperwork</div>
          </div>
          <div className="lp__how-steps">
            {[
              { num: '1', icon: '', title: 'Fill the Form', desc: 'Enter your basic details — name, phone, Aadhaar, and PAN. Takes under 2 minutes.' },
              { num: '2', icon: '', title: 'Instant Verification', desc: 'Your details are verified automatically. Account number generated on the spot.' },
              { num: '3', icon: '', title: 'Set Your Password', desc: 'Choose a secure Internet Banking password. Secured with OTP and 2FA.' },
              { num: '4', icon: '', title: 'Start Banking', desc: 'Transfer money, pay bills, open FDs, apply for cards — all from one dashboard.' },
            ].map((s, i) => (
              <div key={s.num} className="lp__how-step">
                <div className="lp__how-num">{s.num}</div>
                <div className="lp__how-icon">{s.icon}</div>
                <div className="lp__how-title">{s.title}</div>
                <div className="lp__how-desc">{s.desc}</div>
                {i < 3 && <div className="lp__how-arrow">→</div>}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <button className="lp__btn-primary lp__btn-lg" onClick={() => navigate('/login')}>Open Your Account Now</button>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="lp__testimonials">
        <div className="lp__section-inner">
          <div className="lp__section-hdr">
            <div className="lp__section-title">What Our Customers Say</div>
            <div className="lp__section-sub">Rated 4.8★ by over 5 lakh customers</div>
          </div>
          <div className="lp__testimonials-grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="lp__testimonial-card">
                <div className="lp__testimonial-stars">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
                <p className="lp__testimonial-text">"{t.text}"</p>
                <div className="lp__testimonial-author">
                  <div className="lp__testimonial-avatar">{t.name[0]}</div>
                  <div>
                    <div className="lp__testimonial-name">{t.name}</div>
                    <div className="lp__testimonial-city">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs ── */}
      <section id="faqs" className="lp__faqs">
        <div className="lp__section-inner">
          <div className="lp__section-hdr">
            <div className="lp__section-title">Frequently Asked Questions</div>
            <div className="lp__section-sub">Got questions? We've got answers.</div>
          </div>
          <div className="lp__faqs-list">
            {FAQS.map((faq, i) => (
              <div key={i} className={`lp__faq-item${openFaq === i ? ' lp__faq-item--open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="lp__faq-question">
                  <span>{faq.q}</span>
                  <span className="lp__faq-chevron">{openFaq === i ? '▲' : '▼'}</span>
                </div>
                {openFaq === i && <div className="lp__faq-answer">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="lp__cta-banner">
        <div className="lp__section-inner" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}></div>
          <h2 className="lp__cta-title">Ready to experience smarter banking?</h2>
          <p className="lp__cta-sub">Join 10 lakh+ customers who trust Nova Bank for their everyday financial needs.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <button className="lp__btn-primary lp__btn-lg" onClick={() => navigate('/login')}>Open Free Account</button>
            <button className="lp__btn-outline lp__btn-lg" onClick={() => navigate('/login')}>Internet Banking Login</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp__footer">
        <div className="lp__footer-inner">
          <div className="lp__footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="lp__logo-mark lp__logo-mark--sm">N</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Nova Bank</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, color: '#fff' }}>The Future of Banking</div>
              </div>
            </div>
            <p className="lp__footer-tagline">Secure, trusted, and always available banking — built for the digital era.</p>
            <div className="lp__footer-badges">
              <span>🛡️ 256-bit SSL</span>
              <span>🏦 DICGC Insured</span>
              <span>✅ RBI Regulated</span>
            </div>
          </div>
          {[
            { title: 'Personal Banking', links: ['Savings Account', 'Fixed Deposits', 'Loans', 'Credit Cards', 'Insurance'] },
            { title: 'Investments', links: ['Mutual Funds', 'PPF & NPS', 'SGB & Bonds', 'Tax Saver FD', 'Demat Account'] },
            { title: 'Support', links: ['Customer Care', 'Grievance Redressal', 'Locate Branch', 'ATM Locator', 'FAQs'] },
          ].map(col => (
            <div key={col.title} className="lp__footer-col">
              <div className="lp__footer-col-title">{col.title}</div>
              {col.links.map(l => <a key={l} className="lp__footer-link" onClick={() => navigate('/login')}>{l}</a>)}
            </div>
          ))}
        </div>
        <div className="lp__footer-bottom">
          <div>
            <p>© 2026 Nova Bank Ltd. All rights reserved. | CIN: L65191MH1996PLC108969</p>
            <p>DICGC insured up to ₹5,00,000 per depositor. Investments are subject to market risk. Read all scheme-related documents carefully before investing.</p>
          </div>
          <div className="lp__footer-contact">
            <span>📞 1800-208-1234 (Toll Free)</span>
            <span>✉️ support@novabank.in</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

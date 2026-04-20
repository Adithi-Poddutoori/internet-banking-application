import { useState } from 'react';

// ─── Shared option lists ─────────────────────────────────────────────────────
const _emp = ['Salaried (Private)', 'Salaried (Government)', 'Self-Employed / Freelancer', 'Business Owner', 'Retired', 'Other'];
const _cibil = ['Below 650', '650–700', '700–750', '750–800', 'Above 800', 'Not checked yet'];
const _tenureLong = ['5', '10', '15', '20', '25', '30'];
const _tenureMid = ['1', '2', '3', '5', '7', '10', '15', '20', '25', '30'];
const _tenureShort = ['1', '2', '3', '4', '5'];
const _goal = ['Wealth Creation', 'Retirement Planning', 'Child Education', 'Home Purchase', 'Tax Saving (ELSS)', 'Emergency Fund'];
const _risk = ['Conservative (Low Risk)', 'Moderate (Balanced)', 'Aggressive (High Risk)'];
const _horizon = ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'];
const _premFreq = ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually', 'Single Premium'];
const _relation = ['Spouse', 'Father', 'Mother', 'Child', 'Sibling', 'Other'];
const _policyTerm1_3 = ['1', '2', '3'];

// ─── Per-product field configs ─────────────────────────────────────────────────
const PRODUCT_FIELD_CONFIGS = {
  // ── LOANS ──────────────────────────────────────────────────────────────────
  'Home Loan': [
    { name: 'propertyAddress', label: 'Property / Project Address', type: 'text', placeholder: 'Full address of the property', required: true, wide: true },
    { name: 'propertyType', label: 'Property Type', type: 'select', required: true, options: ['Flat / Apartment', 'Independent House', 'Villa / Row House', 'Plot (Residential)', 'Under Construction', 'Commercial Property'] },
    { name: 'propertyValue', label: 'Market Value of Property (₹)', type: 'number', placeholder: 'e.g. 8000000', required: true, min: 100000 },
    { name: 'loanAmount', label: 'Loan Amount Requested (₹)', type: 'number', placeholder: 'e.g. 5000000', required: true, min: 100000 },
    { name: 'tenure', label: 'Loan Tenure (Years)', type: 'select', required: true, options: _tenureLong },
    { name: 'employmentType', label: 'Employment Type', type: 'select', required: true, options: _emp },
    { name: 'monthlyIncome', label: 'Gross Monthly Income (₹)', type: 'number', placeholder: 'e.g. 120000', required: true, min: 10000 },
    { name: 'existingEmi', label: 'Existing EMI Obligations (₹/month)', type: 'number', placeholder: '0 if none', required: false },
    { name: 'coApplicant', label: 'Co-applicant?', type: 'select', required: true, options: ['Yes', 'No'] },
    { name: 'loanPurpose', label: 'Loan Purpose', type: 'select', required: true, options: ['Purchase of Ready Property', 'Under-Construction Property', 'Self-Construction', 'Home Renovation / Extension', 'Plot Purchase', 'Balance Transfer'] },
    { name: 'creditScore', label: 'Self-Declared CIBIL Score', type: 'select', required: true, options: _cibil },
  ],
  'Car Loan': [
    { name: 'vehicleCondition', label: 'Vehicle Condition', type: 'select', required: true, options: ['New Vehicle', 'Used / Pre-owned Vehicle'] },
    { name: 'vehicleMakeModel', label: 'Vehicle Make & Model', type: 'text', placeholder: 'e.g. Maruti Suzuki Swift ZXI', required: true, wide: true },
    { name: 'vehicleManufactureYear', label: 'Manufacture Year', type: 'select', required: true, options: ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016'] },
    { name: 'onRoadPrice', label: 'On-Road Price / Vehicle Value (₹)', type: 'number', placeholder: 'e.g. 1200000', required: true, min: 50000 },
    { name: 'loanAmount', label: 'Loan Amount Requested (₹)', type: 'number', placeholder: 'e.g. 900000', required: true, min: 25000 },
    { name: 'tenure', label: 'Loan Tenure (Years)', type: 'select', required: true, options: ['1', '2', '3', '5', '7'] },
    { name: 'employmentType', label: 'Employment Type', type: 'select', required: true, options: _emp },
    { name: 'monthlyIncome', label: 'Gross Monthly Income (₹)', type: 'number', placeholder: 'e.g. 60000', required: true, min: 10000 },
    { name: 'existingEmi', label: 'Existing EMI Obligations (₹/month)', type: 'number', placeholder: '0 if none', required: false },
    { name: 'loanPurpose', label: 'Purchase Purpose', type: 'select', required: true, options: ['Personal Use', 'Family Vehicle', 'Business / Commercial Use', 'Cab / Taxi Operations'] },
    { name: 'creditScore', label: 'Self-Declared CIBIL Score', type: 'select', required: true, options: _cibil },
  ],
  'Personal Loan': [
    { name: 'loanPurpose', label: 'Loan Purpose', type: 'select', required: true, wide: true, options: ['Wedding / Marriage Expenses', 'Medical Emergency', 'Home Renovation', 'Travel / Vacation', 'Consumer Electronics / Appliances', 'Education Fees', 'Debt Consolidation', 'Business Working Capital', 'Other Personal Needs'] },
    { name: 'loanAmount', label: 'Loan Amount Requested (₹)', type: 'number', placeholder: 'e.g. 300000', required: true, min: 50000 },
    { name: 'tenure', label: 'Loan Tenure (Years)', type: 'select', required: true, options: _tenureShort },
    { name: 'employmentType', label: 'Employment Type', type: 'select', required: true, options: _emp },
    { name: 'monthlyIncome', label: 'Gross Monthly Income (₹)', type: 'number', placeholder: 'e.g. 50000', required: true, min: 15000 },
    { name: 'existingEmi', label: 'Existing EMI Obligations (₹/month)', type: 'number', placeholder: '0 if none', required: false },
    { name: 'residenceType', label: 'Residence Type', type: 'select', required: true, options: ['Own Property', 'Rented', 'Company-Provided', 'With Parents / Family'] },
    { name: 'creditScore', label: 'Self-Declared CIBIL Score', type: 'select', required: true, options: _cibil },
  ],
  'Education Loan': [
    { name: 'studentName', label: 'Student Full Name', type: 'text', placeholder: 'As per marksheets', required: true },
    { name: 'courseName', label: 'Course / Programme Name', type: 'text', placeholder: 'e.g. B.Tech Computer Science', required: true },
    { name: 'institutionName', label: 'College / University Name', type: 'text', placeholder: 'Full institution name', required: true, wide: true },
    { name: 'courseCountry', label: 'Study Destination', type: 'select', required: true, options: ['India', 'USA', 'UK', 'Australia', 'Canada', 'Germany', 'Other International'] },
    { name: 'courseDuration', label: 'Course Duration (Years)', type: 'select', required: true, options: ['1', '2', '3', '4', '5', '6'] },
    { name: 'totalFees', label: 'Total Course Fees (₹)', type: 'number', placeholder: 'e.g. 1500000', required: true, min: 10000 },
    { name: 'loanAmount', label: 'Loan Amount Requested (₹)', type: 'number', placeholder: 'e.g. 1200000', required: true, min: 10000 },
    { name: 'tenure', label: 'Repayment Tenure (Years) after moratorium', type: 'select', required: true, options: ['5', '7', '10', '15'] },
    { name: 'coApplicantName', label: 'Co-applicant (Parent / Guardian) Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'monthlyIncome', label: 'Co-applicant Monthly Income (₹)', type: 'number', placeholder: 'e.g. 70000', required: true, min: 5000 },
    { name: 'loanPurpose', label: 'Expense Coverage', type: 'select', required: true, options: ['Tuition Fees Only', 'Tuition + Living Expenses', 'Tuition + Travel + Living', 'Full Cost of Study'] },
    { name: 'creditScore', label: "Co-applicant's CIBIL Score", type: 'select', required: true, options: _cibil },
  ],
  'Business Loan': [
    { name: 'businessName', label: 'Business / Company Name', type: 'text', placeholder: 'Registered business name', required: true, wide: true },
    { name: 'businessType', label: 'Business Type', type: 'select', required: true, options: ['Sole Proprietorship', 'Partnership Firm', 'Private Limited Company', 'LLP', 'Public Limited', 'Other'] },
    { name: 'businessVintage', label: 'Business Vintage', type: 'select', required: true, options: ['Less than 1 year', '1–2 years', '2–5 years', '5–10 years', '10+ years'] },
    { name: 'annualTurnover', label: 'Annual Turnover / Revenue (₹)', type: 'number', placeholder: 'e.g. 5000000', required: true, min: 100000 },
    { name: 'monthlyIncome', label: 'Net Monthly Profit (₹)', type: 'number', placeholder: 'e.g. 120000', required: true, min: 10000 },
    { name: 'loanAmount', label: 'Loan Amount Requested (₹)', type: 'number', placeholder: 'e.g. 2000000', required: true, min: 100000 },
    { name: 'tenure', label: 'Loan Tenure (Years)', type: 'select', required: true, options: ['1', '2', '3', '5', '7'] },
    { name: 'loanPurpose', label: 'Loan Purpose', type: 'select', required: true, options: ['Working Capital', 'Equipment / Machinery Purchase', 'Business Expansion', 'Inventory Purchase', 'Office / Premises Acquisition', 'Debt Repayment / Refinance', 'Other'] },
    { name: 'gstRegistered', label: 'GST Registered?', type: 'select', required: true, options: ['Yes', 'No'] },
    { name: 'existingEmi', label: 'Existing Business Loan EMIs (₹/month)', type: 'number', placeholder: '0 if none', required: false },
    { name: 'creditScore', label: 'Promoter CIBIL Score', type: 'select', required: true, options: _cibil },
  ],
  'Gold Loan': [
    { name: 'goldType', label: 'Gold Item Type', type: 'select', required: true, options: ['Gold Jewellery', 'Gold Coins (Hallmarked)', 'Gold Bars / Biscuits'] },
    { name: 'goldWeight', label: 'Total Gold Weight (grams)', type: 'number', placeholder: 'e.g. 50', required: true, min: 5 },
    { name: 'goldPurity', label: 'Gold Purity', type: 'select', required: true, options: ['18 Karat (75%)', '20 Karat (83%)', '22 Karat (91.6%)', '24 Karat (99.9%)'] },
    { name: 'estimatedGoldValue', label: 'Estimated Gold Value (₹)', type: 'number', placeholder: 'e.g. 250000', required: true, min: 5000 },
    { name: 'loanAmount', label: 'Loan Amount Requested (₹)', type: 'number', placeholder: 'Up to 75% of gold value', required: true, min: 5000 },
    { name: 'tenure', label: 'Loan Tenure', type: 'select', required: true, options: ['3 months', '6 months', '12 months', '18 months', '24 months'] },
    { name: 'loanPurpose', label: 'Loan Purpose', type: 'select', required: true, options: ['Personal Emergency', 'Medical Expenses', 'Business Working Capital', 'Agricultural / Farming', 'Education Fees', 'Other'] },
    { name: 'monthlyIncome', label: 'Monthly Income (₹)', type: 'number', placeholder: 'e.g. 40000', required: true, min: 5000 },
    { name: 'creditScore', label: 'Self-Declared CIBIL Score', type: 'select', required: false, options: _cibil },
  ],

  // ── INVESTMENTS ───────────────────────────────────────────────────────────
  'Mutual Funds': [
    { name: 'investmentMode', label: 'Investment Mode', type: 'select', required: true, options: ['SIP (Monthly)', 'Lumpsum', 'Both (SIP + Lumpsum)'] },
    { name: 'amount', label: 'SIP / Lumpsum Amount (₹)', type: 'number', placeholder: 'e.g. 5000', required: true, min: 500 },
    { name: 'fundCategory', label: 'Fund Category', type: 'select', required: true, options: ['Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap / Multi Cap', 'ELSS (Tax Saving)', 'Debt / Bond Fund', 'Hybrid / Balanced', 'Index Fund / ETF'] },
    { name: 'investmentGoal', label: 'Investment Goal', type: 'select', required: true, options: _goal },
    { name: 'riskProfile', label: 'Risk Appetite', type: 'select', required: true, options: _risk },
    { name: 'investmentHorizon', label: 'Investment Horizon', type: 'select', required: true, options: _horizon },
    { name: 'annualIncome', label: 'Annual Income (₹)', type: 'number', placeholder: 'e.g. 1200000', required: true, min: 100000 },
    { name: 'existingMutualFunds', label: 'Existing MF Portfolio?', type: 'select', required: true, options: ['Yes – I have existing investments', 'No – First time investor'] },
    { name: 'demat', label: 'Demat / Folio Account Status', type: 'select', required: true, options: ['Yes – Linked to this bank', 'Yes – With another broker', 'No – Open new Demat account'] },
  ],
  'PPF (Public Provident Fund)': [
    { name: 'investmentMode', label: 'Contribution Mode', type: 'select', required: true, options: ['Annual Lumpsum', 'Monthly Installments', 'One-time (Yearly Max)'] },
    { name: 'amount', label: 'Annual Contribution Amount (₹)', type: 'number', placeholder: 'Min ₹500, Max ₹1,50,000', required: true, min: 500, max: 150000 },
    { name: 'investmentGoal', label: 'Investment Goal', type: 'select', required: true, options: ['Retirement Planning', 'Child Education', 'Wealth Creation', 'Tax Saving', 'Emergency Corpus'] },
    { name: 'riskProfile', label: 'Investor Profile', type: 'select', required: true, options: ['Conservative (Low Risk)', 'Moderate (Balanced)'] },
    { name: 'ppfAccountStatus', label: 'PPF Account Status', type: 'select', required: true, options: ['New Account – Opening for the first time', 'Extension (existing account)', 'Transfer from another bank'] },
    { name: 'annualIncome', label: 'Annual Income (₹)', type: 'number', placeholder: 'e.g. 800000', required: true, min: 0 },
    { name: 'nomineeName', label: 'Nominee Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'nomineeRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
  ],
  'NPS (National Pension)': [
    { name: 'investmentMode', label: 'Contribution Type', type: 'select', required: true, options: ['Monthly SIP', 'Annual Contribution', 'One-time Lumpsum'] },
    { name: 'amount', label: 'Contribution Amount (₹)', type: 'number', placeholder: 'e.g. 5000', required: true, min: 500 },
    { name: 'npsAccountType', label: 'NPS Account Tier', type: 'select', required: true, options: ['Tier I (Pension + Tax Benefit u/s 80CCD)', 'Tier II (Voluntary Savings)', 'Both Tier I & Tier II'] },
    { name: 'investmentGoal', label: 'Retirement Goal', type: 'select', required: true, options: ['Retirement Income', 'Tax Saving', 'Wealth Creation + Pension', 'Child Education Fund'] },
    { name: 'riskProfile', label: 'Asset Allocation Preference', type: 'select', required: true, options: ['Auto Choice (Lifecycle Fund)', 'Active Choice – Aggressive (75% Equity)', 'Active Choice – Moderate (50% Equity)', 'Active Choice – Conservative (25% Equity)'] },
    { name: 'retirementAge', label: 'Expected Retirement Age', type: 'select', required: true, options: ['55', '58', '60', '65'] },
    { name: 'pfmChoice', label: 'Pension Fund Manager', type: 'select', required: true, options: ['HDFC Pension Fund', 'LIC Pension Fund', 'SBI Pension Fund', 'ICICI Prudential Pension Fund', 'UTI Retirement Solutions', 'Kotak Pension Fund', 'Aditya Birla Sun Life Pension'] },
    { name: 'annualIncome', label: 'Annual Income (₹)', type: 'number', placeholder: 'e.g. 1000000', required: true, min: 100000 },
  ],
  'Sovereign Gold Bond': [
    { name: 'investmentMode', label: 'Subscription Type', type: 'select', required: true, options: ['Current SGB Series', 'Lumpsum (Secondary Market)'] },
    { name: 'sgbUnits', label: 'Number of Units (1 unit = 1 gram gold)', type: 'number', placeholder: 'Max 4 kg/year individual', required: true, min: 1, max: 4000 },
    { name: 'amount', label: 'Total Investment Amount (₹)', type: 'number', placeholder: 'Based on current issue price', required: true, min: 1000 },
    { name: 'holdingPreference', label: 'Holding Preference', type: 'select', required: true, options: ['Demat Form', 'Physical Certificate', 'Both (Demat + Certificate)'] },
    { name: 'investmentGoal', label: 'Investment Goal', type: 'select', required: true, options: _goal },
    { name: 'riskProfile', label: 'Risk Profile', type: 'select', required: true, options: _risk },
    { name: 'nomineeName', label: 'Nominee Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'nomineeRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
  ],
  'Demat & Trading': [
    { name: 'investmentMode', label: 'Trading Segment(s)', type: 'select', required: true, options: ['Equity (Cash Segment)', 'F&O – Futures & Options', 'Commodity Trading', 'Currency Derivatives', 'All Segments'] },
    { name: 'amount', label: 'Initial Account Funding (₹)', type: 'number', placeholder: 'Amount to deposit in trading wallet', required: true, min: 1000 },
    { name: 'tradingExperience', label: 'Trading Experience', type: 'select', required: true, options: ['None – Complete Beginner', 'Less than 1 year', '1–3 years', '3–5 years', '5+ years'] },
    { name: 'investmentGoal', label: 'Primary Goal', type: 'select', required: true, options: ['Short-term Trading (Intraday)', 'Medium-term Swing Trading', 'Long-term Investing', 'Portfolio Diversification', 'Derivatives / Hedging'] },
    { name: 'riskProfile', label: 'Risk Tolerance', type: 'select', required: true, options: _risk },
    { name: 'preferredExchange', label: 'Preferred Exchange', type: 'select', required: true, options: ['NSE', 'BSE', 'Both NSE & BSE', 'MCX (Commodity)'] },
    { name: 'annualIncome', label: 'Annual Income (₹)', type: 'number', placeholder: 'e.g. 1000000', required: true, min: 100000 },
    { name: 'panVerified', label: 'PAN Card Status', type: 'select', required: true, options: ['Yes – PAN linked & verified', 'No – Will submit during KYC process'] },
  ],
  'Tax Saver FD': [
    { name: 'investmentMode', label: 'Deposit Type', type: 'select', required: true, options: ['New Tax Saver FD', 'Renewal of Existing Tax Saver FD'] },
    { name: 'amount', label: 'Deposit Amount (₹)', type: 'number', placeholder: 'Min ₹1,000 · Max ₹1,50,000 p.a.', required: true, min: 1000, max: 150000 },
    { name: 'interestPayout', label: 'Interest Payout Option', type: 'select', required: true, options: ['Cumulative (Reinvest – Higher Returns)', 'Quarterly Interest Payout', 'Monthly Interest Payout'] },
    { name: 'investmentGoal', label: 'Investment Goal', type: 'select', required: true, options: ['Tax Saving (80C)', 'Guaranteed Returns', 'Retirement Corpus', 'Emergency Fund'] },
    { name: 'riskProfile', label: 'Investor Profile', type: 'select', required: true, options: ['Conservative (Low Risk – Preferred)', 'Moderate (Balanced)'] },
    { name: 'annualIncome', label: 'Annual Income (₹)', type: 'number', placeholder: 'e.g. 800000', required: true, min: 0 },
    { name: 'nomineeName', label: 'Nominee Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'nomineeRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
    { name: 'autoRenew', label: 'Auto-Renew After 5 Years?', type: 'select', required: true, options: ['Yes – Roll over automatically', 'No – Payout on maturity'] },
  ],

  // ── INSURANCE ─────────────────────────────────────────────────────────────
  'Term Life Insurance': [
    { name: 'sumAssured', label: 'Life Cover Amount / Sum Assured (₹)', type: 'number', placeholder: 'e.g. 10000000 (₹1 Cr)', required: true, min: 500000 },
    { name: 'policyTerm', label: 'Policy Term (Years)', type: 'select', required: true, options: ['10', '15', '20', '25', '30', '35', '40'] },
    { name: 'premiumFrequency', label: 'Premium Payment Frequency', type: 'select', required: true, options: _premFreq },
    { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, minAge: 18, maxAge: 65 },
    { name: 'occupation', label: 'Occupation', type: 'select', required: true, options: ['Salaried – Private', 'Salaried – Government / PSU', 'Self-Employed / Freelancer', 'Business Owner', 'Professional (Doctor / Lawyer / CA)', 'Homemaker', 'Student', 'Retired'] },
    { name: 'smokingStatus', label: 'Tobacco / Smoking Status', type: 'select', required: true, options: ['Non-Smoker / Non-Tobacco User', 'Occasional Smoker (< 10/day)', 'Regular Smoker (10+ per day)', 'Ex-smoker (quit > 2 years ago)'] },
    { name: 'existingMedical', label: 'Pre-existing Medical Conditions', type: 'select', required: true, options: ['None', 'Diabetes', 'Hypertension / Blood Pressure', 'Heart Disease / History', 'Cancer (in remission)', 'Kidney / Liver Disorder', 'Multiple Conditions'] },
    { name: 'annualIncome', label: 'Annual Income (₹)', type: 'number', placeholder: 'e.g. 800000', required: true, min: 0 },
    { name: 'beneficiaryName', label: 'Nominee / Beneficiary Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'beneficiaryRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
  ],
  'Health Insurance': [
    { name: 'familyCoverage', label: 'Members to be Covered', type: 'select', required: true, wide: true, options: ['Self Only (Individual)', 'Self + Spouse', 'Self + Spouse + 1 Child', 'Self + Spouse + 2 Children', 'Self + Spouse + Parents', 'Self + Spouse + Children + Parents'] },
    { name: 'ageOfEldest', label: 'Age of Eldest Member (Years)', type: 'number', placeholder: 'e.g. 45', required: true, min: 1, max: 100 },
    { name: 'sumAssured', label: 'Sum Insured / Cover Amount (₹)', type: 'number', placeholder: 'e.g. 500000', required: true, min: 100000 },
    { name: 'policyTerm', label: 'Policy Term', type: 'select', required: true, options: _policyTerm1_3 },
    { name: 'premiumFrequency', label: 'Premium Payment Frequency', type: 'select', required: true, options: ['Monthly', 'Quarterly', 'Annually', '2-Year Lumpsum'] },
    { name: 'preExistingConditions', label: 'Pre-existing Medical Conditions', type: 'select', required: true, options: ['None', 'Diabetes', 'Hypertension / Blood Pressure', 'Heart Disease', 'Asthma / Respiratory', 'Cancer (in remission)', 'Multiple Conditions'] },
    { name: 'previousClaims', label: 'Any Previous Insurance Claims?', type: 'select', required: true, options: ['No claims in last 3 years', '1 claim', '2+ claims'] },
    { name: 'annualIncome', label: 'Annual Household Income (₹)', type: 'number', placeholder: 'e.g. 1200000', required: true, min: 0 },
    { name: 'beneficiaryName', label: 'Primary Contact / Nominee Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'beneficiaryRelation', label: 'Relation to Proposer', type: 'select', required: true, options: _relation },
  ],
  'Family Floater': [
    { name: 'numberOfMembers', label: 'Number of Family Members', type: 'select', required: true, options: ['2', '3', '4', '5', '6 or more'] },
    { name: 'agesOfMembers', label: 'Ages of All Members', type: 'text', placeholder: 'e.g. 38, 35, 10, 8', required: true, wide: true },
    { name: 'sumAssured', label: 'Total Family Cover Amount (₹)', type: 'number', placeholder: 'e.g. 1000000', required: true, min: 200000 },
    { name: 'policyTerm', label: 'Policy Term (Years)', type: 'select', required: true, options: _policyTerm1_3 },
    { name: 'premiumFrequency', label: 'Premium Payment Frequency', type: 'select', required: true, options: ['Monthly', 'Quarterly', 'Annually'] },
    { name: 'maternityAddon', label: 'Maternity Cover Add-on?', type: 'select', required: true, options: ['Yes – Include Maternity Cover', 'No'] },
    { name: 'preExistingConditions', label: 'Pre-existing Conditions in Family', type: 'select', required: true, options: ['None', 'Diabetes', 'Hypertension', 'Heart Conditions', 'Multiple Conditions'] },
    { name: 'annualIncome', label: 'Annual Family Income (₹)', type: 'number', placeholder: 'e.g. 1500000', required: true, min: 0 },
    { name: 'beneficiaryName', label: 'Nominee Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'beneficiaryRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
  ],
  'Motor Insurance': [
    { name: 'vehicleType', label: 'Vehicle Category', type: 'select', required: true, options: ['Two-Wheeler (Bike / Scooter)', 'Private Car', 'Commercial Vehicle', 'Three-Wheeler'] },
    { name: 'vehicleMakeModel', label: 'Vehicle Make, Model & Variant', type: 'text', placeholder: 'e.g. Honda Activa 6G Deluxe', required: true, wide: true },
    { name: 'vehicleYear', label: 'Year of Manufacture', type: 'select', required: true, options: ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015 or earlier'] },
    { name: 'registrationNumber', label: 'Vehicle Registration Number', type: 'text', placeholder: 'e.g. MH02AB1234', required: true },
    { name: 'planType', label: 'Insurance Plan Type', type: 'select', required: true, options: ['Comprehensive (Own Damage + Third Party)', 'Third Party Only (Mandatory)', 'Standalone Own-Damage Cover'] },
    { name: 'sumAssured', label: 'Insured Declared Value – IDV (₹)', type: 'number', placeholder: 'e.g. 600000', required: true, min: 10000 },
    { name: 'ncbPercentage', label: 'No Claim Bonus (NCB) Claim', type: 'select', required: true, options: ['0% – New Policy / First Insurance', '20% NCB', '25% NCB', '35% NCB', '45% NCB', '50% NCB (Max)'] },
    { name: 'addons', label: 'Add-on Covers', type: 'select', required: false, options: ['None', 'Zero Depreciation', 'Roadside Assistance (RSA)', 'Engine & Gearbox Protection', 'Return to Invoice', 'Zero Dep + RSA + Engine'] },
    { name: 'policyTerm', label: 'Policy Tenure', type: 'select', required: true, options: ['1', '2', '3'] },
    { name: 'premiumFrequency', label: 'Premium Payment', type: 'select', required: true, options: ['Annual (Yearly)', '2-Year Bundled', '3-Year Bundled (Recommended)'] },
    { name: 'beneficiaryName', label: 'Registered Owner Full Name', type: 'text', placeholder: 'Name on RC Book', required: true },
    { name: 'beneficiaryRelation', label: 'Owner Relation to Proposer', type: 'select', required: true, options: ['Self', ...(_relation)] },
  ],
  'Travel Insurance': [
    { name: 'tripType', label: 'Trip Type', type: 'select', required: true, options: ['Domestic Travel', 'International – Single Trip', 'International – Multi-Trip Annual', 'Student Travel Abroad'] },
    { name: 'destination', label: 'Destination Country / Region', type: 'text', placeholder: 'e.g. Europe / USA / Thailand', required: true, wide: true },
    { name: 'travelFromDate', label: 'Travel Start Date', type: 'date', required: true },
    { name: 'travelToDate', label: 'Return Date', type: 'date', required: true },
    { name: 'numberOfTravellers', label: 'Number of Travellers', type: 'select', required: true, options: ['1', '2', '3', '4', '5 or more'] },
    { name: 'sumAssured', label: 'Medical Coverage per Traveller (₹)', type: 'number', placeholder: 'e.g. 5000000', required: true, min: 100000 },
    { name: 'policyTerm', label: 'Trip Duration (Days)', type: 'select', required: true, options: ['1–7 days', '8–15 days', '16–30 days', '31–60 days', '61–90 days', 'Annual Multi-trip'] },
    { name: 'premiumFrequency', label: 'Premium Payment', type: 'select', required: true, options: ['One-time (Full Trip)'] },
    { name: 'medicalAddon', label: 'Pre-existing Medical Condition Cover?', type: 'select', required: true, options: ['Yes – Include Pre-existing Cover', 'No – Standard Cover Only'] },
    { name: 'tripCost', label: 'Total Trip Cost / Value (₹)', type: 'number', placeholder: 'For trip cancellation cover', required: false },
    { name: 'beneficiaryName', label: 'Emergency Contact Name', type: 'text', placeholder: 'Name of person to contact in emergency', required: true },
    { name: 'beneficiaryRelation', label: 'Emergency Contact Relation', type: 'select', required: true, options: _relation },
  ],
  'Home Insurance': [
    { name: 'propertyType', label: 'Property Type', type: 'select', required: true, options: ['Apartment / Flat', 'Independent House', 'Villa / Row House', 'Townhouse', 'Commercial Premises'] },
    { name: 'propertyAddress', label: 'Property Address', type: 'text', placeholder: 'Full address to be insured', required: true, wide: true },
    { name: 'builtUpArea', label: 'Built-up Area (sq. ft.)', type: 'number', placeholder: 'e.g. 1200', required: true, min: 100 },
    { name: 'yearBuilt', label: 'Year of Construction', type: 'select', required: true, options: ['Before 1990', '1990–2000', '2001–2010', '2011–2020', '2021 onwards'] },
    { name: 'sumAssured', label: 'Total Insured Value – Structure + Contents (₹)', type: 'number', placeholder: 'e.g. 5000000', required: true, min: 100000 },
    { name: 'structureCover', label: 'Structure Cover Amount (₹)', type: 'number', placeholder: 'Reconstruction / rebuilding cost', required: true, min: 50000 },
    { name: 'contentsCover', label: 'Contents / Belongings Cover (₹)', type: 'number', placeholder: 'Furniture, electronics, valuables', required: false },
    { name: 'naturalDisasterCover', label: 'Natural Disaster Cover?', type: 'select', required: true, options: ['Yes – Include Earthquake / Flood / Cyclone', 'No – Standard Fire & Theft Only'] },
    { name: 'policyTerm', label: 'Policy Duration (Years)', type: 'select', required: true, options: ['1', '2', '3', '5'] },
    { name: 'premiumFrequency', label: 'Premium Payment Frequency', type: 'select', required: true, options: ['Annually', '3-Year Lumpsum', '5-Year Lumpsum'] },
    { name: 'beneficiaryName', label: 'Property Owner / Nominee Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'beneficiaryRelation', label: 'Relation to Proposer', type: 'select', required: true, options: ['Self', ...(_relation)] },
  ],
};

// ─── Per-product deposit configs (specific to each deposit type) ──────────────
Object.assign(PRODUCT_FIELD_CONFIGS, {
  'Fixed Deposit (FD)': [
    { name: 'amount', label: 'FD Principal Amount (₹)', type: 'number', placeholder: 'e.g. 50000', required: true, min: 1000 },
    { name: 'tenure', label: 'FD Tenure (Months)', type: 'select', required: true, options: ['3', '6', '9', '12', '18', '24', '36', '48', '60', '84', '120'] },
    { name: 'payoutFrequency', label: 'Interest Payout Option', type: 'select', required: true, options: ['Cumulative (Reinvest at maturity)', 'Monthly Payout', 'Quarterly Payout', 'Half-Yearly Payout', 'Annual Payout'] },
    { name: 'autoRenew', label: 'Auto-Renew on Maturity?', type: 'select', required: true, options: ['Yes – Roll over principal + interest', 'Yes – Roll over principal only', 'No – Credit to savings account'] },
    { name: 'nominationName', label: 'Nominee Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'nominationRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
    { name: 'sourceOfFunds', label: 'Source of Funds', type: 'select', required: true, options: ['Salary / Employment Income', 'Business Income', 'Savings', 'Sale of Asset', 'Inheritance / Gift', 'Other'] },
  ],
  'Recurring Deposit (RD)': [
    { name: 'amount', label: 'Monthly Installment Amount (₹)', type: 'number', placeholder: 'Amount to deposit each month, e.g. 5000', required: true, min: 100 },
    { name: 'tenure', label: 'RD Tenure (Months)', type: 'select', required: true, options: ['6', '12', '18', '24', '36', '48', '60', '84', '120'] },
    { name: 'payoutFrequency', label: 'Maturity Payout Preference', type: 'select', required: true, options: ['At Maturity – Credit to savings', 'At Maturity – Renew as FD', 'Monthly Interest Payout (partial)'] },
    { name: 'autoRenew', label: 'Auto-Renew on Maturity?', type: 'select', required: true, options: ['Yes – Start new RD automatically', 'No – Close on maturity'] },
    { name: 'nominationName', label: 'Nominee Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'nominationRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
    { name: 'sourceOfFunds', label: 'Source of Funds', type: 'select', required: true, options: ['Salary / Employment Income', 'Business Income', 'Savings', 'Other'] },
  ],
  'Flexi Deposit': [
    { name: 'amount', label: 'Initial Sweep-in Amount (₹)', type: 'number', placeholder: 'Min ₹25,000', required: true, min: 25000 },
    { name: 'tenure', label: 'Deposit Tenure (Months)', type: 'select', required: true, options: ['12', '24', '36', '48', '60'] },
    { name: 'payoutFrequency', label: 'Interest Payout Frequency', type: 'select', required: true, options: ['Quarterly Payout', 'Half-Yearly Payout', 'At Maturity'] },
    { name: 'sweepThreshold', label: 'Sweep-in Threshold (₹)', type: 'number', placeholder: 'Balance above which sweep-in triggers, e.g. 10000', required: true, min: 5000 },
    { name: 'autoRenew', label: 'Auto-Renew on Maturity?', type: 'select', required: true, options: ['Yes', 'No'] },
    { name: 'nominationName', label: 'Nominee Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'nominationRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
    { name: 'sourceOfFunds', label: 'Source of Funds', type: 'select', required: true, options: ['Salary / Employment Income', 'Business Income', 'Savings', 'Sale of Asset', 'Other'] },
  ],
  'Annuity Deposit': [
    { name: 'amount', label: 'Annuity Principal Amount (₹)', type: 'number', placeholder: 'Lump sum to deposit, e.g. 300000', required: true, min: 10000 },
    { name: 'tenure', label: 'Annuity Period (Months)', type: 'select', required: true, options: ['36', '48', '60', '72', '84', '96', '108', '120'] },
    { name: 'payoutFrequency', label: 'Monthly Annuity Payout', type: 'select', required: true, options: ['Monthly – Fixed annuity payout'] },
    { name: 'autoRenew', label: 'After Tenure Ends', type: 'select', required: true, options: ['Renew for same period', 'Credit principal to savings', 'Convert to Fixed Deposit'] },
    { name: 'nominationName', label: 'Nominee Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'nominationRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
    { name: 'sourceOfFunds', label: 'Source of Funds', type: 'select', required: true, options: ['Retirement Corpus', 'Savings', 'Sale of Property / Asset', 'Inheritance', 'Other'] },
  ],
  'Senior Citizen FD': [
    { name: 'amount', label: 'FD Principal Amount (₹)', type: 'number', placeholder: 'e.g. 100000', required: true, min: 1000 },
    { name: 'tenure', label: 'FD Tenure (Months)', type: 'select', required: true, options: ['6', '12', '18', '24', '36', '48', '60', '84', '120'] },
    { name: 'payoutFrequency', label: 'Interest Payout Option', type: 'select', required: true, options: ['Quarterly Payout (Recommended)', 'Monthly Payout', 'Cumulative (At Maturity)', 'Half-Yearly Payout'] },
    { name: 'applicantAge', label: "Applicant's Age (Years)", type: 'number', placeholder: 'Must be 60 or above', required: true, min: 60, max: 100 },
    { name: 'autoRenew', label: 'Auto-Renew on Maturity?', type: 'select', required: true, options: ['Yes – Roll over automatically', 'No – Credit to savings account'] },
    { name: 'nominationName', label: 'Nominee Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'nominationRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
    { name: 'sourceOfFunds', label: 'Source of Funds', type: 'select', required: true, options: ['Retirement / Pension', 'Savings', 'Sale of Property', 'Inheritance', 'Other'] },
  ],
  'NRE/NRO Deposit': [
    { name: 'nriAccountType', label: 'Account Type', type: 'select', required: true, options: ['NRE (Non-Resident External – Tax-free, Repatriable)', 'NRO (Non-Resident Ordinary – Taxable, Restricted Repatriation)'] },
    { name: 'amount', label: 'Deposit Amount (₹ equivalent)', type: 'number', placeholder: 'e.g. 500000', required: true, min: 10000 },
    { name: 'tenure', label: 'Deposit Tenure (Months)', type: 'select', required: true, options: ['12', '18', '24', '36', '48', '60', '84', '120'] },
    { name: 'currency', label: 'Remittance Currency', type: 'select', required: true, options: ['USD (US Dollar)', 'GBP (British Pound)', 'EUR (Euro)', 'AED (UAE Dirham)', 'SGD (Singapore Dollar)', 'AUD (Australian Dollar)', 'CAD (Canadian Dollar)', 'Other'] },
    { name: 'payoutFrequency', label: 'Interest Payout Option', type: 'select', required: true, options: ['Cumulative (At Maturity)', 'Quarterly Payout', 'Half-Yearly Payout'] },
    { name: 'residenceCountry', label: 'Country of Residence', type: 'text', placeholder: 'e.g. United States', required: true },
    { name: 'autoRenew', label: 'Auto-Renew on Maturity?', type: 'select', required: true, options: ['Yes', 'No – Credit to NRE/NRO savings'] },
    { name: 'nominationName', label: 'Nominee Full Name (Indian Resident)', type: 'text', placeholder: 'Full name', required: true },
    { name: 'nominationRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
  ],
});

// ─── Category-level fallback configs ─────────────────────────────────────────
const FIELD_CONFIGS = {
  loans: [
    { name: 'loanAmount', label: 'Loan Amount Requested (₹)', type: 'number', placeholder: 'e.g. 500000', required: true, min: 10000 },
    { name: 'loanPurpose', label: 'Loan Purpose', type: 'select', required: true, wide: true, options: ['Home Purchase / Construction', 'Education', 'Business Expansion', 'Vehicle Purchase', 'Medical Emergency', 'Debt Consolidation', 'Personal Needs', 'Other'] },
    { name: 'employmentType', label: 'Employment Type', type: 'select', required: true, options: _emp },
    { name: 'monthlyIncome', label: 'Gross Monthly Income (₹)', type: 'number', placeholder: 'e.g. 80000', required: true, min: 5000 },
    { name: 'tenure', label: 'Requested Tenure (Years)', type: 'select', required: true, options: _tenureMid },
    { name: 'existingEmi', label: 'Total Existing EMI Obligations (₹/month)', type: 'number', placeholder: '0 if none', required: false },
    { name: 'collateralValue', label: 'Collateral / Property Value (₹)', type: 'number', placeholder: 'Leave 0 if unsecured', required: false },
    { name: 'creditScore', label: 'Self-Declared CIBIL Score', type: 'select', required: true, options: _cibil },
  ],
  deposits: [
    { name: 'amount', label: 'Deposit Amount (₹)', type: 'number', placeholder: 'e.g. 50000', required: true, min: 1000 },
    { name: 'tenure', label: 'Tenure (Months)', type: 'number', placeholder: 'e.g. 12', required: true, min: 1, max: 120 },
    { name: 'payoutFrequency', label: 'Interest Payout Frequency', type: 'select', required: true, options: ['Monthly', 'Quarterly', 'Half-Yearly', 'At Maturity'] },
    { name: 'nominationName', label: 'Nominee Full Name', type: 'text', placeholder: 'Nominee full name', required: true },
    { name: 'nominationRelation', label: 'Nominee Relation', type: 'select', required: true, options: _relation },
    { name: 'autoRenew', label: 'Auto-Renew on Maturity?', type: 'select', required: true, options: ['Yes', 'No'] },
    { name: 'sourceOfFunds', label: 'Source of Funds', type: 'select', required: true, options: ['Salary / Employment Income', 'Business Income', 'Savings', 'Sale of Asset', 'Inheritance / Gift', 'Other'] },
  ],
  investments: [
    { name: 'investmentMode', label: 'Investment Mode', type: 'select', required: true, options: ['SIP (Monthly)', 'Lumpsum', 'Both'] },
    { name: 'amount', label: 'Investment Amount (₹)', type: 'number', placeholder: 'e.g. 5000', required: true, min: 500 },
    { name: 'investmentGoal', label: 'Investment Goal', type: 'select', required: true, wide: true, options: _goal },
    { name: 'riskProfile', label: 'Risk Appetite', type: 'select', required: true, options: _risk },
    { name: 'investmentHorizon', label: 'Investment Horizon', type: 'select', required: true, options: _horizon },
    { name: 'annualIncome', label: 'Annual Income (₹)', type: 'number', placeholder: 'e.g. 1200000', required: true, min: 100000 },
    { name: 'demat', label: 'Do you have a Demat Account?', type: 'select', required: true, options: ['Yes', 'No — I want one opened'] },
  ],
  insurance: [
    { name: 'sumAssured', label: 'Sum Assured / Coverage (₹)', type: 'number', placeholder: 'e.g. 2500000', required: true, min: 100000 },
    { name: 'policyTerm', label: 'Policy Term (Years)', type: 'select', required: true, options: _tenureLong },
    { name: 'premiumFrequency', label: 'Premium Payment Frequency', type: 'select', required: true, options: _premFreq },
    { name: 'annualIncome', label: 'Annual Income (₹)', type: 'number', placeholder: 'e.g. 800000', required: true, min: 100000 },
    { name: 'smokingStatus', label: 'Smoking Status', type: 'select', required: true, options: ['Non-Smoker', 'Smoker (less than 10/day)', 'Smoker (10+ per day)'] },
    { name: 'existingPolicy', label: 'Existing Life Insurance?', type: 'select', required: false, options: ['None', '1 policy', '2+ policies'] },
    { name: 'beneficiaryName', label: 'Primary Beneficiary Full Name', type: 'text', placeholder: 'Full name', required: true },
    { name: 'beneficiaryRelation', label: 'Beneficiary Relation', type: 'select', required: true, options: _relation },
  ],
  cards: [
    { name: 'annualIncome', label: 'Annual Income (₹)', type: 'number', placeholder: 'e.g. 1500000', required: true, min: 100000 },
    { name: 'employmentType', label: 'Employment Type', type: 'select', required: true, options: ['Salaried (Private)', 'Salaried (Government)', 'Self-Employed', 'Business Owner', 'Student', 'Other'] },
    { name: 'monthlyExpenses', label: 'Expected Monthly Card Spend (₹)', type: 'number', placeholder: 'e.g. 25000', required: true, min: 1000 },
    { name: 'cardUsage', label: 'Primary Card Usage', type: 'select', required: true, options: ['Online Shopping', 'Travel & Hotels', 'Dining & Entertainment', 'Fuel', 'Bill Payments', 'General Use'] },
    { name: 'existingCards', label: 'Existing Credit Cards', type: 'select', required: true, options: ['None', '1 card', '2 cards', '3 or more'] },
    { name: 'creditScore', label: 'Self-Declared CIBIL Score', type: 'select', required: true, options: _cibil },
    { name: 'residenceType', label: 'Residence Type', type: 'select', required: true, options: ['Own (Fully Paid)', 'Own (On Loan)', 'Rented', 'With Family'] },
  ],
};

const CATEGORY_TITLES = {
  loans: 'Loan Application',
  deposits: 'Deposit Opening Application',
  investments: 'Investment Application',
  insurance: 'Insurance Application',
  cards: 'Card Application',
};

export default function ApplicationFormModal({ open, onClose, onSubmit, category, productTitle, productIcon, productSubtitle }) {
  const fields = PRODUCT_FIELD_CONFIGS[productTitle] || FIELD_CONFIGS[category] || [];
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  if (!open) return null;

  const handleChange = (name, value) => {
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const validate = () => {
    const errs = {};
    fields.forEach(f => {
      if (f.required && !formData[f.name]?.toString().trim()) {
        errs[f.name] = `${f.label} is required.`;
      }
      if (f.type === 'number' && formData[f.name] !== undefined && formData[f.name] !== '') {
        const v = Number(formData[f.name]);
        if (isNaN(v)) { errs[f.name] = 'Please enter a valid number.'; return; }
        if (f.min !== undefined && v < f.min) errs[f.name] = `Minimum value is ₹${Number(f.min).toLocaleString('en-IN')}.`;
        if (f.max !== undefined && v > f.max) errs[f.name] = `Maximum value is ${f.max}.`;
      }
      if (f.type === 'date' && f.minAge !== undefined && formData[f.name]) {
        const dob = new Date(formData[f.name]);
        if (isNaN(dob.getTime())) {
          errs[f.name] = 'Please enter a valid date.';
        } else {
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const dm = today.getMonth() - dob.getMonth();
          if (dm < 0 || (dm === 0 && today.getDate() < dob.getDate())) age--;
          if (dob > today) errs[f.name] = 'Date of birth cannot be in the future.';
          else if (age < f.minAge) errs[f.name] = `Applicant must be at least ${f.minAge} years old to apply.`;
          else if (f.maxAge !== undefined && age > f.maxAge) errs[f.name] = `Applicant must be ${f.maxAge} years or younger to apply.`;
        }
      }
    });
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit(formData);
    setFormData({});
    setErrors({});
  };

  const inputStyle = {
    padding: '0.5rem 0.7rem', borderRadius: '7px', border: '1px solid var(--line)',
    fontSize: '0.88rem', background: 'var(--panel)', fontFamily: 'inherit',
    width: '100%', boxSizing: 'border-box', color: 'var(--text)',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}
        style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '2.2rem', flexShrink: 0 }}>{productIcon || '📋'}</span>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.15rem' }}>
              {CATEGORY_TITLES[category] || 'Application Form'}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{productTitle}</h3>
            {productSubtitle && <p style={{ margin: '0.15rem 0 0', color: 'var(--muted)', fontSize: '0.82rem' }}>{productSubtitle}</p>}
          </div>
        </div>

        <div style={{ background: 'var(--primary-tint, #eff6ff)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '0.55rem 0.85rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--primary)' }}>
          📋 Please complete the application form below. Fields marked <span style={{ color: '#dc2626' }}>*</span> are required.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {fields.map(f => (
            <label key={f.name}
              style={{
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
                fontSize: '0.83rem', fontWeight: 500,
                gridColumn: f.wide ? '1 / -1' : undefined,
              }}>
              <span>
                {f.label}
                {f.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
              </span>
              {f.type === 'select' ? (
                <select value={formData[f.name] || ''} onChange={e => handleChange(f.name, e.target.value)}
                  style={{ ...inputStyle, borderColor: errors[f.name] ? '#dc2626' : undefined }}>
                  <option value="">— Select —</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'number' ? (
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={f.placeholder}
                  maxLength={f.max !== undefined ? String(Math.floor(f.max)).length : 10}
                  value={formData[f.name] || ''}
                  onChange={e => handleChange(f.name, e.target.value.replace(/\D/g, ''))}
                  style={{ ...inputStyle, borderColor: errors[f.name] ? '#dc2626' : undefined }}
                />
              ) : f.name === 'agesOfMembers' ? (
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={f.placeholder}
                  maxLength={30}
                  value={formData[f.name] || ''}
                  onChange={e => handleChange(f.name, e.target.value.replace(/[^0-9, ]/g, ''))}
                  style={{ ...inputStyle, borderColor: errors[f.name] ? '#dc2626' : undefined }}
                />
              ) : f.type === 'date' ? (
                <input
                  type="date"
                  value={formData[f.name] || ''}
                  onChange={e => handleChange(f.name, e.target.value)}
                  style={{ ...inputStyle, borderColor: errors[f.name] ? '#dc2626' : undefined }}
                />
              ) : (
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={formData[f.name] || ''}
                  onChange={e => handleChange(f.name, e.target.value)}
                  min={f.type === 'date' && f.maxAge !== undefined
                    ? new Date(new Date().setFullYear(new Date().getFullYear() - f.maxAge)).toISOString().split('T')[0]
                    : undefined}
                  max={f.type === 'date' && f.minAge !== undefined
                    ? new Date(new Date().setFullYear(new Date().getFullYear() - f.minAge)).toISOString().split('T')[0]
                    : undefined}
                  style={{ ...inputStyle, borderColor: errors[f.name] ? '#dc2626' : undefined }}
                />
              )}
              {errors[f.name] && (
                <span style={{ color: '#dc2626', fontSize: '0.73rem', marginTop: '0.1rem' }}>{errors[f.name]}</span>
              )}
            </label>
          ))}
        </div>

        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '1rem', lineHeight: 1.55, borderTop: '1px solid var(--line)', paddingTop: '0.75rem' }}>
          By submitting this application you confirm that all provided information is accurate and authorize Nova Bank
          to verify your details. Applications are subject to bank's eligibility criteria and approval is not guaranteed.
        </p>

        <div className="modal-actions" style={{ marginTop: '0.75rem' }}>
          <button className="button button--secondary" onClick={() => { onClose(); setFormData({}); setErrors({}); }}>Cancel</button>
          <button className="button button--primary" onClick={handleSubmit}>Submit Application →</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Governed catalog seed batch 3 — Top-200 gaps + common generics/combos (ClinCalc 2023 MEPS).
 * Run: node scripts/generateMedCatalogBatch3.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'src', 'data', 'medCatalog.batch3.json');

const SN =
  'Reclaim MedicationKnowledge V1 batch 3 seed; high-volume outpatient generics and common combination products for educational context in-app.';
const SAFETY = 'Educational only. Not medical advice. Discuss changes with your clinician.';
const WYM = [
  'Effects vary widely between individuals and formulations.',
  'Timing can influence fatigue, sleep quality, and same-day alertness.',
];

function entry({
  id,
  genericName,
  brandNames = [],
  matchAliases = [],
  category,
  medicationClass,
  mechanism,
  plainEnglishMechanism,
  commonUses,
  confidence = 0.74,
  effectTags,
  stateImpactTags,
}) {
  return {
    id,
    genericName,
    brandNames,
    ...(matchAliases.length ? { matchAliases } : {}),
    category,
    medicationClass,
    activeIngredients: [genericName],
    mechanism,
    ...(plainEnglishMechanism ? { plainEnglishMechanism } : {}),
    ...(commonUses ? { commonUses } : {}),
    whatYouMightNotice: WYM,
    confidence,
    safetyNote: SAFETY,
    sourceNote: SN,
    effectTags,
    stateImpactTags,
  };
}

/** id, genericName, brands[], aliases[], category, class, mechanism, conf, effectTags, stateImpactTags, plain?, uses? */
const DEFS = [
  // Statins / lipids (Top 200 gaps)
  ['atorvastatin', 'Atorvastatin', ['Lipitor'], ['Atorvastatin calcium'], 'statin', 'HMG-CoA reductase inhibitor (statin)', 'Lowers LDL cholesterol production in the liver; often used in cardiovascular risk plans.', 0.8, ['fatigue_relevant', 'pain_masking_relevant'], ['fatigue_context', 'recovery_interpretation'], 'Common cholesterol-lowering statin.', ['Cholesterol management contexts']],
  ['rosuvastatin', 'Rosuvastatin', ['Crestor'], ['Rosuvastatin calcium'], 'statin', 'Statin', 'Potent LDL-lowering statin used in several lipid-management plans.', 0.79, ['fatigue_relevant'], ['fatigue_context', 'recovery_interpretation'], null, null],
  ['simvastatin', 'Simvastatin', ['Zocor'], [], 'statin', 'Statin', 'Evening-dosing statin tradition in some plans; muscle soreness context discussed in labeling.', 0.78, ['fatigue_relevant', 'pain_masking_relevant'], ['fatigue_context', 'pain_perception'], null, null],
  ['pravastatin', 'Pravastatin', ['Pravachol'], [], 'statin', 'Statin', 'Hydrophilic statin with somewhat different interaction profile than some other statins.', 0.77, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['lovastatin', 'Lovastatin', ['Mevacor', 'Altoprev'], [], 'statin', 'Statin', 'Older statin class member still used in some lipid plans.', 0.75, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['pitavastatin', 'Pitavastatin', ['Livalo'], [], 'statin', 'Statin', 'Statin option selected when metabolic interaction concerns matter in clinical planning.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['fluvastatin', 'Fluvastatin', ['Lescol'], [], 'statin', 'Statin', 'Statin used for LDL lowering in several maintenance plans.', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['ezetimibe', 'Ezetimibe', ['Zetia'], [], 'lipid_lowering', 'Cholesterol absorption inhibitor', 'Blocks intestinal cholesterol absorption; often combined with statins in lipid plans.', 0.76, ['fatigue_relevant'], ['recovery_interpretation'], null, null],
  ['fenofibrate', 'Fenofibrate', ['Tricor', 'Fenoglide'], [], 'lipid_lowering', 'Fibrate', 'Lowers triglycerides and affects HDL pathways in selected lipid plans.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],

  // Diabetes / metabolic (Top 200 + GLP-1 growth)
  ['semaglutide', 'Semaglutide', ['Ozempic', 'Wegovy', 'Rybelsus'], [], 'glp1_agonist', 'GLP-1 receptor agonist', 'Mimics incretin signaling; appetite and nausea context may influence daily energy patterns.', 0.76, ['appetite_relevant', 'fatigue_relevant'], ['appetite_context', 'fatigue_context'], 'GLP-1 class medication used for glucose and weight-related plans.', ['Type 2 diabetes', 'Weight-management contexts']],
  ['tirzepatide', 'Tirzepatide', ['Mounjaro', 'Zepbound'], [], 'glp1_agonist', 'GLP-1 / GIP agonist', 'Dual incretin pathway effects; GI side-effect context common early in therapy.', 0.75, ['appetite_relevant', 'fatigue_relevant'], ['appetite_context', 'fatigue_context'], null, null],
  ['dulaglutide', 'Dulaglutide', ['Trulicity'], [], 'glp1_agonist', 'GLP-1 receptor agonist', 'Weekly injectable GLP-1 therapy for glucose management plans.', 0.76, ['appetite_relevant', 'fatigue_relevant'], ['appetite_context', 'fatigue_context'], null, null],
  ['liraglutide', 'Liraglutide', ['Victoza', 'Saxenda'], [], 'glp1_agonist', 'GLP-1 receptor agonist', 'Daily GLP-1 option with appetite and nausea overlap for some users.', 0.75, ['appetite_relevant', 'fatigue_relevant'], ['appetite_context', 'fatigue_context'], null, null],
  ['exenatide', 'Exenatide', ['Byetta', 'Bydureon'], [], 'glp1_agonist', 'GLP-1 receptor agonist', 'Earlier GLP-1 class member with meal-timing context in some formulations.', 0.73, ['appetite_relevant', 'fatigue_relevant'], ['appetite_context', 'fatigue_context'], null, null],
  ['empagliflozin', 'Empagliflozin', ['Jardiance'], [], 'sglt2_inhibitor', 'SGLT2 inhibitor', 'Increases urinary glucose excretion; hydration and infection-context discussions exist in labeling.', 0.77, ['hydration_relevant', 'fatigue_relevant'], ['hydration_context', 'fatigue_context'], null, null],
  ['dapagliflozin', 'Dapagliflozin', ['Farxiga'], [], 'sglt2_inhibitor', 'SGLT2 inhibitor', 'SGLT2 class glucose lowering with fluid-balance context for some users.', 0.77, ['hydration_relevant', 'fatigue_relevant'], ['hydration_context', 'fatigue_context'], null, null],
  ['sitagliptin', 'Sitagliptin', ['Januvia'], [], 'dpp4_inhibitor', 'DPP-4 inhibitor', 'Enhances incretin effects without direct GLP-1 injection; generally low hypoglycemia risk alone.', 0.76, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['glipizide', 'Glipizide', ['Glucotrol'], [], 'diabetes_medication', 'Sulfonylurea', 'Stimulates insulin release; hypoglycemia sensation context may matter for energy interpretation.', 0.75, ['fatigue_relevant', 'appetite_relevant'], ['fatigue_context', 'appetite_context'], null, null],
  ['glimepiride', 'Glimepiride', ['Amaryl'], [], 'diabetes_medication', 'Sulfonylurea', 'Longer-acting sulfonylurea used in type 2 diabetes plans.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['glyburide', 'Glyburide', ['Diabeta', 'Glynase'], [], 'diabetes_medication', 'Sulfonylurea', 'Older sulfonylurea with hypoglycemia-risk context in labeling.', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['pioglitazone', 'Pioglitazone', ['Actos'], [], 'diabetes_medication', 'Thiazolidinedione', 'Improves insulin sensitivity; fluid retention context discussed in clinical labeling.', 0.74, ['fatigue_relevant', 'appetite_relevant'], ['fatigue_context', 'appetite_context'], null, null],
  ['insulin_lispro', 'Insulin lispro', ['Humalog', 'Admelog'], [], 'diabetes_medication', 'Rapid-acting insulin', 'Meal-time insulin with glucose swing context for same-day energy interpretation.', 0.75, ['fatigue_relevant', 'training_readiness_relevant'], ['fatigue_context', 'training_readiness'], null, null],
  ['insulin_aspart', 'Insulin aspart', ['NovoLog', 'Fiasp'], [], 'diabetes_medication', 'Rapid-acting insulin', 'Rapid insulin analog used around meals in several diabetes plans.', 0.75, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['insulin_degludec', 'Insulin degludec', ['Tresiba'], [], 'diabetes_medication', 'Ultra-long basal insulin', 'Very long basal insulin profile for glucose stability contexts.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['insulin_detemir', 'Insulin detemir', ['Levemir'], [], 'diabetes_medication', 'Long-acting insulin', 'Intermediate-long basal insulin used in individualized diabetes plans.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],

  // Cardiovascular additions
  ['clopidogrel', 'Clopidogrel', ['Plavix'], [], 'antiplatelet', 'P2Y12 inhibitor antiplatelet', 'Reduces platelet aggregation in cardiovascular prevention plans.', 0.77, ['fatigue_relevant'], ['recovery_interpretation'], null, null],
  ['telmisartan', 'Telmisartan', ['Micardis'], [], 'arb', 'ARB', 'Angiotensin receptor blocker for blood pressure management.', 0.78, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['hydralazine', 'Hydralazine', ['Apresoline'], [], 'cardiovascular', 'Vasodilator', 'Direct vasodilation used in selected hypertension and heart-failure adjunct plans.', 0.72, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['isosorbide', 'Isosorbide mononitrate', ['Imdur', 'Monoket'], ['Isosorbide'], 'cardiovascular', 'Nitrate', 'Vasodilator used for angina symptom patterns; headache context possible.', 0.73, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['nitroglycerin', 'Nitroglycerin', ['Nitrostat', 'Nitro-Dur'], [], 'cardiovascular', 'Nitrate', 'Short-acting nitrate for angina symptom relief contexts.', 0.74, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['torsemide', 'Torsemide', ['Demadex'], [], 'loop_diuretic', 'Loop diuretic', 'Loop diuretic alternative to furosemide in some fluid-balance plans.', 0.74, ['hydration_relevant', 'fatigue_relevant'], ['hydration_context', 'fatigue_context'], null, null],
  ['doxazosin', 'Doxazosin', ['Cardura'], [], 'alpha_blocker', 'Alpha-1 blocker', 'Blood pressure and urinary symptom contexts depending on clinical plan.', 0.73, ['heart_rate_relevant', 'sedation_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['tamsulosin', 'Tamsulosin', ['Flomax'], [], 'alpha_blocker', 'Alpha-1 blocker', 'Often used for urinary flow symptom patterns; dizziness context possible.', 0.76, ['sedation_relevant', 'fatigue_relevant'], ['fatigue_context'], null, null],
  ['finasteride', 'Finasteride', ['Proscar', 'Propecia'], [], 'urology', '5-alpha reductase inhibitor', 'Hormone-pathway modulation for prostate and hair-loss related plans.', 0.74, ['mood_relevant', 'fatigue_relevant'], ['mood_context', 'fatigue_context'], null, null],

  // Gout / bone / bladder
  ['allopurinol', 'Allopurinol', ['Zyloprim'], [], 'gout_therapy', 'Xanthine oxidase inhibitor', 'Lowers uric acid production in gout prevention plans.', 0.76, ['pain_masking_relevant', 'fatigue_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['alendronate', 'Alendronate', ['Fosamax'], [], 'osteoporosis_therapy', 'Bisphosphonate', 'Slows bone resorption in osteoporosis prevention plans.', 0.74, ['pain_masking_relevant', 'fatigue_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['oxybutynin', 'Oxybutynin', ['Ditropan'], [], 'bladder_therapy', 'Anticholinergic bladder agent', 'Reduces bladder spasms; dry mouth and sedation context possible.', 0.73, ['sedation_relevant', 'fatigue_relevant'], ['fatigue_context'], null, null],

  // Supplements / electrolytes
  ['potassium_chloride', 'Potassium chloride', ['Klor-Con', 'Micro-K'], ['Potassium Chloride'], 'electrolyte_supplement', 'Potassium supplement', 'Electrolyte replacement context; muscle cramp and fatigue sensation may relate indirectly.', 0.72, ['hydration_relevant', 'fatigue_relevant'], ['hydration_context', 'fatigue_context'], null, null],
  ['ergocalciferol', 'Ergocalciferol', ['Drisdol'], ['Vitamin D2'], 'vitamin_supplement', 'Vitamin D', 'Vitamin D2 supplementation for deficiency-related plans.', 0.74, ['fatigue_relevant', 'mood_relevant'], ['fatigue_context', 'mood_context'], null, null],
  ['cholecalciferol', 'Cholecalciferol', [], ['Vitamin D3', 'Vitamin D'], 'vitamin_supplement', 'Vitamin D', 'Common over-the-counter vitamin D3 used for deficiency contexts.', 0.76, ['fatigue_relevant', 'mood_relevant'], ['fatigue_context', 'mood_context'], null, null],
  ['ferrous_sulfate', 'Ferrous sulfate', ['Feosol'], ['Iron', 'Ferrous Sulfate'], 'vitamin_supplement', 'Iron supplement', 'Iron replacement; GI upset and fatigue improvement timelines vary.', 0.75, ['fatigue_relevant', 'appetite_relevant'], ['fatigue_context', 'appetite_context'], null, null],
  ['folic_acid', 'Folic acid', [], ['Folate'], 'vitamin_supplement', 'B vitamin', 'Folate supplementation in deficiency and pregnancy-related contexts.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['cyanocobalamin', 'Cyanocobalamin', [], ['Vitamin B12', 'B12'], 'vitamin_supplement', 'Vitamin B12', 'B12 supplementation; energy interpretation may shift as deficiency corrects.', 0.75, ['fatigue_relevant', 'mood_relevant'], ['fatigue_context', 'mood_context'], null, null],
  ['calcium_supplement', 'Calcium', ['Caltrate', 'Citracal'], ['Calcium citrate'], 'vitamin_supplement', 'Mineral supplement', 'Calcium supplementation for bone-health contexts (distinct from antacid calcium carbonate products).', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['magnesium_supplement', 'Magnesium', ['Mag-Ox', 'Slow-Mag'], ['Magnesium oxide', 'Magnesium Salts'], 'vitamin_supplement', 'Mineral supplement', 'Magnesium used for deficiency, leg cramps, or bowel regularity depending on formulation.', 0.72, ['fatigue_relevant', 'hydration_relevant'], ['fatigue_context', 'hydration_context'], null, null],

  // Neurology / psych additions
  ['levetiracetam', 'Levetiracetam', ['Keppra'], [], 'anticonvulsant', 'Anticonvulsant', 'Seizure medication with mood and irritability context discussed for some users.', 0.74, ['mood_relevant', 'fatigue_relevant'], ['mood_context', 'fatigue_context'], null, null],
  ['phenytoin', 'Phenytoin', ['Dilantin'], [], 'anticonvulsant', 'Anticonvulsant', 'Older seizure medication with sedation and gum-related labeling discussions.', 0.72, ['sedation_relevant', 'fatigue_relevant'], ['fatigue_context', 'mood_context'], null, null],
  ['levodopa_carbidopa', 'Levodopa', ['Sinemet'], ['Levodopa carbidopa', 'Carbidopa levodopa'], 'neurology_adjunct', 'Dopamine precursor (with decarboxylase inhibitor)', 'Parkinson-related movement plans; on/off motor fluctuations may influence daily activity interpretation.', 0.73, ['fatigue_relevant', 'mood_relevant'], ['fatigue_context', 'mood_context'], null, null],
  ['donepezil', 'Donepezil', ['Aricept'], [], 'dementia_therapy', 'Cholinesterase inhibitor', 'Used in Alzheimer-related cognitive support plans; GI side effects possible.', 0.74, ['fatigue_relevant', 'sleep_relevant'], ['fatigue_context', 'sleep_interpretation'], null, null],
  ['memantine', 'Memantine', ['Namenda'], [], 'dementia_therapy', 'NMDA antagonist', 'Used in moderate Alzheimer-related plans alongside other therapies.', 0.73, ['fatigue_relevant', 'mood_relevant'], ['fatigue_context', 'mood_context'], null, null],

  // Immunomodulators / steroids
  ['methotrexate', 'Methotrexate', ['Trexall', 'Rasuvo'], [], 'immunomodulator', 'Immunomodulator', 'Used in rheumatoid arthritis and other immune-mediated plans; fatigue context common.', 0.72, ['fatigue_relevant', 'pain_masking_relevant'], ['fatigue_context', 'pain_perception'], null, null],
  ['hydroxychloroquine', 'Hydroxychloroquine', ['Plaquenil'], [], 'immunomodulator', 'Antimalarial immunomodulator', 'Used in lupus and rheumatoid contexts; eye monitoring context in long-term plans.', 0.73, ['fatigue_relevant', 'pain_masking_relevant'], ['fatigue_context', 'pain_perception'], null, null],
  ['cyclosporine', 'Cyclosporine', ['Neoral', 'Sandimmune'], [], 'immunomodulator', 'Calcineurin inhibitor', 'Immune suppression in transplant and selected autoimmune plans.', 0.71, ['fatigue_relevant'], ['fatigue_context', 'recovery_interpretation'], null, null],
  ['triamcinolone', 'Triamcinolone', ['Kenalog'], [], 'corticosteroid_systemic', 'Corticosteroid', 'Injectable or systemic steroid bursts for inflammatory symptom patterns.', 0.72, ['mood_relevant', 'sleep_relevant', 'fatigue_relevant'], ['mood_context', 'sleep_interpretation', 'fatigue_context'], null, null],
  ['prednisolone', 'Prednisolone', ['Prelone', 'Orapred'], [], 'corticosteroid_systemic', 'Corticosteroid', 'Liquid or oral steroid used in several short-course inflammatory plans.', 0.72, ['mood_relevant', 'sleep_relevant', 'fatigue_relevant'], ['mood_context', 'sleep_interpretation', 'fatigue_context'], null, null],
  ['hydrocortisone', 'Hydrocortisone', ['Cortef'], [], 'corticosteroid_systemic', 'Corticosteroid', 'Physiologic and anti-inflammatory steroid used in adrenal and inflammatory contexts.', 0.72, ['mood_relevant', 'fatigue_relevant'], ['mood_context', 'fatigue_context'], null, null],
  ['clobetasol', 'Clobetasol', ['Temovate'], [], 'topical_corticosteroid', 'High-potency topical corticosteroid', 'Topical anti-inflammatory for selected dermatitis plans.', 0.7, ['fatigue_relevant'], ['fatigue_context'], null, null],

  // Hormones
  ['estradiol', 'Estradiol', ['Estrace', 'Climara', 'Vivelle-Dot'], [], 'hormone_therapy', 'Estrogen', 'Estrogen therapy contexts include menopause symptom patterns and mood variability discussions.', 0.74, ['mood_relevant', 'sleep_relevant', 'fatigue_relevant'], ['mood_context', 'sleep_interpretation', 'fatigue_context'], null, null],
  ['progesterone', 'Progesterone', ['Prometrium'], [], 'hormone_therapy', 'Progestin / progesterone', 'Used in hormone replacement and menstrual regulation contexts.', 0.73, ['mood_relevant', 'sleep_relevant', 'sedation_relevant'], ['mood_context', 'sleep_interpretation'], null, null],
  ['norethindrone', 'Norethindrone', ['Aygestin', 'Camila'], [], 'hormone_therapy', 'Progestin', 'Progestin used in contraception and menstrual regulation plans.', 0.72, ['mood_relevant', 'fatigue_relevant'], ['mood_context', 'fatigue_context'], null, null],
  ['testosterone', 'Testosterone', ['AndroGel', 'Testim'], ['Testosterone cypionate'], 'hormone_therapy', 'Androgen', 'Replacement or supplementation contexts; mood and energy interpretation may shift over time.', 0.73, ['mood_relevant', 'fatigue_relevant', 'training_readiness_relevant'], ['mood_context', 'fatigue_context', 'training_readiness'], null, null],
  ['anastrozole', 'Anastrozole', ['Arimidex'], [], 'hormone_therapy', 'Aromatase inhibitor', 'Estrogen-pathway modulation in breast cancer-related hormone plans.', 0.71, ['fatigue_relevant', 'mood_relevant', 'pain_masking_relevant'], ['fatigue_context', 'mood_context', 'pain_perception'], null, null],

  // Ophthalmic
  ['latanoprost', 'Latanoprost', ['Xalatan'], [], 'ophthalmic', 'Prostaglandin eye drop', 'Lowers intraocular pressure in glaucoma plans; generally minimal systemic energy effects.', 0.72, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['timolol', 'Timolol', ['Timoptic'], [], 'ophthalmic', 'Beta blocker eye drop', 'Topical beta blockade for glaucoma; systemic beta-blocker overlap possible in sensitive users.', 0.72, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],

  // Respiratory / cough
  ['benzonatate', 'Benzonatate', ['Tessalon'], [], 'cold_symptom_relief', 'Antitussive', 'Numbs stretch receptors to reduce cough reflex; sedation possible.', 0.73, ['sedation_relevant', 'fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],

  // GI additions
  ['docusate', 'Docusate', ['Colace'], ['Docusate sodium'], 'laxative', 'Stool softener', 'Softens stools for constipation comfort; minimal direct energy effects.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['linaclotide', 'Linaclotide', ['Linzess'], [], 'laxative', 'Guanylate cyclase-C agonist', 'Used for constipation-predominant bowel symptom patterns.', 0.72, ['fatigue_relevant', 'pain_masking_relevant'], ['fatigue_context', 'pain_perception'], null, null],

  // Anti-infective additions
  ['cefdinir', 'Cefdinir', ['Omnicef'], [], 'antibiotic', 'Cephalosporin antibiotic', 'Third-generation cephalosporin for susceptible infections.', 0.75, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['levofloxacin', 'Levofloxacin', ['Levaquin'], [], 'antibiotic', 'Fluoroquinolone antibiotic', 'Broad-spectrum antibiotic with tendon and nervous-system labeling discussions.', 0.72, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['ofloxacin', 'Ofloxacin', ['Floxin'], [], 'antibiotic', 'Fluoroquinolone antibiotic', 'Fluoroquinolone used for urinary and other susceptible infections.', 0.71, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['penicillin_vk', 'Penicillin V', ['Veetids'], ['Penicillin VK', 'Penicillin'], 'antibiotic', 'Penicillin antibiotic', 'Classic penicillin used for streptococcal and other susceptible infections.', 0.74, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['mupirocin', 'Mupirocin', ['Bactroban'], [], 'antibiotic', 'Topical antibiotic', 'Topical antibacterial for impetigo and localized skin infections.', 0.73, ['fatigue_relevant'], ['illness_context'], null, null],
  ['fluconazole', 'Fluconazole', ['Diflucan'], [], 'antifungal', 'Azole antifungal', 'Systemic and oral antifungal for yeast and other fungal contexts.', 0.75, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['ketoconazole', 'Ketoconazole', ['Nizoral'], [], 'antifungal', 'Azole antifungal', 'Antifungal with topical and systemic forms depending on plan.', 0.72, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],

  // Vestibular / weight / PDE5
  ['meclizine', 'Meclizine', ['Antivert', 'Bonine'], [], 'antiemetic', 'Antihistamine antiemetic', 'Used for vertigo and motion sickness; sedation common.', 0.74, ['sedation_relevant', 'fatigue_relevant'], ['fatigue_context'], null, null],
  ['phentermine', 'Phentermine', ['Adipex-P'], [], 'weight_management', 'Sympathomimetic appetite suppressant', 'Short-term weight-management contexts; activation and heart-rate sensation possible.', 0.7, ['activation_relevant', 'heart_rate_relevant', 'sleep_relevant'], ['heart_rate_interpretation', 'sleep_interpretation'], null, null],
  ['sildenafil', 'Sildenafil', ['Viagra', 'Revatio'], [], 'pde5_inhibitor', 'PDE-5 inhibitor', 'Vasodilator used in pulmonary hypertension and erectile dysfunction contexts.', 0.74, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['tadalafil', 'Tadalafil', ['Cialis', 'Adcirca'], [], 'pde5_inhibitor', 'PDE-5 inhibitor', 'Longer-acting PDE-5 inhibitor with cardiovascular labeling contexts.', 0.74, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],

  // GI / IBD
  ['mesalamine', 'Mesalamine', ['Lialda', 'Asacol'], [], 'immunomodulator', 'Aminosalicylate', 'Anti-inflammatory bowel therapy for ulcerative colitis contexts.', 0.73, ['fatigue_relevant', 'pain_masking_relevant'], ['fatigue_context', 'pain_perception'], null, null],
  ['sulfasalazine', 'Sulfasalazine', ['Azulfidine'], [], 'immunomodulator', 'Aminosalicylate / DMARD', 'Used in inflammatory bowel and rheumatoid contexts.', 0.72, ['fatigue_relevant', 'pain_masking_relevant'], ['fatigue_context', 'pain_perception'], null, null],

  // Common combination products (separate rows; matchAliases for combo names)
  ['amoxicillin_clavulanate', 'Amoxicillin-clavulanate', ['Augmentin'], ['Amoxicillin clavulanate', 'Amoxicillin and clavulanate'], 'antibiotic', 'Penicillin + beta-lactamase inhibitor', 'Broadens amoxicillin coverage for resistant bacteria in selected infection plans.', 0.77, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['sulfamethoxazole_trimethoprim', 'Sulfamethoxazole-trimethoprim', ['Bactrim', 'Septra'], ['Sulfamethoxazole trimethoprim', 'SMZ-TMP'], 'antibiotic', 'Sulfonamide combination antibiotic', 'Common urinary and skin infection therapy when clinically selected.', 0.75, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['hydrocodone_acetaminophen', 'Hydrocodone-acetaminophen', ['Norco', 'Vicodin', 'Lortab'], ['Hydrocodone acetaminophen', 'Acetaminophen hydrocodone'], 'opioid_analgesic', 'Opioid combination analgesic', 'Combination pain product; sedation and acetaminophen daily-limit context matter in labeling.', 0.68, ['pain_masking_relevant', 'sedation_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['oxycodone_acetaminophen', 'Oxycodone-acetaminophen', ['Percocet', 'Endocet'], ['Oxycodone acetaminophen', 'Acetaminophen oxycodone'], 'opioid_analgesic', 'Opioid combination analgesic', 'Strong opioid plus acetaminophen in several acute pain plans.', 0.67, ['pain_masking_relevant', 'sedation_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['lisinopril_hydrochlorothiazide', 'Lisinopril-hydrochlorothiazide', ['Zestoretic', 'Prinzide'], ['Lisinopril HCTZ', 'Hydrochlorothiazide lisinopril'], 'ace_inhibitor', 'ACE inhibitor + thiazide combo', 'Single-tablet blood pressure therapy combining RAAS blockade and diuretic effects.', 0.76, ['heart_rate_relevant', 'hydration_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'hydration_context', 'fatigue_context'], null, null],
  ['losartan_hydrochlorothiazide', 'Losartan-hydrochlorothiazide', ['Hyzaar'], ['Hydrochlorothiazide losartan', 'Losartan HCTZ'], 'arb', 'ARB + thiazide combo', 'Combined angiotensin blockade and diuretic for hypertension plans.', 0.76, ['heart_rate_relevant', 'hydration_relevant'], ['heart_rate_interpretation', 'hydration_context'], null, null],
  ['amlodipine_benazepril', 'Amlodipine-benazepril', ['Lotrel'], ['Benazepril amlodipine'], 'calcium_channel_blocker', 'CCB + ACE inhibitor combo', 'Dual-mechanism blood pressure tablet used in several maintenance plans.', 0.75, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['sacubitril_valsartan', 'Sacubitril-valsartan', ['Entresto'], ['Sacubitril valsartan'], 'arb', 'ARNI (neprilysin inhibitor + ARB)', 'Heart-failure therapy combining neprilysin inhibition with angiotensin blockade.', 0.74, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['fluticasone_salmeterol', 'Fluticasone-salmeterol', ['Advair', 'Wixela'], ['Fluticasone salmeterol'], 'respiratory', 'Inhaled corticosteroid + LABA', 'Maintenance asthma/COPD inhaler combining anti-inflammatory and bronchodilator effects.', 0.77, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['budesonide_formoterol', 'Budesonide-formoterol', ['Symbicort'], ['Formoterol budesonide'], 'respiratory', 'Inhaled corticosteroid + LABA', 'Combination inhaler for maintenance airway symptom control.', 0.77, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
];

const rows = DEFS.map((d) => {
  const [
    id,
    genericName,
    brandNames,
    matchAliases,
    category,
    medicationClass,
    mechanism,
    confidence,
    effectTags,
    stateImpactTags,
    plainEnglishMechanism,
    commonUses,
  ] = d;
  return entry({
    id,
    genericName,
    brandNames,
    matchAliases,
    category,
    medicationClass,
    mechanism,
    plainEnglishMechanism: plainEnglishMechanism ?? undefined,
    commonUses: commonUses ?? undefined,
    confidence,
    effectTags,
    stateImpactTags,
  });
});

fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8');
console.log(`Wrote ${rows.length} entries to ${outPath}`);

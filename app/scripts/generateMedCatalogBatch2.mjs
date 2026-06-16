/**
 * Governed catalog seed batch 2 — pain, allergy/cold, GI, cardio, endocrine, infection, respiratory.
 * Run: node scripts/generateMedCatalogBatch2.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'src', 'data', 'medCatalog.batch2.json');

const SN =
  'Reclaim MedicationKnowledge V1 batch 2 seed; broader state-relevant medication overview for educational context in-app.';
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

/** Compact definitions: id, genericName, brands[], category, medicationClass, mechanism, conf, effectTags, stateImpactTags, plainEnglish?, commonUses? */
const DEFS = [
  // Pain / inflammation
  ['acetaminophen', 'Acetaminophen', ['Tylenol'], 'pain_analgesic', 'Analgesic / antipyretic', 'Reduces fever and pain signaling pathways in the brain; common ingredient in many over-the-counter products.', 0.82, ['pain_masking_relevant', 'fatigue_relevant'], ['pain_perception', 'illness_context'], 'Often used for aches and fever.', ['Pain or fever relief as labeled']],
  ['aspirin', 'Aspirin', ['Bayer'], 'pain_analgesic', 'Salicylate analgesic', 'Anti-inflammatory and platelet-related effects at low doses in some plans; may relate to bleeding-risk context.', 0.78, ['pain_masking_relevant', 'heart_rate_relevant'], ['pain_perception', 'heart_rate_interpretation'], 'Salicylate medication used for pain and certain preventive plans.', ['Pain relief', 'Some preventive cardiovascular contexts']],
  ['ibuprofen', 'Ibuprofen', ['Advil', 'Motrin'], 'nsaid', 'NSAID', 'Reduces inflammation mediators; may affect stomach comfort and kidney-fluid context for some users.', 0.82, ['pain_masking_relevant', 'fatigue_relevant'], ['pain_perception', 'recovery_interpretation'], 'Common NSAID for inflammatory-type pain.', ['Pain or inflammation symptoms']],
  ['naproxen', 'Naproxen', ['Aleve'], 'nsaid', 'NSAID', 'Longer-acting NSAID than ibuprofen for some users; GI and fluid-balance context may matter.', 0.81, ['pain_masking_relevant'], ['pain_perception', 'recovery_interpretation'], 'NSAID used for pain that lasts through the day for many users.', ['Pain relief']],
  ['ketoprofen', 'Ketoprofen', ['Orudis'], 'nsaid', 'NSAID', 'Anti-inflammatory analgesic available in topical or oral forms depending on region.', 0.76, ['pain_masking_relevant'], ['pain_perception'], null, null],
  ['indomethacin', 'Indomethacin', ['Indocin'], 'nsaid', 'NSAID', 'Strong anti-inflammatory profile; may cause dizziness or stomach upset context.', 0.74, ['pain_masking_relevant', 'fatigue_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['diclofenac', 'Diclofenac', ['Voltaren', 'Cataflam'], 'nsaid', 'NSAID', 'Available topical or oral; localized inflammation relief context when used topically.', 0.79, ['pain_masking_relevant'], ['pain_perception'], null, null],
  ['meloxicam', 'Meloxicam', ['Mobic'], 'nsaid', 'NSAID', 'Once-daily NSAID option for some inflammatory pain plans.', 0.78, ['pain_masking_relevant'], ['pain_perception'], null, null],
  ['celecoxib', 'Celecoxib', ['Celebrex'], 'nsaid', 'COX-2 selective NSAID', 'Targets inflammatory pathways with somewhat different stomach-effect profile than traditional NSAIDs for some users.', 0.76, ['pain_masking_relevant'], ['pain_perception'], null, null],
  ['etodolac', 'Etodolac', ['Lodine'], 'nsaid', 'NSAID', 'Anti-inflammatory analgesic used for joint-related pain plans.', 0.74, ['pain_masking_relevant'], ['pain_perception'], null, null],
  ['piroxicam', 'Piroxicam', ['Feldene'], 'nsaid', 'NSAID', 'Long half-life NSAID used for inflammatory pain in some regions.', 0.72, ['pain_masking_relevant'], ['pain_perception'], null, null],
  ['colchicine', 'Colchicine', ['Colcrys', 'Mitigare'], 'nsaid', 'Anti-inflammatory (gout-related)', 'Used for inflammatory flare patterns associated with crystal arthritis plans.', 0.73, ['pain_masking_relevant', 'fatigue_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['tramadol', 'Tramadol', ['Ultram'], 'opioid_analgesic', 'Atypical opioid analgesic', 'Central nervous system pain modulation; sedation and dizziness overlay possible.', 0.72, ['pain_masking_relevant', 'sedation_relevant', 'fatigue_relevant'], ['pain_perception', 'fatigue_context'], 'Pain-modulating medication with sedation overlap for some users.', ['Pain relief contexts']],
  ['oxycodone', 'Oxycodone', ['OxyContin', 'Roxicodone'], 'opioid_analgesic', 'Opioid analgesic', 'Strong opioid receptor effects; sedation and respiratory-rate context may matter for fatigue interpretation.', 0.68, ['pain_masking_relevant', 'sedation_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['hydromorphone', 'Hydromorphone', ['Dilaudid'], 'opioid_analgesic', 'Opioid analgesic', 'Potent opioid analgesia with sedation context.', 0.67, ['pain_masking_relevant', 'sedation_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['morphine', 'Morphine', ['MS Contin', 'Roxanol'], 'opioid_analgesic', 'Opioid analgesic', 'Classic opioid receptor agonist; sedation and constipation context may influence comfort ratings.', 0.67, ['pain_masking_relevant', 'sedation_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['hydrocodone', 'Hydrocodone', ['Hysingla'], 'opioid_analgesic', 'Opioid analgesic', 'Opioid ingredient present in several combination products; formulations vary by prescription labeling.', 0.66, ['pain_masking_relevant', 'sedation_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['buprenorphine', 'Buprenorphine', ['Butrans', 'Subutex'], 'opioid_analgesic', 'Partial opioid agonist', 'Used in pain and opioid-use contexts depending on formulation; sedation profile varies.', 0.65, ['pain_masking_relevant', 'sedation_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['methocarbamol', 'Methocarbamol', ['Robaxin'], 'muscle_relaxant', 'Muscle relaxant', 'Centrally acting muscle relaxant; sedation possible.', 0.72, ['sedation_relevant', 'pain_masking_relevant'], ['pain_perception', 'fatigue_context'], null, null],
  ['cyclobenzaprine', 'Cyclobenzaprine', ['Flexeril'], 'muscle_relaxant', 'Muscle relaxant', 'Often used short-term for muscle spasm; sedation common.', 0.73, ['sedation_relevant', 'fatigue_relevant'], ['fatigue_context', 'pain_perception'], null, null],
  ['tizanidine', 'Tizanidine', ['Zanaflex'], 'muscle_relaxant', 'Alpha-2 agonist muscle relaxant', 'Short-acting spasm relief with sedation and blood-pressure-related context for some users.', 0.71, ['sedation_relevant', 'heart_rate_relevant'], ['sleep_interpretation', 'fatigue_context'], null, null],
  ['baclofen', 'Baclofen', ['Lioresal'], 'muscle_relaxant', 'GABA-related muscle relaxant', 'Used for spasticity-related plans; sedation and dizziness possible.', 0.72, ['sedation_relevant', 'fatigue_relevant'], ['fatigue_context', 'pain_perception'], null, null],
  ['sumatriptan', 'Sumatriptan', ['Imitrex'], 'migraine_triptan', 'Triptan', 'Serotonin receptor agonism used for migraine attacks in prescribed acute therapy.', 0.76, ['pain_masking_relevant', 'heart_rate_relevant'], ['pain_perception', 'heart_rate_interpretation'], null, null],
  ['rizatriptan', 'Rizatriptan', ['Maxalt'], 'migraine_triptan', 'Triptan', 'Acute migraine therapy in triptan family.', 0.76, ['pain_masking_relevant'], ['pain_perception'], null, null],
  ['eletriptan', 'Eletriptan', ['Relpax'], 'migraine_triptan', 'Triptan', 'Acute migraine therapy with metabolic considerations in clinical labeling.', 0.74, ['pain_masking_relevant'], ['pain_perception'], null, null],
  // Allergy / ENT
  ['loratadine', 'Loratadine', ['Claritin'], 'allergy_antihistamine', 'Second-generation antihistamine', 'Histamine blockade with relatively low sedation for many users.', 0.8, ['sedation_relevant'], ['fatigue_context'], null, null],
  ['cetirizine', 'Cetirizine', ['Zyrtec'], 'allergy_antihistamine', 'Second-generation antihistamine', 'May cause mild sedation compared with loratadine for some users.', 0.79, ['sedation_relevant', 'fatigue_relevant'], ['fatigue_context'], null, null],
  ['fexofenadine', 'Fexofenadine', ['Allegra'], 'allergy_antihistamine', 'Second-generation antihistamine', 'Often chosen when minimizing sedation is a priority.', 0.8, ['sedation_relevant'], ['fatigue_context'], null, null],
  ['levocetirizine', 'Levocetirizine', ['Xyzal'], 'allergy_antihistamine', 'Second-generation antihistamine', 'Enantiomer-related cetirizine family with sedation overlap possible.', 0.78, ['sedation_relevant'], ['fatigue_context'], null, null],
  ['azelastine_nasal', 'Azelastine', ['Astelin'], 'allergy_antihistamine', 'Intranasal antihistamine', 'Topical nasal histamine blockade; bitter taste or sedation possible.', 0.76, ['sedation_relevant'], ['fatigue_context'], null, null],
  // Cold / respiratory OTC-style (symptom overlap only)
  ['pseudoephedrine', 'Pseudoephedrine', ['Sudafed'], 'cold_symptom_relief', 'Oral decongestant', 'Sympathomimetic effects may influence wakefulness and heart-rate sensation.', 0.74, ['activation_relevant', 'heart_rate_relevant'], ['heart_rate_interpretation', 'training_readiness'], null, null],
  ['phenylephrine', 'Phenylephrine', ['Neo-Synephrine'], 'cold_symptom_relief', 'Oral / nasal decongestant', 'Vasoconstrictor effects used for nasal congestion symptom relief.', 0.72, ['heart_rate_relevant', 'activation_relevant'], ['heart_rate_interpretation'], null, null],
  ['guaifenesin', 'Guaifenesin', ['Mucinex'], 'cold_symptom_relief', 'Expectorant', 'Thins mucus secretions for cough-related comfort; illness-context symptom overlap.', 0.72, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['dextromethorphan', 'Dextromethorphan', ['Delsym'], 'cold_symptom_relief', 'Antitussive', 'Cough suppression in many OTC combinations; sedation possible depending on formulation.', 0.71, ['sedation_relevant', 'fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['chlorpheniramine', 'Chlorpheniramine', ['Chlor-Trimeton'], 'cold_symptom_relief', 'First-generation antihistamine', 'Sedating antihistamine sometimes combined with cold products.', 0.73, ['sedation_relevant', 'sleep_relevant'], ['sleep_interpretation', 'illness_context'], null, null],
  // GI
  ['omeprazole', 'Omeprazole', ['Prilosec'], 'reflux_acid', 'Proton pump inhibitor', 'Reduces stomach acid secretion over time; may influence magnesium context long-term in labeling discussions.', 0.8, ['appetite_relevant'], ['appetite_context', 'recovery_interpretation'], null, null],
  ['esomeprazole', 'Esomeprazole', ['Nexium'], 'reflux_acid', 'Proton pump inhibitor', 'Acid suppression related to omeprazole chemistry class.', 0.79, ['appetite_relevant'], ['appetite_context'], null, null],
  ['pantoprazole', 'Pantoprazole', ['Protonix', 'Topzol', 'Topzole'], 'reflux_acid', 'Proton pump inhibitor', 'Used for GERD-related acid symptom patterns.', 0.79, ['appetite_relevant'], ['appetite_context'], null, null],
  ['lansoprazole', 'Lansoprazole', ['Prevacid'], 'reflux_acid', 'Proton pump inhibitor', 'Acid suppression with comparable class effects.', 0.79, ['appetite_relevant'], ['appetite_context'], null, null],
  ['rabeprazole', 'Rabeprazole', ['Aciphex'], 'reflux_acid', 'Proton pump inhibitor', 'PPI class acid suppression.', 0.77, ['appetite_relevant'], ['appetite_context'], null, null],
  ['dexlansoprazole', 'Dexlansoprazole', ['Dexilant'], 'reflux_acid', 'Proton pump inhibitor', 'Delayed-release PPI formulation.', 0.76, ['appetite_relevant'], ['appetite_context'], null, null],
  ['famotidine', 'Famotidine', ['Pepcid'], 'reflux_acid', 'H2 blocker', 'Histamine H2 receptor blockade reduces acid secretion.', 0.8, ['appetite_relevant'], ['appetite_context'], null, null],
  ['nizatidine', 'Nizatidine', ['Axid'], 'reflux_acid', 'H2 blocker', 'Acid reduction similar to other H2 antagonists.', 0.76, ['appetite_relevant'], ['appetite_context'], null, null],
  ['calcium_carbonate', 'Calcium carbonate', ['Tums'], 'reflux_acid', 'Antacid', 'Neutralizes stomach acid quickly for episodic heartburn symptom relief.', 0.78, ['appetite_relevant'], ['appetite_context'], null, null],
  ['magnesium_hydroxide', 'Magnesium hydroxide', ['Milk of Magnesia'], 'laxative', 'Antacid / laxative', 'Osmotic laxative effect at higher antacid-adjacent dosing contexts.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['aluminum_hydroxide', 'Aluminum hydroxide', [], 'reflux_acid', 'Antacid', 'Buffers stomach acid in combination products.', 0.72, ['appetite_relevant'], ['appetite_context'], null, null],
  ['ondansetron', 'Ondansetron', ['Zofran'], 'antiemetic', '5-HT3 antagonist', 'Reduces nausea signaling from gut and brainstem pathways.', 0.78, ['fatigue_relevant', 'sedation_relevant'], ['fatigue_context', 'illness_context'], null, null],
  ['granisetron', 'Granisetron', ['Kytril'], 'antiemetic', '5-HT3 antagonist', 'Anti-nausea therapy used around chemotherapy-related plans.', 0.74, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['metoclopramide', 'Metoclopramide', ['Reglan'], 'antiemetic', 'Prokinetic / dopamine antagonist', 'Increases gastric emptying in some plans; movement-effect monitoring context exists in labeling.', 0.72, ['sedation_relevant', 'fatigue_relevant'], ['fatigue_context'], null, null],
  ['promethazine', 'Promethazine', ['Phenergan'], 'antiemetic', 'Antihistamine antiemetic', 'Strong sedation and anticholinergic overlap.', 0.74, ['sedation_relevant', 'sleep_relevant'], ['sleep_interpretation', 'fatigue_context'], null, null],
  ['polyethylene_glycol', 'Polyethylene glycol 3350', ['MiraLAX'], 'laxative', 'Osmotic laxative', 'Bowel habit regularity context; abdominal discomfort may influence perceived recovery.', 0.76, ['fatigue_relevant'], ['recovery_interpretation'], null, null],
  ['bisacodyl', 'Bisacodyl', ['Dulcolax'], 'laxative', 'Stimulant laxative', 'Bowel stimulation for episodic constipation symptom relief.', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  // Cardiovascular
  ['lisinopril', 'Lisinopril', ['Prinivil', 'Zestril'], 'ace_inhibitor', 'ACE inhibitor', 'Reduces angiotensin-mediated vasoconstriction; cough context exists for some users.', 0.8, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['enalapril', 'Enalapril', ['Vasotec'], 'ace_inhibitor', 'ACE inhibitor', 'Blood pressure management through RAAS modulation.', 0.79, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['ramipril', 'Ramipril', ['Altace'], 'ace_inhibitor', 'ACE inhibitor', 'Long-acting ACE inhibitor used for hypertension-related plans.', 0.79, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['captopril', 'Captopril', ['Capoten'], 'ace_inhibitor', 'ACE inhibitor', 'Shorter-acting ACE inhibitor used less commonly today.', 0.76, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['benazepril', 'Benazepril', ['Lotensin'], 'ace_inhibitor', 'ACE inhibitor', 'ACE inhibition for blood pressure management.', 0.78, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['losartan', 'Losartan', ['Cozaar'], 'arb', 'ARB', 'Blocks angiotensin receptors for blood pressure management.', 0.8, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['valsartan', 'Valsartan', ['Diovan'], 'arb', 'ARB', 'Angiotensin receptor blockade similar class effects.', 0.79, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['olmesartan', 'Olmesartan', ['Benicar'], 'arb', 'ARB', 'ARB therapy for hypertension-related contexts.', 0.78, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['irbesartan', 'Irbesartan', ['Avapro'], 'arb', 'ARB', 'Blood pressure management through ARB pathway.', 0.78, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['candesartan', 'Candesartan', ['Atacand'], 'arb', 'ARB', 'ARB class blood pressure medication.', 0.78, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['amlodipine', 'Amlodipine', ['Norvasc'], 'calcium_channel_blocker', 'Dihydropyridine CCB', 'Relaxes vascular smooth muscle; ankle swelling context exists for some users.', 0.79, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['diltiazem', 'Diltiazem', ['Cardizem'], 'calcium_channel_blocker', 'Non-dihydropyridine CCB', 'Heart rate and blood pressure effects used in several cardiovascular plans.', 0.78, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['verapamil', 'Verapamil', ['Calan'], 'calcium_channel_blocker', 'Non-dihydropyridine CCB', 'Rate-control contexts alongside blood pressure effects.', 0.77, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['nifedipine', 'Nifedipine', ['Procardia'], 'calcium_channel_blocker', 'Dihydropyridine CCB', 'Vasodilation with flushing or headache context possible.', 0.77, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation'], null, null],
  ['hydrochlorothiazide', 'Hydrochlorothiazide', ['Microzide'], 'thiazide_diuretic', 'Thiazide diuretic', 'Increases sodium/water excretion; electrolyte context may influence fatigue sensation.', 0.78, ['heart_rate_relevant', 'hydration_relevant', 'fatigue_relevant'], ['hydration_context', 'fatigue_context'], null, null],
  ['chlorthalidone', 'Chlorthalidone', ['Thalitone'], 'thiazide_diuretic', 'Thiazide-like diuretic', 'Long-acting diuretic used for blood pressure and fluid balance contexts.', 0.77, ['hydration_relevant', 'fatigue_relevant'], ['hydration_context', 'fatigue_context'], null, null],
  ['furosemide', 'Furosemide', ['Lasix'], 'loop_diuretic', 'Loop diuretic', 'Strong diuresis; electrolyte shifts may relate to fatigue and cramps.', 0.76, ['hydration_relevant', 'heart_rate_relevant', 'fatigue_relevant'], ['hydration_context', 'fatigue_context'], null, null],
  ['spironolactone', 'Spironolactone', ['Aldactone'], 'mineralocorticoid_antagonist', 'Potassium-sparing diuretic', 'Aldosterone antagonism; electrolyte monitoring context in clinical care.', 0.75, ['hydration_relevant', 'fatigue_relevant'], ['hydration_context', 'fatigue_context'], null, null],
  ['carvedilol', 'Carvedilol', ['Coreg'], 'beta_blocker', 'Beta blocker', 'Beta and alpha blocking effects used for heart failure and blood pressure contexts.', 0.78, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  ['nebivolol', 'Nebivolol', ['Bystolic'], 'beta_blocker', 'Beta blocker', 'Blood pressure lowering with nitric-oxide-related vasodilation discussion in labeling.', 0.76, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['labetalol', 'Labetalol', ['Trandate'], 'beta_blocker', 'Beta blocker', 'Combined alpha/beta blockade used in hypertensive urgency contexts in acute care.', 0.74, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['warfarin', 'Warfarin', ['Coumadin'], 'anticoagulant', 'Vitamin K antagonist', 'Anticoagulation monitoring context; does not directly predict daily energy.', 0.77, ['fatigue_relevant'], ['recovery_interpretation'], null, null],
  ['apixaban', 'Apixaban', ['Eliquis'], 'anticoagulant', 'Direct oral anticoagulant', 'Factor Xa inhibition for clot-risk contexts.', 0.76, ['fatigue_relevant'], ['recovery_interpretation'], null, null],
  ['rivaroxaban', 'Rivaroxaban', ['Xarelto'], 'anticoagulant', 'Direct oral anticoagulant', 'Factor Xa inhibition used in several thrombosis-prevention plans.', 0.76, ['fatigue_relevant'], ['recovery_interpretation'], null, null],
  ['digoxin', 'Digoxin', ['Lanoxin'], 'cardiac_glycoside', 'Cardiac glycoside', 'Used in selected rhythm and heart failure plans; heart-rate sensation context.', 0.72, ['heart_rate_relevant', 'fatigue_relevant'], ['heart_rate_interpretation', 'fatigue_context'], null, null],
  // Endocrine / metabolic
  ['levothyroxine', 'Levothyroxine', ['Synthroid', 'Levoxyl'], 'thyroid_hormone', 'Thyroid hormone replacement', 'Restores thyroid hormone levels when clinically indicated; energy interpretation varies with labs and timing.', 0.8, ['fatigue_relevant', 'mood_relevant'], ['fatigue_context', 'mood_context'], null, null],
  ['liothyronine', 'Liothyronine', ['Cytomel'], 'thyroid_hormone', 'T3 thyroid hormone', 'Shorter-acting thyroid hormone sometimes combined with levothyroxine in individualized plans.', 0.76, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['methimazole', 'Methimazole', ['Tapazole'], 'antithyroid', 'Antithyroid medication', 'Reduces thyroid hormone production in hyperthyroid-related plans.', 0.74, ['fatigue_relevant', 'mood_relevant'], ['fatigue_context', 'mood_context'], null, null],
  ['propylthiouracil', 'Propylthiouracil', ['PTU'], 'antithyroid', 'Antithyroid medication', 'Used in hyperthyroid contexts when clinically selected.', 0.72, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['metformin', 'Metformin', ['Glucophage'], 'diabetes_medication', 'Biguanide', 'Improves insulin sensitivity; GI upset context possible early on.', 0.78, ['fatigue_relevant', 'appetite_relevant'], ['fatigue_context', 'appetite_context'], null, null],
  ['insulin_glargine', 'Insulin glargine', ['Lantus', 'Basaglar'], 'diabetes_medication', 'Long-acting insulin', 'Basal insulin plans relate to glucose stability and same-day energy interpretation indirectly.', 0.76, ['fatigue_relevant', 'training_readiness_relevant'], ['fatigue_context', 'training_readiness'], null, null],
  ['prednisone', 'Prednisone', ['Deltasone'], 'corticosteroid_systemic', 'Systemic corticosteroid', 'Broad anti-inflammatory and metabolic effects; sleep and mood variability context may matter.', 0.72, ['mood_relevant', 'sleep_relevant', 'fatigue_relevant'], ['mood_context', 'sleep_interpretation', 'fatigue_context'], null, null],
  ['methylprednisolone', 'Methylprednisolone', ['Medrol'], 'corticosteroid_systemic', 'Systemic corticosteroid', 'Anti-inflammatory bursts used for flare symptoms in several plans.', 0.72, ['mood_relevant', 'fatigue_relevant'], ['mood_context', 'fatigue_context'], null, null],
  // Anti-infective
  ['amoxicillin', 'Amoxicillin', ['Amoxil'], 'antibiotic', 'Penicillin-class antibiotic', 'Used for susceptible bacterial infections; illness-recovery context overlaps with fatigue.', 0.78, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['azithromycin', 'Azithromycin', ['Zithromax', 'Z-Pak'], 'antibiotic', 'Macrolide antibiotic', 'Used for several respiratory and other bacterial infections.', 0.77, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['doxycycline', 'Doxycycline', ['Vibramycin'], 'antibiotic', 'Tetracycline-class antibiotic', 'Photosensitivity context exists in labeling discussions.', 0.76, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['cephalexin', 'Cephalexin', ['Keflex'], 'antibiotic', 'Cephalosporin antibiotic', 'Used for skin and respiratory bacterial infections among others.', 0.77, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['ciprofloxacin', 'Ciprofloxacin', ['Cipro'], 'antibiotic', 'Fluoroquinolone antibiotic', 'Used for susceptible infections; tendon and nervous-system labeling discussions exist.', 0.73, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['nitrofurantoin', 'Nitrofurantoin', ['Macrobid'], 'antibiotic', 'Urinary anti-infective', 'Often used for uncomplicated urinary infections when clinically appropriate.', 0.76, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['metronidazole', 'Metronidazole', ['Flagyl'], 'antibiotic', 'Nitroimidazole antibiotic', 'Used for anaerobic bacterial and some parasitic contexts; nausea overlap possible.', 0.74, ['fatigue_relevant', 'sedation_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['clindamycin', 'Clindamycin', ['Cleocin'], 'antibiotic', 'Lincosamide antibiotic', 'Used for several bacterial infections when selected.', 0.75, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['trimethoprim', 'Trimethoprim', ['Primsol'], 'antibiotic', 'Antibiotic', 'Sometimes combined with other agents in urinary infection therapy.', 0.74, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['acyclovir', 'Acyclovir', ['Zovirax'], 'antiviral', 'Antiviral', 'Used for herpesvirus-related flare symptom patterns.', 0.76, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['valacyclovir', 'Valacyclovir', ['Valtrex'], 'antiviral', 'Antiviral', 'Prodrug-related acyclovir exposure for herpesvirus plans.', 0.76, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  ['oseltamivir', 'Oseltamivir', ['Tamiflu'], 'antiviral', 'Neuraminidase inhibitor', 'Used for influenza symptom timeline contexts when prescribed early in illness.', 0.74, ['fatigue_relevant'], ['illness_context', 'fatigue_context'], null, null],
  // Respiratory (non-cold)
  ['albuterol', 'Albuterol', ['ProAir', 'Ventolin'], 'respiratory', 'Short-acting beta agonist', 'Bronchodilation; tremor and heart-rate sensation possible.', 0.8, ['heart_rate_relevant', 'activation_relevant'], ['heart_rate_interpretation', 'training_readiness'], null, null],
  ['montelukast', 'Montelukast', ['Singulair'], 'respiratory', 'Leukotriene modifier', 'Used for asthma and allergic rhinitis-related symptom plans.', 0.77, ['fatigue_relevant', 'mood_relevant'], ['fatigue_context', 'mood_context'], null, null],
  ['fluticasone_inhaled', 'Fluticasone', ['Flovent'], 'respiratory', 'Inhaled corticosteroid', 'Airway inflammation control in asthma-related maintenance therapy.', 0.78, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['budesonide_inhaled', 'Budesonide', ['Pulmicort'], 'respiratory', 'Inhaled corticosteroid', 'Anti-inflammatory airway therapy.', 0.77, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['ipratropium', 'Ipratropium', ['Atrovent'], 'respiratory', 'Anticholinergic bronchodilator', 'Often combined with short-acting beta agonists for COPD symptom relief.', 0.76, ['heart_rate_relevant'], ['heart_rate_interpretation'], null, null],
  ['tiotropium', 'Tiotropium', ['Spiriva'], 'respiratory', 'Long-acting anticholinergic', 'Maintenance bronchodilation in COPD-related plans.', 0.75, ['fatigue_relevant'], ['fatigue_context'], null, null],
];

const rows = DEFS.map((d) => {
  const [
    id,
    genericName,
    brandNames,
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

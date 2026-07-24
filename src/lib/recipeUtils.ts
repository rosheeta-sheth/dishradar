// src/lib/recipeUtils.ts

export function parseFraction(str: string): number {
  if (!str) return 0;
  
  // Clean string
  const clean = str.trim().toLowerCase();
  
  // Handle ranges like "1-2", just take the average or the first number for simplicity
  if (clean.includes('-')) {
    const parts = clean.split('-');
    return parseFraction(parts[0]);
  }

  // Handle mixed fractions like "1 1/2"
  if (clean.includes(' ')) {
    const [whole, frac] = clean.split(' ');
    return parseFraction(whole) + parseFraction(frac);
  }

  // Handle pure fractions like "1/2"
  if (clean.includes('/')) {
    const [num, den] = clean.split('/');
    const denominator = parseFloat(den);
    return denominator === 0 ? 0 : parseFloat(num) / denominator;
  }

  // Handle standard decimals or integers
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatDecimalToFraction(num: number): string {
  if (num === 0) return '';
  
  const whole = Math.floor(num);
  const decimal = num - whole;
  
  // Tolerance for float math
  const eps = 0.05;

  let fracStr = '';
  if (Math.abs(decimal - 0.25) < eps) fracStr = '1/4';
  else if (Math.abs(decimal - 0.33) < eps) fracStr = '1/3';
  else if (Math.abs(decimal - 0.5) < eps) fracStr = '1/2';
  else if (Math.abs(decimal - 0.66) < eps) fracStr = '2/3';
  else if (Math.abs(decimal - 0.75) < eps) fracStr = '3/4';
  else if (decimal > 0.05) {
    // If it doesn't match common fractions, just round to 1 decimal place
    return Number(num.toFixed(1)).toString();
  }

  if (whole > 0 && fracStr) return `${whole} ${fracStr}`;
  if (whole > 0) return whole.toString();
  if (fracStr) return fracStr;
  return Number(num.toFixed(1)).toString();
}

interface FormatResult {
  quantity: string;
  unit: string;
}

const usToMetricMap: Record<string, { factor: number; newUnit: string }> = {
  // Volume
  cup: { factor: 240, newUnit: 'ml' },
  cups: { factor: 240, newUnit: 'ml' },
  tbsp: { factor: 15, newUnit: 'ml' },
  tablespoon: { factor: 15, newUnit: 'ml' },
  tablespoons: { factor: 15, newUnit: 'ml' },
  tsp: { factor: 5, newUnit: 'ml' },
  teaspoon: { factor: 5, newUnit: 'ml' },
  teaspoons: { factor: 5, newUnit: 'ml' },
  'fl oz': { factor: 30, newUnit: 'ml' },
  pint: { factor: 473, newUnit: 'ml' },
  pints: { factor: 473, newUnit: 'ml' },
  quart: { factor: 946, newUnit: 'ml' },
  quarts: { factor: 946, newUnit: 'ml' },
  
  // Weight
  oz: { factor: 28, newUnit: 'g' },
  ounce: { factor: 28, newUnit: 'g' },
  ounces: { factor: 28, newUnit: 'g' },
  lb: { factor: 453, newUnit: 'g' },
  lbs: { factor: 453, newUnit: 'g' },
  pound: { factor: 453, newUnit: 'g' },
  pounds: { factor: 453, newUnit: 'g' },
};

const metricToUsMap: Record<string, { factor: number; newUnit: string }> = {
  ml: { factor: 1 / 240, newUnit: 'cups' }, // Crude fallback to cups
  l: { factor: 1 / 0.946, newUnit: 'quarts' },
  liter: { factor: 1 / 0.946, newUnit: 'quarts' },
  liters: { factor: 1 / 0.946, newUnit: 'quarts' },
  g: { factor: 1 / 28, newUnit: 'oz' },
  gram: { factor: 1 / 28, newUnit: 'oz' },
  grams: { factor: 1 / 28, newUnit: 'oz' },
  kg: { factor: 2.204, newUnit: 'lbs' },
  kilogram: { factor: 2.204, newUnit: 'lbs' },
  kilograms: { factor: 2.204, newUnit: 'lbs' },
};

export function scaleAndConvertIngredient(
  quantityStr: string,
  unitStr: string,
  scaleRatio: number,
  targetSystem: 'us' | 'metric'
): FormatResult {
  // If no quantity string provided, return as is
  if (!quantityStr) return { quantity: '', unit: unitStr || '' };

  const parsedQty = parseFraction(quantityStr);
  
  // If parsing fails completely, just return original scaled as best as possible, or fallback
  if (parsedQty === 0 && quantityStr !== '0') {
    return { quantity: quantityStr, unit: unitStr };
  }

  let finalQty = parsedQty * scaleRatio;
  let finalUnit = unitStr?.trim().toLowerCase() || '';

  // If going to metric
  if (targetSystem === 'metric' && usToMetricMap[finalUnit]) {
    const conversion = usToMetricMap[finalUnit];
    finalQty = finalQty * conversion.factor;
    finalUnit = conversion.newUnit;
  }
  // If going to US
  else if (targetSystem === 'us' && metricToUsMap[finalUnit]) {
    const conversion = metricToUsMap[finalUnit];
    finalQty = finalQty * conversion.factor;
    finalUnit = conversion.newUnit;
  }

  // Formatting the quantity string
  // If it's a metric unit, we usually don't use fractions (e.g. 1/2 ml makes no sense, use 0.5 or 1)
  let formattedQty = '';
  if (targetSystem === 'metric' && ['ml', 'g', 'kg', 'l'].includes(finalUnit)) {
    // Round to sensible whole numbers for g/ml if large enough, else 1 decimal
    if (finalQty > 10) formattedQty = Math.round(finalQty).toString();
    else formattedQty = Number(finalQty.toFixed(1)).toString();
  } else {
    // For US units or unitless, use fraction format
    formattedQty = formatDecimalToFraction(finalQty);
  }

  // Restore pluralization if needed for US
  if (targetSystem === 'us' && finalQty > 1 && !finalUnit.endsWith('s') && finalUnit !== 'oz' && finalUnit !== 'lbs' && finalUnit !== '') {
    if (finalUnit === 'cup' || finalUnit === 'tbsp' || finalUnit === 'tsp' || finalUnit === 'quart' || finalUnit === 'pint' || finalUnit === 'gallon') {
       finalUnit += 's';
    }
  } else if (targetSystem === 'us' && finalQty <= 1 && finalUnit.endsWith('s') && finalUnit !== 'lbs') {
    finalUnit = finalUnit.slice(0, -1);
  }

  return {
    quantity: formattedQty,
    unit: finalUnit
  };
}

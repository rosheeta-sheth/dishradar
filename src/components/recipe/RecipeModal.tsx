'use client';

import { useState, useEffect, useRef } from 'react';
import type { Recipe } from '@/lib/types';
import { Store, Printer, Share, ShoppingCart, Info, Clock, Flame, Users, Lightbulb, ChefHat } from 'lucide-react';
import { scaleAndConvertIngredient } from '@/lib/recipeUtils';
import styles from './RecipeModal.module.css';

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishName: string;
  cuisineStyle: string;
  placeId?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  reviewSnippets?: string[];
}

export default function RecipeModal({
  isOpen,
  onClose,
  dishName,
  cuisineStyle,
  placeId,
  restaurantName,
  restaurantAddress,
  reviewSnippets,
}: RecipeModalProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [targetServings, setTargetServings] = useState<number>(0);
  const [unitSystem, setUnitSystem] = useState<'us' | 'metric'>('us');

  const hasFetched = useRef(false);

  const loadingMessages = [
    'Reading reviews...',
    'Analyzing menu...',
    'Finding your matches...',
    'Plating your dish...'
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => Math.min(prev + 1, loadingMessages.length - 1));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading, loadingMessages.length]);

  useEffect(() => {
    if (isOpen && dishName && !hasFetched.current) {
      hasFetched.current = true;
      generateRecipe();
    }
  }, [isOpen, dishName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) {
      hasFetched.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecipe(null);
      setError('');
      setTargetServings(0);
      setUnitSystem('us');
    }
  }, [isOpen]);

  useEffect(() => {
    if (recipe && targetServings === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetServings(recipe.servings);
    }
  }, [recipe, targetServings]);

  async function generateRecipe() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishName,
          cuisineStyle,
          placeId,
          restaurantName,
          restaurantAddress,
          reviewSnippets,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate recipe');
      const { data } = await res.json();
      setRecipe(data);
    } catch {
      setError('Failed to generate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    const printContent = document.getElementById('recipe-print-area');
    if (!printContent) {
      window.print();
      return;
    }
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      window.print(); // fallback
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${recipe?.dish_name || dishName} Recipe</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.5; color: #333; }
            h2 { border-bottom: 2px solid #eaeaea; padding-bottom: 10px; margin-top: 0; }
            h3 { margin-top: 24px; color: #111; }
            ul, ol { margin-bottom: 20px; padding-left: 20px; }
            li { margin-bottom: 8px; }
            .no-print { display: none !important; }
            .badge { display: inline-block; padding: 4px 8px; background: #f3f4f6; border-radius: 4px; font-size: 14px; margin-right: 8px; }
          </style>
        </head>
        <body>
          <h2>${recipe?.dish_name || dishName}</h2>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  async function handleShare() {
    if (!recipe) return;
    const scaleRatio = recipe.servings > 0 ? targetServings / recipe.servings : 1;
    const list = recipe.ingredients.map(i => {
      const formatted = scaleAndConvertIngredient(i.quantity, i.unit, scaleRatio, unitSystem);
      return `- ${formatted.quantity} ${formatted.unit} ${i.item}`;
    }).join('\n');
    const steps = recipe.instructions.map((step, idx) => `${idx + 1}. ${step}`).join('\n');
    const text = `Recipe for ${recipe.dish_name}\nPrep: ${recipe.prep_time_minutes} min | Cook: ${recipe.cook_time_minutes} min\n\nIngredients:\n${list}\n\nInstructions:\n${steps}`;
    
    const shareData = {
      title: `${recipe.dish_name} Recipe`,
      text: text,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch { /* ignore */ }
    } else {
      navigator.clipboard.writeText(text)
        .then(() => alert('Recipe text copied to clipboard!'))
        .catch(() => {});
    }
  }

  function handleSendToInstacart() {
    if (!recipe) return;
    const scaleRatio = recipe.servings > 0 ? targetServings / recipe.servings : 1;
    const list = recipe.ingredients.map(i => {
      const formatted = scaleAndConvertIngredient(i.quantity, i.unit, scaleRatio, unitSystem);
      return `${formatted.quantity} ${formatted.unit} ${i.item}`;
    }).join('\n');
    
    // Instacart does not have a public API for bulk adding without auth, but they have a "Paste your list" feature.
    // The best UX for this prototype is to copy the list to clipboard and redirect to Instacart search.
    navigator.clipboard.writeText(list)
      .then(() => {
        alert('Shopping list copied to clipboard! Opening Instacart where you can paste this into their Bulk Add tool.');
        window.open(`https://www.instacart.com/store/s?k=${encodeURIComponent((recipe.dish_name || dishName) + ' ingredients')}`, '_blank');
      })
      .catch(() => alert('Failed to copy.'));
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{dishName}</h2>
            {restaurantName ? (
              <span className={styles.cuisine}>
                <Store size={16} className={styles.inlineIcon} /> How <strong>{restaurantName}</strong> makes it
              </span>
            ) : (
              <span className={styles.cuisine}>{cuisineStyle} style</span>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close recipe modal">✕</button>
        </div>

        <div className={styles.body}>
          {loading && (
            <div className={styles.loading}>
              <div className="spinner spinner-lg" />
              <p>Crafting your restaurant-specific recipe...</p>
              <p className={styles.loadingHint}>
                {loadingMessages[loadingStep]}
              </p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
              <button className="btn btn-primary btn-sm" onClick={generateRecipe}>
                Try Again
              </button>
            </div>
          )}

          {recipe && (
            <div className={styles.recipe} id="recipe-print-area">
              <div className={`${styles.toolbar} no-print`} style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setTargetServings(s => Math.max(1, s - 1))} aria-label="Decrease servings">-</button>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{targetServings} servings</span>
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setTargetServings(s => s + 1)} aria-label="Increase servings">+</button>
                  </div>
                  <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <button className={`btn btn-sm ${unitSystem === 'us' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setUnitSystem('us')} style={{ borderRadius: 0, border: 'none' }}>US</button>
                    <button className={`btn btn-sm ${unitSystem === 'metric' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setUnitSystem('metric')} style={{ borderRadius: 0, border: 'none' }}>Metric</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn-secondary btn-sm no-print" onClick={handlePrint} aria-label="Print recipe"><Printer size={14} /> Print</button>
                  <button className="btn btn-secondary btn-sm no-print" onClick={handleShare} aria-label="Share recipe"><Share size={14} /> Share</button>
                  <button className="btn btn-secondary btn-sm no-print" onClick={handleSendToInstacart} aria-label="Send to Instacart"><ShoppingCart size={14} /> Buy on Instacart</button>
                </div>
              </div>

              {/* Restaurant-specific note */}
              {'restaurant_note' in recipe && (recipe as Recipe & { restaurant_note?: string }).restaurant_note && (
                <div className={styles.restaurantNote}>
                  <Info size={16} />
                  <p>{(recipe as Recipe & { restaurant_note?: string }).restaurant_note}</p>
                </div>
              )}

              <div className={styles.meta}>
                <span><Clock size={14} /> {recipe.prep_time_minutes} min prep</span>
                <span><Flame size={14} /> {recipe.cook_time_minutes} min cook</span>
                <span><Users size={14} /> {recipe.servings} servings</span>
                <span className={`badge ${recipe.difficulty === 'easy' ? 'badge-success' : recipe.difficulty === 'medium' ? 'badge-warning' : 'badge-primary'}`}>
                  {recipe.difficulty}
                </span>
              </div>

              <div className={styles.section}>
                <h3>Ingredients</h3>
                      <ul className={styles.ingredients}>
                        {recipe.ingredients.map((ing, i) => {
                          const scaleRatio = recipe.servings > 0 ? targetServings / recipe.servings : 1;
                          const formatted = scaleAndConvertIngredient(ing.quantity, ing.unit, scaleRatio, unitSystem);
                          return (
                            <li key={i}>
                              <strong>{formatted.quantity} {formatted.unit}</strong> {ing.item}
                              {ing.notes && <span className={styles.note}> ({ing.notes})</span>}
                            </li>
                          );
                        })}
                      </ul>
              </div>

              <div className={styles.section}>
                <h3>Instructions</h3>
                <ol className={styles.steps}>
                  {recipe.instructions.map((step) => (
                    <li key={step.step}>
                      <p>{step.text}</p>
                      {step.tip && <p className={styles.tip}><Lightbulb size={14} /> {step.tip}</p>}
                    </li>
                  ))}
                </ol>
              </div>

              {recipe.chef_notes && (
                <div className={styles.section}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ChefHat size={20} /> Chef&apos;s Notes</h3>
                  <p className={styles.chefNotes}>{recipe.chef_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

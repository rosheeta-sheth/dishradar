'use client';

import { useState, useEffect } from 'react';
import type { Recipe } from '@/lib/types';
import { Trash2, Clock, Flame, Users, Lightbulb, ChefHat, ChevronDown, ChevronUp, Printer, Share, ShoppingCart } from 'lucide-react';
import { scaleAndConvertIngredient } from '@/lib/recipeUtils';
import styles from './recipes.module.css';

export interface SavedRecipeItem {
  id: string;
  dish_name: string;
  cuisine_style: string;
  recipe_data: Recipe;
  place_id?: string;
  created_at: string;
}

interface SavedRecipeCardProps {
  item: SavedRecipeItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: (id: string) => void;
}

export default function SavedRecipeCard({ item, isExpanded, onToggleExpand, onDelete }: SavedRecipeCardProps) {
  const recipe = item.recipe_data;
  const [targetServings, setTargetServings] = useState<number>(recipe.servings || 1);
  const [unitSystem, setUnitSystem] = useState<'us' | 'metric'>('us');

  // Reset scaling if closed
  useEffect(() => {
    if (!isExpanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetServings(recipe.servings || 1);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnitSystem('us');
    }
  }, [isExpanded, recipe.servings]);

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'easy': return 'badge-success';
      case 'medium': return 'badge-warning';
      case 'hard': return 'badge-primary';
      default: return 'badge-secondary';
    }
  }

  function handlePrint() {
    const printContent = document.getElementById(`recipe-print-${item.id}`);
    if (!printContent) {
      window.print();
      return;
    }
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${item.dish_name} Recipe</title>
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
          <h2>${item.dish_name}</h2>
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
    const scaleRatio = recipe.servings > 0 ? targetServings / recipe.servings : 1;
    const list = recipe.ingredients.map(i => {
      const formatted = scaleAndConvertIngredient(i.quantity, i.unit, scaleRatio, unitSystem);
      return `- ${formatted.quantity} ${formatted.unit} ${i.item}`;
    }).join('\n');
    const steps = recipe.instructions.map((step, idx) => `${idx + 1}. ${step.text}`).join('\n');
    const text = `Recipe for ${item.dish_name}\nPrep: ${recipe.prep_time_minutes} min | Cook: ${recipe.cook_time_minutes} min\n\nIngredients:\n${list}\n\nInstructions:\n${steps}`;
    
    const shareData = {
      title: `${item.dish_name} Recipe`,
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
        window.open(`https://www.instacart.com/store/s?k=${encodeURIComponent(item.dish_name + ' ingredients')}`, '_blank');
      })
      .catch(() => alert('Failed to copy.'));
  }

  return (
    <div className={`card-static ${styles.recipeCard}`}>
      <div
        className={styles.cardHeader}
        onClick={onToggleExpand}
      >
        <div>
          <h3 className={styles.dishName}>{item.dish_name}</h3>
          <span className={styles.cuisineLabel}>{item.cuisine_style}</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <button 
            className="btn btn-ghost btn-icon btn-sm" 
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            aria-label="Delete recipe"
          >
            <Trash2 size={16} />
          </button>
          <span className={styles.expandIcon}>{isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</span>
        </div>
      </div>

      <div className={styles.meta}>
        <span><Clock size={14} /> {recipe.prep_time_minutes} min prep</span>
        <span><Flame size={14} /> {recipe.cook_time_minutes} min cook</span>
        <span><Users size={14} /> {recipe.servings} servings</span>
        <span className={`badge ${getDifficultyColor(recipe.difficulty)}`}>
          {recipe.difficulty}
        </span>
      </div>

      {isExpanded && (
        <div className={styles.expandedContent} id={`recipe-print-${item.id}`}>
          
          <div className="no-print" style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
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

          <div className={styles.ingredientsSection}>
            <h4>Ingredients</h4>
            <ul className={styles.ingredientsList}>
              {recipe.ingredients.map((ing, i) => {
                const scaleRatio = recipe.servings > 0 ? targetServings / recipe.servings : 1;
                const formatted = scaleAndConvertIngredient(ing.quantity, ing.unit, scaleRatio, unitSystem);
                return (
                  <li key={i}>
                    <strong>{formatted.quantity} {formatted.unit}</strong> {ing.item}
                    {ing.notes && <span className={styles.ingredientNote}> ({ing.notes})</span>}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={styles.instructionsSection}>
            <h4>Instructions</h4>
            <ol className={styles.instructionsList}>
              {recipe.instructions.map((step) => (
                <li key={step.step}>
                  <p>{step.text}</p>
                  {step.tip && (
                    <p className={styles.tip}><Lightbulb size={14}/> {step.tip}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {recipe.chef_notes && (
            <div className={styles.chefNotes}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ChefHat size={16} /> Chef&apos;s Notes</h4>
              <p>{recipe.chef_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

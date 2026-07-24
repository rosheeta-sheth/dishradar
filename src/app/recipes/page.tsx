'use client';

import { useState, useEffect } from 'react';
import type { Recipe } from '@/lib/types';
import { ChefHat, BookX } from 'lucide-react';
import SavedRecipeCard, { SavedRecipeItem } from './SavedRecipeCard';
import styles from './recipes.module.css';



export default function RecipesPage() {
  const [recipes, setRecipes] = useState<SavedRecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCuisine, setFilterCuisine] = useState<string>('');

  async function loadRecipes() {
    try {
      const res = await fetch('/api/user/saved');
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.data?.recipes || []);
      }
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecipes();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      const res = await fetch('/api/user/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: 'recipe' })
      });
      if (res.ok) {
        setRecipes(recipes.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  }

  const cuisines = [...new Set(recipes.map((r) => r.cuisine_style).filter(Boolean))];
  const filtered = filterCuisine
    ? recipes.filter((r) => r.cuisine_style === filterCuisine)
    : recipes;



  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}><ChefHat size={32} /> Your Recipes</h1>
        <div className={styles.grid}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={`card-static ${styles.skeletonCard}`}>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}><ChefHat size={32} /> Your Recipes</h1>
        <p className={styles.subtitle}>
          Recipes you&apos;ve generated from restaurant dishes
        </p>
      </div>

      {cuisines.length > 1 && (
        <div className={styles.filters}>
          <button
            className={`${styles.filterChip} ${!filterCuisine ? styles.filterChipActive : ''}`}
            onClick={() => setFilterCuisine('')}
          >
            All
          </button>
          {cuisines.map((c) => (
            <button
              key={c}
              className={`${styles.filterChip} ${filterCuisine === c ? styles.filterChipActive : ''}`}
              onClick={() => setFilterCuisine(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className={`${styles.grid} stagger-children`}>
          {filtered.map((item) => {
            const recipe = item.recipe_data;
            const isExpanded = expandedId === item.id;

            return (
              <SavedRecipeCard 
                key={item.id}
                item={item}
                isExpanded={isExpanded}
                onToggleExpand={() => setExpandedId(isExpanded ? null : item.id)}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><BookX size={48} /></div>
          <h2>No recipes saved yet</h2>
          <p>Generate recipes from your favorite restaurant dishes to build your collection.</p>
          <a href="/explore" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>Explore Restaurants</a>
        </div>
      )}
    </div>
  );
}